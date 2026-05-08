// Reads from deployed Mensa contracts on Mantle Sepolia
import { ethers } from 'ethers'
import { ACTIVE_CHAIN } from './chains'

const DECISION_LOG_ABI = [
  'function totalDecisions() view returns (uint256)',
  'function decisions(uint256) view returns (uint256 id, uint64 timestamp, uint8 confidence, uint8 action, bytes32 reasoningHash, uint256 metaParam1, uint256 metaParam2)',
  'event DecisionRecorded(uint256 indexed id, uint64 timestamp, uint8 action, uint8 confidence, bytes32 reasoningHash, string reasoning)',
]

const TOURNAMENT_ABI = [
  'function totalRounds() view returns (uint256)',
  'function aiWins() view returns (uint256)',
  'function humanWins() view returns (uint256)',
  'function aiWinRateBps() view returns (uint256)',
  'function rounds(uint256) view returns (uint256 id, uint64 startTime, uint64 settlementTime, uint256 startMethPrice, uint256 startUsdyPrice, uint256 settleMethPrice, uint256 settleUsdyPrice, uint8 aiAllocMeth, uint8 humanAllocMeth, int256 aiReturnBps, int256 humanReturnBps, uint8 outcome, bool settled)',
  'function getVotersCount(uint256) view returns (uint256)',
  'event HumanVote(uint256 indexed id, address indexed human, uint8 allocMeth, uint256 weight)',
]

const REPUTATION_ABI = [
  'function score(address) view returns (uint256)',
  'function getWeight(address) view returns (uint256)',
  'function correctVotes(address) view returns (uint256)',
  'function totalVotes(address) view returns (uint256)',
  'function winRate(address) view returns (uint256)',
  'function hasParticipated(address) view returns (bool)',
  'function firstParticipation(address) view returns (uint64)',
  'event ReputationUpdated(address indexed user, uint256 newScore, bool won, int256 outperformanceBps)',
]

const BOUNTY_ABI = [
  'function claimable(address) view returns (uint256)',
  'function totalCollected() view returns (uint256)',
  'function totalDistributed() view returns (uint256)',
  'function winnerPoolBalance() view returns (uint256)',
]

const BADGES_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function hasBadge(address, uint8) view returns (bool)',
]

const MENSA_AGENT_ABI = [
  'function currentMethAllocPct() view returns (uint8)',
  'function aiOperator() view returns (address)',
  'function maxAllocationBps() view returns (uint256)',
  'function lastRebalanceAt() view returns (uint256)',
]

const ERC20_BAL_ABI = [
  'function balanceOf(address) view returns (uint256)',
]

export interface OnChainDecision {
  id: number
  timestamp: number
  confidence: number
  action: number
  reasoningHash: string
  metaParam1: bigint
  metaParam2: bigint
}

export interface OnChainRound {
  id: number
  startTime: number
  settlementTime: number
  startMethPrice: bigint
  startUsdyPrice: bigint
  settleMethPrice: bigint
  settleUsdyPrice: bigint
  aiAllocMeth: number
  humanAllocMeth: number
  aiReturnBps: bigint
  humanReturnBps: bigint
  outcome: number
  settled: boolean
}

function getProvider() {
  return new ethers.JsonRpcProvider(ACTIVE_CHAIN.rpc)
}

export interface AlphaStats {
  settledRounds: number
  cumulativeAiBps: number       // sum of ai returns
  cumulativeBaselineBps: number // sum of 50/50 returns
  alphaBps: number              // ai - baseline (cumulative)
  perRoundAvgAlphaBps: number   // alphaBps / settledRounds
  annualizedAlphaPct: number    // perRoundAvgAlphaBps * 365 / 100, treating each round as ~24h
  recent: Array<{
    id: number
    aiAllocMeth: number
    aiReturnBps: number
    baselineReturnBps: number
    optimalAllocMeth: number    // 100 if methReturn > usdyReturn else 0
    optimalReturnBps: number
  }>
}

/// Compute alpha stats over the last `limit` settled rounds.
/// `skipRoundIds` lets us exclude rounds (e.g. round #1 was the cold-start
/// before the memory loop existed; for "since calibrated" we pass [1]).
export async function getAlphaStats(limit = 20, skipRoundIds: number[] = []): Promise<AlphaStats> {
  const provider = getProvider()
  const tournament = new ethers.Contract(ACTIVE_CHAIN.contracts.tournamentVault, TOURNAMENT_ABI, provider)
  const total = Number(await tournament.totalRounds())
  if (total === 0) {
    return { settledRounds: 0, cumulativeAiBps: 0, cumulativeBaselineBps: 0, alphaBps: 0, perRoundAvgAlphaBps: 0, annualizedAlphaPct: 0, recent: [] }
  }
  const ids = Array.from({ length: Math.min(limit, total) }, (_, i) => total - i)
  const rounds = await Promise.all(ids.map(id => tournament.rounds(id)))
  const skip = new Set(skipRoundIds)

  let cumAi = 0
  let cumBase = 0
  let settled = 0
  const recent: AlphaStats['recent'] = []
  for (const r of rounds) {
    if (!r.settled) continue
    if (skip.has(Number(r.id))) continue
    const startMeth = Number(r.startMethPrice)
    const settleMeth = Number(r.settleMethPrice)
    const startUsdy = Number(r.startUsdyPrice)
    const settleUsdy = Number(r.settleUsdyPrice)
    if (startMeth === 0 || startUsdy === 0) continue
    const methRetBps = Math.round(((settleMeth - startMeth) / startMeth) * 10000)
    const usdyRetBps = Math.round(((settleUsdy - startUsdy) / startUsdy) * 10000)
    const baselineBps = Math.round((methRetBps + usdyRetBps) / 2)
    const aiBps = Number(r.aiReturnBps)
    cumAi += aiBps
    cumBase += baselineBps
    settled++
    const optimalAllocMeth = methRetBps > usdyRetBps ? 100 : 0
    const optimalReturnBps = optimalAllocMeth === 100 ? methRetBps : usdyRetBps
    recent.push({
      id: Number(r.id),
      aiAllocMeth: Number(r.aiAllocMeth),
      aiReturnBps: aiBps,
      baselineReturnBps: baselineBps,
      optimalAllocMeth,
      optimalReturnBps,
    })
  }

  const alphaBps = cumAi - cumBase
  const perRoundAvgAlphaBps = settled > 0 ? alphaBps / settled : 0
  // each round ≈ 24h on mainnet, so annualize by ×365
  const annualizedAlphaPct = (perRoundAvgAlphaBps * 365) / 100

  return {
    settledRounds: settled,
    cumulativeAiBps: cumAi,
    cumulativeBaselineBps: cumBase,
    alphaBps,
    perRoundAvgAlphaBps,
    annualizedAlphaPct,
    recent,
  }
}

async function fetchEthPriceUsd(): Promise<number> {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', { next: { revalidate: 60 } })
    if (!r.ok) return 3500
    const j = await r.json()
    const px = j?.ethereum?.usd
    return typeof px === 'number' && px > 0 ? px : 3500
  } catch { return 3500 }
}

export async function getProtocolStats(): Promise<{
  totalDecisions: number
  totalRounds: number
  aiWins: number
  humanWins: number
  aiWinRatePct: number
  currentMethAllocPct: number
  tvlUsd: number
  lastRebalanceAt: number
}> {
  const provider = getProvider()
  const log = new ethers.Contract(ACTIVE_CHAIN.contracts.decisionLog, DECISION_LOG_ABI, provider)
  const tournament = new ethers.Contract(ACTIVE_CHAIN.contracts.tournamentVault, TOURNAMENT_ABI, provider)
  const agent = new ethers.Contract(ACTIVE_CHAIN.contracts.mensaAgent, MENSA_AGENT_ABI, provider)
  const meth = new ethers.Contract(ACTIVE_CHAIN.contracts.mETH, ERC20_BAL_ABI, provider)
  const usdy = new ethers.Contract(ACTIVE_CHAIN.contracts.USDY, ERC20_BAL_ABI, provider)
  const agentAddr = ACTIVE_CHAIN.contracts.mensaAgent

  const [totalDecisions, totalRounds, aiWins, humanWins, aiWinRateBps, currentMethAllocPct, lastRebalanceAt, methBal, usdyBal, ethPrice] = await Promise.all([
    log.totalDecisions(),
    tournament.totalRounds(),
    tournament.aiWins(),
    tournament.humanWins(),
    tournament.aiWinRateBps(),
    agent.currentMethAllocPct(),
    agent.lastRebalanceAt().catch(() => BigInt(0)),
    meth.balanceOf(agentAddr).catch(() => BigInt(0)),
    usdy.balanceOf(agentAddr).catch(() => BigInt(0)),
    fetchEthPriceUsd(),
  ])

  // TVL = mETH balance × ETH price × 1.04 (mETH/ETH rate) + USDY balance × $1.05
  const methWhole = Number(ethers.formatUnits(methBal, 18))
  const usdyWhole = Number(ethers.formatUnits(usdyBal, 18))
  const tvlUsd = methWhole * ethPrice * 1.04 + usdyWhole * 1.05

  return {
    totalDecisions: Number(totalDecisions),
    totalRounds: Number(totalRounds),
    aiWins: Number(aiWins),
    humanWins: Number(humanWins),
    aiWinRatePct: Number(aiWinRateBps) / 100,
    currentMethAllocPct: Number(currentMethAllocPct),
    tvlUsd,
    lastRebalanceAt: Number(lastRebalanceAt),
  }
}

export async function getRecentDecisions(limit = 10): Promise<OnChainDecision[]> {
  const provider = getProvider()
  const log = new ethers.Contract(ACTIVE_CHAIN.contracts.decisionLog, DECISION_LOG_ABI, provider)
  const total = Number(await log.totalDecisions())
  if (total === 0) return []

  const ids = Array.from({ length: Math.min(limit, total) }, (_, i) => total - i)
  const results = await Promise.all(
    ids.map(async (id) => {
      const d = await log.decisions(id)
      return {
        id: Number(d.id),
        timestamp: Number(d.timestamp),
        confidence: Number(d.confidence),
        action: Number(d.action),
        reasoningHash: d.reasoningHash,
        metaParam1: d.metaParam1,
        metaParam2: d.metaParam2,
      }
    })
  )
  return results
}

/// Get full reasoning text from past DecisionRecorded events.
/// Walks backward in chunks of ~9000 blocks (under typical RPC getLogs limits)
/// until we have `limit` events or we hit MAX_LOOKBACK_BLOCKS.
export async function getDecisionsWithReasoning(limit = 20): Promise<Array<OnChainDecision & { reasoning: string; txHash: string; block: number }>> {
  const provider = getProvider()
  const log = new ethers.Contract(ACTIVE_CHAIN.contracts.decisionLog, DECISION_LOG_ABI, provider)
  const filter = log.filters.DecisionRecorded()

  const CHUNK = 50000 // Mantle public RPC accepts up to 50k blocks per query
  const MAX_LOOKBACK_BLOCKS = 600000 // ~14d at 2s blocks (Mantle); plenty for hackathon demo
  const head = await provider.getBlockNumber()
  const collected: Array<ethers.Log | ethers.EventLog> = []

  let to = head
  while (to > 0 && (head - to) < MAX_LOOKBACK_BLOCKS && collected.length < limit) {
    const from = Math.max(0, to - CHUNK + 1)
    try {
      const batch = await log.queryFilter(filter, from, to)
      // Newest first within batch
      for (let i = batch.length - 1; i >= 0; i--) {
        collected.push(batch[i])
        if (collected.length >= limit) break
      }
    } catch {
      // skip chunk on RPC error and keep walking back
    }
    to = from - 1
  }

  return collected.map((e) => {
    if (!('args' in e)) {
      throw new Error('Expected event log with args')
    }
    const args = e.args!
    return {
      id: Number(args[0]),
      timestamp: Number(args[1]),
      action: Number(args[2]),
      confidence: Number(args[3]),
      reasoningHash: args[4],
      reasoning: args[5],
      metaParam1: BigInt(0),
      metaParam2: BigInt(0),
      txHash: e.transactionHash,
      block: e.blockNumber,
    }
  })
}

export interface UserProfile {
  address: string
  reputation: number
  weight: number
  totalVotes: number
  correctVotes: number
  winRatePct: number
  hasParticipated: boolean
  firstParticipation: number
  badgeCount: number
  badges: boolean[]  // 7 badge types
  claimableBounty: bigint
}

export async function getUserProfile(address: string): Promise<UserProfile> {
  const provider = getProvider()
  const c: any = ACTIVE_CHAIN.contracts
  const rep = new ethers.Contract(c.reputation, REPUTATION_ABI, provider)
  const bounty = new ethers.Contract(c.bountyPool, BOUNTY_ABI, provider)
  const badges = new ethers.Contract(c.badges, BADGES_ABI, provider)

  const [reputation, weight, totalVotes, correctVotes, winRate, hasPart, firstPart, badgeCount, claimable] = await Promise.all([
    rep.score(address),
    rep.getWeight(address),
    rep.totalVotes(address),
    rep.correctVotes(address),
    rep.winRate(address),
    rep.hasParticipated(address),
    rep.firstParticipation(address),
    badges.balanceOf(address),
    bounty.claimable(address),
  ])

  // Check each badge type (7 types)
  const badgesOwned = await Promise.all(
    Array.from({ length: 7 }, (_, i) => badges.hasBadge(address, i))
  )

  return {
    address,
    reputation: Number(reputation),
    weight: Number(weight),
    totalVotes: Number(totalVotes),
    correctVotes: Number(correctVotes),
    winRatePct: Number(winRate),
    hasParticipated: hasPart,
    firstParticipation: Number(firstPart),
    badgeCount: Number(badgeCount),
    badges: badgesOwned,
    claimableBounty: claimable,
  }
}

/// Aggregate all unique voters from past rounds for the leaderboard
export async function getLeaderboard(limit = 100): Promise<UserProfile[]> {
  const provider = getProvider()
  const c: any = ACTIVE_CHAIN.contracts
  const tournament = new ethers.Contract(c.tournamentVault, TOURNAMENT_ABI, provider)

  // Pull all HumanVote events
  const filter = tournament.filters.HumanVote()
  const events = await tournament.queryFilter(filter, -50000, 'latest')
  const voterSet = new Set<string>()
  for (const e of events) {
    if ('args' in e && e.args) {
      voterSet.add((e.args[1] as string).toLowerCase())
    }
  }

  const profiles = await Promise.all(
    Array.from(voterSet).slice(0, limit).map(addr => getUserProfile(addr))
  )

  return profiles.sort((a, b) => b.reputation - a.reputation)
}

export async function getBountyStats() {
  const provider = getProvider()
  const c: any = ACTIVE_CHAIN.contracts
  const bounty = new ethers.Contract(c.bountyPool, BOUNTY_ABI, provider)
  const [collected, distributed, winnerPool] = await Promise.all([
    bounty.totalCollected(),
    bounty.totalDistributed(),
    bounty.winnerPoolBalance(),
  ])
  return {
    totalCollected: collected.toString(),
    totalDistributed: distributed.toString(),
    winnerPoolBalance: winnerPool.toString(),
  }
}

export async function getRecentRounds(limit = 10): Promise<OnChainRound[]> {
  const provider = getProvider()
  const tournament = new ethers.Contract(ACTIVE_CHAIN.contracts.tournamentVault, TOURNAMENT_ABI, provider)
  const total = Number(await tournament.totalRounds())
  if (total === 0) return []

  const ids = Array.from({ length: Math.min(limit, total) }, (_, i) => total - i)
  const results = await Promise.all(
    ids.map(async (id) => {
      const r = await tournament.rounds(id)
      return {
        id: Number(r.id),
        startTime: Number(r.startTime),
        settlementTime: Number(r.settlementTime),
        startMethPrice: r.startMethPrice,
        startUsdyPrice: r.startUsdyPrice,
        settleMethPrice: r.settleMethPrice,
        settleUsdyPrice: r.settleUsdyPrice,
        aiAllocMeth: Number(r.aiAllocMeth),
        humanAllocMeth: Number(r.humanAllocMeth),
        aiReturnBps: r.aiReturnBps,
        humanReturnBps: r.humanReturnBps,
        outcome: Number(r.outcome),
        settled: r.settled,
      }
    })
  )
  return results
}
