// Mensa AI Agent — the brain of the treasury
// Reads on-chain state from Mantle Mainnet, asks Claude for an allocation
// decision, returns a structured proposal with reasoning + confidence.

import { ethers } from 'ethers'
import Anthropic from '@anthropic-ai/sdk'
import { MANTLE_MAINNET } from './chains'
import { getAlphaStats, type AlphaStats } from './contract'

const COINGECKO_PRICE = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
const LLAMA_POOLS = 'https://yields.llama.fi/pools'

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
]

// Minimal mETH ABI to read staking rate
const METH_ABI = [
  ...ERC20_ABI,
  'function ethToMETH(uint256) view returns (uint256)',  // exchange rate
  'function methToETH(uint256) view returns (uint256)',
]

export interface MarketState {
  mETHPrice: number       // mETH/USD
  usdyPrice: number       // USDY/USD
  mETHYieldAPR: number    // current mETH staking APR (%)
  usdyYieldAPR: number    // current USDY T-bill APR (%)
  ethPrice: number        // ETH/USD reference
  totalTVL: number        // total $ in agent treasury
  currentMethAllocPct: number
  timestamp: number
}

export interface AgentDecision {
  action: 'REBALANCE' | 'HOLD' | 'STAKE' | 'UNSTAKE'
  newMethAllocPct: number  // 0-100
  confidence: number       // 0-100
  reasoning: string        // 1-3 sentence explanation
  marketSnapshot: MarketState
  proposedAt: number
  source: 'claude' | 'mock' // 'claude' = real API call; 'mock' = fallback heuristic
}

const SYSTEM_PROMPT = `You are Mensa, an autonomous AI treasury agent on Mantle network.
Your job is to allocate funds between two yield-bearing assets:

1. mETH — Mantle Liquid Staking ETH. Earns staking rewards (variable APR, typically 3-5%).
   Risk: ETH price exposure + smart contract risk + Mantle validator risk.

2. USDY — Ondo Finance tokenized US Treasuries. Earns short-term T-bill yield (variable APR, typically 3.8-5%).
   Risk: USD-denominated, T-bill credit risk, Ondo issuer risk.

You decide a target allocation between these two assets (0-100% mETH, rest in USDY).

Decision rules you must follow:
- Optimize for risk-adjusted yield, not raw APR
- Account for ETH price risk when allocating to mETH (mETH is exposed to ETH price)
- Maintain diversification: never go above 95% in a single asset (hard cap)
- Don't rebalance for differences smaller than 30 basis points (gas costs)
- Be conservative: prefer stable yield (USDY) when ETH outlook is uncertain
- Be opportunistic: shift to mETH when staking yield significantly exceeds USDY

You will receive the current market state and must respond with:
1. action: REBALANCE, HOLD, STAKE, or UNSTAKE
2. newMethAllocPct: target mETH allocation (0-100, integer)
3. confidence: how sure you are (0-100, integer)
4. reasoning: ONE clear sentence explaining your decision in plain English

Format your response as valid JSON only. No prose outside the JSON.`

async function fetchEthPrice(): Promise<number> {
  try {
    const r = await fetch(COINGECKO_PRICE, { next: { revalidate: 60 } })
    if (!r.ok) throw new Error('coingecko fetch failed')
    const j = await r.json()
    const px = j?.ethereum?.usd
    if (typeof px === 'number' && px > 0) return px
  } catch {}
  return 3500 // last-resort fallback
}

async function fetchYieldAPRs(): Promise<{ mETHYieldAPR: number; usdyYieldAPR: number }> {
  try {
    const r = await fetch(LLAMA_POOLS, { next: { revalidate: 300 } })
    if (!r.ok) throw new Error('llama fetch failed')
    const j = await r.json()
    const pools: Array<{ project: string; symbol: string; chain: string; apy: number }> = j.data || []

    // mETH staking yield: meth-protocol (the Mantle LSP, on Ethereum)
    const meth = pools.find(p => p.project === 'meth-protocol' && p.symbol === 'METH')
    // USDY yield: ondo-yield-assets on Mantle
    const usdy = pools.find(p => p.project === 'ondo-yield-assets' && p.symbol === 'USDY' && p.chain === 'Mantle')

    return {
      mETHYieldAPR: typeof meth?.apy === 'number' ? meth.apy : 4.0,
      usdyYieldAPR: typeof usdy?.apy === 'number' ? usdy.apy : 4.8,
    }
  } catch {
    return { mETHYieldAPR: 4.0, usdyYieldAPR: 4.8 }
  }
}

export async function fetchMarketState(provider?: ethers.JsonRpcProvider): Promise<MarketState> {
  const rpc = provider || new ethers.JsonRpcProvider(MANTLE_MAINNET.rpc)

  // Read mETH exchange rate (eth per 1 mETH) — on-chain
  let methToEthRate = 1.0
  try {
    const meth = new ethers.Contract(MANTLE_MAINNET.contracts.mETH, METH_ABI, rpc)
    const oneMETH = ethers.parseUnits('1', 18)
    const ethEquiv = await meth.methToETH(oneMETH)
    methToEthRate = parseFloat(ethers.formatUnits(ethEquiv, 18))
  } catch {
    methToEthRate = 1.04
  }

  // Live ETH price (Coingecko) + live yields (DefiLlama)
  const [ethPrice, yields] = await Promise.all([fetchEthPrice(), fetchYieldAPRs()])
  const mETHPrice = ethPrice * methToEthRate
  const usdyPrice = 1.05 // USDY price accumulates daily yield; ~$1.05 is a fair near-term anchor

  return {
    mETHPrice,
    usdyPrice,
    mETHYieldAPR: yields.mETHYieldAPR,
    usdyYieldAPR: yields.usdyYieldAPR,
    ethPrice,
    totalTVL: 0,
    currentMethAllocPct: 50,
    timestamp: Date.now(),
  }
}

function formatTrackRecord(alpha: AlphaStats): string {
  if (alpha.settledRounds === 0) {
    return `Track record: No settled rounds yet — this is your early-stage decision making. Be measured.`
  }
  const sign = alpha.alphaBps >= 0 ? '+' : ''
  const lines: string[] = []
  lines.push(`Track record (${alpha.settledRounds} settled rounds):`)
  lines.push(`  Cumulative alpha vs 50/50 baseline: ${sign}${alpha.alphaBps} bps (${sign}${alpha.annualizedAlphaPct.toFixed(2)}% annualized)`)
  lines.push(`  Per-round average alpha: ${sign}${alpha.perRoundAvgAlphaBps.toFixed(0)} bps`)
  if (alpha.recent.length > 0) {
    lines.push('')
    lines.push('Recent rounds (newest first) — what you did vs what would have been optimal:')
    for (const r of alpha.recent.slice(0, 8)) {
      const youReturn = r.aiReturnBps
      const baseReturn = r.baselineReturnBps
      const youVsBase = youReturn - baseReturn
      const youVsOpt = youReturn - r.optimalReturnBps
      const yvbSign = youVsBase >= 0 ? '+' : ''
      const yvoSign = youVsOpt >= 0 ? '' : ''
      lines.push(`  Round #${r.id}: you=${r.aiAllocMeth}% mETH (${youReturn}bps) | 50/50=${baseReturn}bps | optimal=${r.optimalAllocMeth}% mETH (${r.optimalReturnBps}bps) | you-vs-base=${yvbSign}${youVsBase}bps | you-vs-optimal=${yvoSign}${youVsOpt}bps`)
    }
    lines.push('')
    lines.push('Reflect on these patterns: when did you under-allocate to the winning asset? When did you over-rebalance and lose to a passive 50/50? Use this self-knowledge.')
  }
  return lines.join('\n')
}

export async function decideAllocation(state: MarketState, apiKey?: string): Promise<AgentDecision> {
  const key = apiKey || process.env.ANTHROPIC_API_KEY
  if (!key) {
    return mockDecision(state)
  }

  // Fetch own track record (best-effort — don't block on failure)
  let trackRecordText = ''
  try {
    const alpha = await getAlphaStats(20)
    trackRecordText = formatTrackRecord(alpha)
  } catch {
    trackRecordText = 'Track record: unavailable (RPC error). Decide on first principles.'
  }

  const client = new Anthropic({ apiKey: key })
  const userMessage = `Current market state:

mETH:
  Price: $${state.mETHPrice.toFixed(2)}
  Staking APR: ${state.mETHYieldAPR.toFixed(2)}%
  ETH reference: $${state.ethPrice.toFixed(2)}

USDY:
  Price: $${state.usdyPrice.toFixed(4)}
  T-bill APR: ${state.usdyYieldAPR.toFixed(2)}%

Treasury:
  Current mETH allocation: ${state.currentMethAllocPct}%
  Total TVL: $${state.totalTVL.toFixed(2)}

Spread (mETH APR - USDY APR): ${(state.mETHYieldAPR - state.usdyYieldAPR).toFixed(2)}bps

${trackRecordText}

Make your allocation decision. Respond with JSON only.`

  try {
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = resp.content[0].type === 'text' ? resp.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in Claude response')

    const parsed = JSON.parse(jsonMatch[0])
    return {
      action: parsed.action || 'HOLD',
      newMethAllocPct: Math.max(0, Math.min(100, Math.floor(parsed.newMethAllocPct ?? state.currentMethAllocPct))),
      confidence: Math.max(0, Math.min(100, Math.floor(parsed.confidence ?? 50))),
      reasoning: parsed.reasoning || 'No reasoning provided',
      marketSnapshot: state,
      proposedAt: Date.now(),
      source: 'claude',
    }
  } catch (e) {
    console.error('[agent] Claude call failed, using mock:', (e as Error).message)
    return mockDecision(state)
  }
}

function mockDecision(state: MarketState): AgentDecision {
  const spread = state.mETHYieldAPR - state.usdyYieldAPR
  let newAlloc = state.currentMethAllocPct
  let action: AgentDecision['action'] = 'HOLD'
  let confidence = 60
  let reasoning = ''

  if (spread > 0.5) {
    newAlloc = Math.min(70, state.currentMethAllocPct + 10)
    action = 'REBALANCE'
    confidence = 75
    reasoning = `mETH yield (${state.mETHYieldAPR.toFixed(1)}%) exceeds USDY (${state.usdyYieldAPR.toFixed(1)}%) by ${spread.toFixed(2)}bps. Shifting toward mETH for higher risk-adjusted return.`
  } else if (spread < -0.5) {
    newAlloc = Math.max(30, state.currentMethAllocPct - 10)
    action = 'REBALANCE'
    confidence = 78
    reasoning = `USDY yield (${state.usdyYieldAPR.toFixed(1)}%) is higher and lower-risk. Reducing mETH exposure to capture safer T-bill yield.`
  } else {
    reasoning = `Yield spread between mETH and USDY is too narrow (${spread.toFixed(2)}bps) to justify rebalancing gas costs. Holding current ${state.currentMethAllocPct}% mETH allocation.`
  }

  return {
    action,
    newMethAllocPct: newAlloc,
    confidence,
    reasoning,
    marketSnapshot: state,
    proposedAt: Date.now(),
    source: 'mock',
  }
}

/// Run a single agent cycle: read state -> decide -> return proposal
export async function runAgentCycle(): Promise<AgentDecision> {
  const state = await fetchMarketState()
  const decision = await decideAllocation(state)
  return decision
}
