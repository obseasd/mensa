// Mensa AI Agent — the brain of the treasury
// Reads on-chain state from Mantle Mainnet, asks Claude for an allocation
// decision, returns a structured proposal with reasoning + confidence.

import { ethers } from 'ethers'
import Anthropic from '@anthropic-ai/sdk'
import { MANTLE_MAINNET } from './chains'

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

export async function fetchMarketState(provider?: ethers.JsonRpcProvider): Promise<MarketState> {
  const rpc = provider || new ethers.JsonRpcProvider(MANTLE_MAINNET.rpc)

  // Read mETH exchange rate (eth per 1 mETH)
  let methToEthRate = 1.0
  try {
    const meth = new ethers.Contract(MANTLE_MAINNET.contracts.mETH, METH_ABI, rpc)
    const oneMETH = ethers.parseUnits('1', 18)
    const ethEquiv = await meth.methToETH(oneMETH)
    methToEthRate = parseFloat(ethers.formatUnits(ethEquiv, 18))
  } catch {
    methToEthRate = 1.04 // fallback estimate
  }

  // Real ETH price (would use Chainlink in production — use mock for now)
  const ethPrice = 3500 // $3500 ETH placeholder
  const mETHPrice = ethPrice * methToEthRate
  const usdyPrice = 1.05 // USDY accumulates yield in price (~$1.05 after 1y at 5%)

  // Yield APRs — would query on-chain rates in production
  const mETHYieldAPR = 4.2 + (Math.random() - 0.5) * 0.6  // jittered for demo
  const usdyYieldAPR = 4.8 + (Math.random() - 0.5) * 0.4

  return {
    mETHPrice,
    usdyPrice,
    mETHYieldAPR,
    usdyYieldAPR,
    ethPrice,
    totalTVL: 0, // updated when contracts deployed
    currentMethAllocPct: 50, // updated from contract read
    timestamp: Date.now(),
  }
}

export async function decideAllocation(state: MarketState, apiKey?: string): Promise<AgentDecision> {
  const key = apiKey || process.env.ANTHROPIC_API_KEY
  if (!key) {
    return mockDecision(state)
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
  }
}

/// Run a single agent cycle: read state -> decide -> return proposal
export async function runAgentCycle(): Promise<AgentDecision> {
  const state = await fetchMarketState()
  const decision = await decideAllocation(state)
  return decision
}
