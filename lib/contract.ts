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
]

const MENSA_AGENT_ABI = [
  'function currentMethAllocPct() view returns (uint8)',
  'function aiOperator() view returns (address)',
  'function maxAllocationBps() view returns (uint256)',
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

export async function getProtocolStats(): Promise<{
  totalDecisions: number
  totalRounds: number
  aiWins: number
  humanWins: number
  aiWinRatePct: number
  currentMethAllocPct: number
}> {
  const provider = getProvider()
  const log = new ethers.Contract(ACTIVE_CHAIN.contracts.decisionLog, DECISION_LOG_ABI, provider)
  const tournament = new ethers.Contract(ACTIVE_CHAIN.contracts.tournamentVault, TOURNAMENT_ABI, provider)
  const agent = new ethers.Contract(ACTIVE_CHAIN.contracts.mensaAgent, MENSA_AGENT_ABI, provider)

  const [totalDecisions, totalRounds, aiWins, humanWins, aiWinRateBps, currentMethAllocPct] = await Promise.all([
    log.totalDecisions(),
    tournament.totalRounds(),
    tournament.aiWins(),
    tournament.humanWins(),
    tournament.aiWinRateBps(),
    agent.currentMethAllocPct(),
  ])

  return {
    totalDecisions: Number(totalDecisions),
    totalRounds: Number(totalRounds),
    aiWins: Number(aiWins),
    humanWins: Number(humanWins),
    aiWinRatePct: Number(aiWinRateBps) / 100,
    currentMethAllocPct: Number(currentMethAllocPct),
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

/// Get full reasoning text from past DecisionRecorded events
export async function getDecisionsWithReasoning(limit = 20): Promise<Array<OnChainDecision & { reasoning: string; txHash: string; block: number }>> {
  const provider = getProvider()
  const log = new ethers.Contract(ACTIVE_CHAIN.contracts.decisionLog, DECISION_LOG_ABI, provider)

  const filter = log.filters.DecisionRecorded()
  const events = await log.queryFilter(filter, -10000, 'latest')
  const recent = events.slice(-limit).reverse()

  return recent.map((e) => {
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
