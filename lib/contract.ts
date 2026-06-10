// Reads from deployed Mensa contracts on Mantle Mainnet.
//
// Provider note: rpc.mantle.xyz rejects JSON-RPC batches above a few dozen
// calls (returns "execution reverted, data: 0x" for the whole batch, even if
// each individual call would succeed). Ethers v6 greedily batches concurrent
// promises, so reading 60 rounds + protocol stats + 2 alpha snapshots in
// Promise.all trips the limit. Pin batchMaxCount=1 so each call gets its own
// HTTP request, identical pattern to the Bow provider on Arc which hit the
// same issue. Slightly slower (one HTTP roundtrip per read instead of one
// per batch) but reliable.
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
  'function roundVoters(uint256, uint256) view returns (address)',
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
  return new ethers.JsonRpcProvider(ACTIVE_CHAIN.rpc, undefined, { batchMaxCount: 1 })
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

/// Plausibility threshold: a single 24h round where mETH OR USDY moved by
/// more than ±30% is almost certainly a data corruption (Coingecko fallback
/// to the hardcoded $3500 anchor, RPC blip on the settle path, etc), not a
/// genuine market move. mETH tracks ETH which has never moved 30% in 24h
/// even in extreme regimes, and USDY is a T-bill token that should move <1bp.
/// We exclude these rounds from the calibrated alpha so single corrupted
/// settles do not skew the headline metric. The raw rounds array still
/// contains them so the tournament history table can flag them visibly.
const MAX_PLAUSIBLE_MOVE_BPS = 3000

export function isImplausibleRound(r: OnChainRound): boolean {
  const startMeth = Number(r.startMethPrice)
  const settleMeth = Number(r.settleMethPrice)
  const startUsdy = Number(r.startUsdyPrice)
  const settleUsdy = Number(r.settleUsdyPrice)
  if (startMeth === 0 || startUsdy === 0) return false
  const methAbsBps = Math.abs(Math.round(((settleMeth - startMeth) / startMeth) * 10000))
  const usdyAbsBps = Math.abs(Math.round(((settleUsdy - startUsdy) / startUsdy) * 10000))
  return methAbsBps > MAX_PLAUSIBLE_MOVE_BPS || usdyAbsBps > MAX_PLAUSIBLE_MOVE_BPS
}

/// Compute alpha stats from already-fetched rounds. Same arithmetic as
/// `getAlphaStats` but skips the on-chain round reads so the caller can
/// pass a single rounds array fetched once and compute multiple alpha
/// snapshots from it. Critical for /api/onchain perf: rpc.mantle.xyz with
/// batchMaxCount=1 turns each round read into its own HTTP roundtrip
/// (~120ms), so re-fetching 60 rounds three times costs ~24s vs ~8s
/// when shared.
export function computeAlphaFromRounds(rounds: OnChainRound[], skipRoundIds: number[] = []): AlphaStats {
  const skip = new Set(skipRoundIds)
  let cumAi = 0
  let cumBase = 0
  let settled = 0
  const recent: AlphaStats['recent'] = []
  for (const r of rounds) {
    if (!r.settled) continue
    if (skip.has(r.id)) continue
    // Skip rounds with implausible price moves (data corruption from
    // off-chain settle path, see isImplausibleRound for the reasoning).
    if (isImplausibleRound(r)) continue
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
      id: r.id,
      aiAllocMeth: r.aiAllocMeth,
      aiReturnBps: aiBps,
      baselineReturnBps: baselineBps,
      optimalAllocMeth,
      optimalReturnBps,
    })
  }
  const alphaBps = cumAi - cumBase
  const perRoundAvgAlphaBps = settled > 0 ? alphaBps / settled : 0
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

export interface HumanConsensus {
  voterCount: number
  repWeightedAllocPct: number
  winningVotes: Array<{ alloc: number; gain: number; round: number }>
}

const TOURNAMENT_FULL_ABI = [
  ...TOURNAMENT_ABI,
  'function roundVoters(uint256, uint256) view returns (address)',
  'function votes(uint256, address) view returns (uint8 allocMeth, uint256 weight, uint256 timestamp)',
]

/// Reputation-weighted human consensus from recent settled rounds.
/// Returns null if no real human votes exist (so we don't loop the
/// auto-settle 50% baseline back as if it were human input).
export async function getHumanConsensus(limit = 20): Promise<HumanConsensus | null> {
  try {
    const provider = getProvider()
    const t = new ethers.Contract(ACTIVE_CHAIN.contracts.tournamentVault, TOURNAMENT_FULL_ABI, provider)
    const total = Number(await t.totalRounds())
    if (total === 0) return null
    const ids = Array.from({ length: Math.min(limit, total) }, (_, i) => total - i)
    const rounds = await Promise.all(ids.map(id => t.rounds(id)))

    let totalWeightedAlloc = BigInt(0)
    let totalWeight = BigInt(0)
    let voterCount = 0
    const winningVotes: HumanConsensus['winningVotes'] = []

    for (const r of rounds) {
      if (!r.settled) continue
      const id = Number(r.id)
      const numVoters = Number(await t.getVotersCount(id))
      if (numVoters === 0) continue
      const aiBps = Number(r.aiReturnBps)
      const sm = Number(r.startMethPrice), em = Number(r.settleMethPrice)
      const su = Number(r.startUsdyPrice), eu = Number(r.settleUsdyPrice)
      if (sm === 0 || su === 0) continue
      const methBps = Math.round(((em - sm) / sm) * 10000)
      const usdyBps = Math.round(((eu - su) / su) * 10000)

      const voterAddrs = await Promise.all(
        Array.from({ length: numVoters }, (_, i) => t.roundVoters(id, i))
      )
      for (const addr of voterAddrs) {
        const v = await t.votes(id, addr)
        const alloc = Number(v.allocMeth)
        const weight = BigInt(v.weight)
        if (weight === BigInt(0)) continue
        totalWeightedAlloc += BigInt(alloc) * weight
        totalWeight += weight
        voterCount++
        const voterBps = Math.round((alloc * methBps + (100 - alloc) * usdyBps) / 100)
        if (voterBps > aiBps) winningVotes.push({ alloc, gain: voterBps - aiBps, round: id })
      }
    }
    if (voterCount === 0 || totalWeight === BigInt(0)) return null
    return {
      voterCount,
      repWeightedAllocPct: Number(totalWeightedAlloc / totalWeight),
      winningVotes: winningVotes.sort((a, b) => b.gain - a.gain).slice(0, 5),
    }
  } catch {
    return null
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

  const [totalDecisions, totalRounds, aiWins, humanWins, currentMethAllocPct, lastRebalanceAt, methBal, usdyBal, ethPrice] = await Promise.all([
    log.totalDecisions(),
    tournament.totalRounds(),
    tournament.aiWins(),
    tournament.humanWins(),
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

  // Win rate is settled-rounds only. The contract divides by totalRounds
  // (which includes pending) — that's misleading. We compute the honest
  // ratio: aiWins / (aiWins + humanWins).
  const aiW = Number(aiWins)
  const hW = Number(humanWins)
  const settled = aiW + hW
  const aiWinRatePct = settled > 0 ? (aiW / settled) * 100 : 0

  return {
    totalDecisions: Number(totalDecisions),
    totalRounds: Number(totalRounds),
    aiWins: aiW,
    humanWins: hW,
    aiWinRatePct,
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

  // Deterministic walk over roundVoters[] — no event windowing.
  const total = Number(await tournament.totalRounds())
  const voterSet = new Set<string>()
  if (total > 0) {
    const counts = await Promise.all(
      Array.from({ length: total }, (_, i) => tournament.getVotersCount(i + 1))
    )
    const reads: Promise<string>[] = []
    counts.forEach((cnt: bigint, idx: number) => {
      const roundId = idx + 1
      for (let i = 0; i < Number(cnt); i++) {
        reads.push(tournament.roundVoters(roundId, i))
      }
    })
    const addrs = await Promise.all(reads)
    for (const a of addrs) voterSet.add(a.toLowerCase())
  }

  const profiles = await Promise.all(
    Array.from(voterSet).slice(0, limit).map(addr => getUserProfile(addr))
  )

  return profiles.sort((a, b) => b.reputation - a.reputation)
}

export interface UserVote {
  roundId: number
  alloc: number
  weight: number
  timestamp: number
  settled: boolean
  aiAllocMeth: number
  userReturnBps: number | null
  aiReturnBps: number | null
  alphaVsAiBps: number | null
  beatAi: boolean | null
}

/// Returns one row per round the user voted in, with outcome vs AI.
export async function getUserVotes(address: string): Promise<UserVote[]> {
  const provider = getProvider()
  const t = new ethers.Contract(ACTIVE_CHAIN.contracts.tournamentVault, TOURNAMENT_FULL_ABI, provider)
  const total = Number(await t.totalRounds())
  if (total === 0) return []

  const ids = Array.from({ length: total }, (_, i) => i + 1)
  const [voteRows, roundRows] = await Promise.all([
    Promise.all(ids.map(id => t.votes(id, address))),
    Promise.all(ids.map(id => t.rounds(id))),
  ])

  const out: UserVote[] = []
  for (let i = 0; i < ids.length; i++) {
    const v = voteRows[i]
    const ts = Number(v.timestamp ?? v[2])
    if (ts === 0) continue
    const r = roundRows[i]
    const alloc = Number(v.allocMeth ?? v[0])
    const settled = Boolean(r.settled)
    let userReturnBps: number | null = null
    let aiReturnBps: number | null = null
    let alpha: number | null = null
    let beat: boolean | null = null
    if (settled) {
      const sm = Number(r.startMethPrice), em = Number(r.settleMethPrice)
      const su = Number(r.startUsdyPrice), eu = Number(r.settleUsdyPrice)
      if (sm > 0 && su > 0) {
        const methBps = Math.round(((em - sm) / sm) * 10000)
        const usdyBps = Math.round(((eu - su) / su) * 10000)
        userReturnBps = Math.round((alloc * methBps + (100 - alloc) * usdyBps) / 100)
        aiReturnBps = Number(r.aiReturnBps)
        alpha = userReturnBps - aiReturnBps
        beat = userReturnBps > aiReturnBps
      }
    }
    out.push({
      roundId: ids[i],
      alloc,
      weight: Number(v.weight ?? v[1]),
      timestamp: ts,
      settled,
      aiAllocMeth: Number(r.aiAllocMeth),
      userReturnBps,
      aiReturnBps,
      alphaVsAiBps: alpha,
      beatAi: beat,
    })
  }
  return out.sort((a, b) => b.roundId - a.roundId)
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

/// Multicall3 on Mantle Mainnet, canonical address (same as 99% of EVM chains).
/// Lets us bundle N `rounds(i)` reads into a single eth_call, cutting
/// /api/onchain from ~60 HTTP roundtrips down to 2 (one totalRounds, one
/// multicall). Verified deployed on Mantle 2026-05-25 via eth_getCode.
const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11'
const MULTICALL3_ABI = [
  'function aggregate3((address target, bool allowFailure, bytes callData)[] calls) external payable returns ((bool success, bytes returnData)[] returnData)',
] as const

const ROUND_TUPLE_ABI = [
  'uint256 id',
  'uint64 startTime',
  'uint64 settlementTime',
  'uint256 startMethPrice',
  'uint256 startUsdyPrice',
  'uint256 settleMethPrice',
  'uint256 settleUsdyPrice',
  'uint8 aiAllocMeth',
  'uint8 humanAllocMeth',
  'int256 aiReturnBps',
  'int256 humanReturnBps',
  'uint8 outcome',
  'bool settled',
]

export async function getRecentRounds(limit = 10): Promise<OnChainRound[]> {
  const provider = getProvider()
  const tournament = new ethers.Contract(ACTIVE_CHAIN.contracts.tournamentVault, TOURNAMENT_ABI, provider)
  const total = Number(await tournament.totalRounds())
  if (total === 0) return []

  const ids = Array.from({ length: Math.min(limit, total) }, (_, i) => total - i)

  // Try multicall3 first: encode N rounds(i) calls into a single eth_call.
  // Fallback to the slow per-call path if multicall fails (e.g. RPC quirk).
  try {
    const tournamentIface = new ethers.Interface(TOURNAMENT_ABI)
    const calls = ids.map(id => ({
      target: ACTIVE_CHAIN.contracts.tournamentVault,
      allowFailure: true,
      callData: tournamentIface.encodeFunctionData('rounds', [id]),
    }))
    const multicall = new ethers.Contract(MULTICALL3_ADDRESS, MULTICALL3_ABI, provider)
    const results = await multicall.aggregate3.staticCall(calls)
    const decoder = ethers.AbiCoder.defaultAbiCoder()
    const rounds: OnChainRound[] = []
    for (let i = 0; i < results.length; i++) {
      const [success, returnData] = results[i]
      if (!success || returnData === '0x') continue
      try {
        const r = decoder.decode(ROUND_TUPLE_ABI, returnData)
        rounds.push({
          id: Number(r[0]),
          startTime: Number(r[1]),
          settlementTime: Number(r[2]),
          startMethPrice: r[3] as bigint,
          startUsdyPrice: r[4] as bigint,
          settleMethPrice: r[5] as bigint,
          settleUsdyPrice: r[6] as bigint,
          aiAllocMeth: Number(r[7]),
          humanAllocMeth: Number(r[8]),
          aiReturnBps: r[9] as bigint,
          humanReturnBps: r[10] as bigint,
          outcome: Number(r[11]),
          settled: Boolean(r[12]),
        })
      } catch {
        /* decode failure for one round is non-fatal */
      }
    }
    if (rounds.length > 0) return rounds
  } catch (e) {
    console.warn('[contract] multicall3 failed, falling back to per-round reads:', (e as Error).message)
  }

  // Fallback: per-call reads (slow with batchMaxCount=1 but reliable).
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
