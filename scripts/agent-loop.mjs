// Continuous agent loop: every interval, query market state,
// ask Claude for an allocation decision, execute on-chain.
//
// Designed to run via cron or as a long-running process.
// Usage:
//   PRIVATE_KEY=0x... ANTHROPIC_API_KEY=sk-ant-... INTERVAL_MIN=30 node scripts/agent-loop.mjs
//   PRIVATE_KEY=0x... ANTHROPIC_API_KEY=sk-ant-... node scripts/agent-loop.mjs --once
//
// If ANTHROPIC_API_KEY is missing, falls back to deterministic heuristic
// (and the on-chain reasoning string will note 'fallback').

import { ethers } from 'ethers'
import Anthropic from '@anthropic-ai/sdk'

const RPC = 'https://rpc.sepolia.mantle.xyz'
const AGENT_ADDR = '0x0B1018150C18dF5EB453Baa25a169884069AA81F'

const COINGECKO_PRICE = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
const LLAMA_POOLS = 'https://yields.llama.fi/pools'

const AGENT_ABI = [
  'function executeAllocation(uint8,uint8,string,uint256,uint256) returns (uint256, uint256)',
  'function currentMethAllocPct() view returns (uint8)',
  'function minRebalanceBps() view returns (uint256)',
  'function lastRebalanceAt() view returns (uint256)',
  'function minTimeBetweenRebalances() view returns (uint256)',
]

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

async function fetchEthPrice() {
  try {
    const r = await fetch(COINGECKO_PRICE)
    if (!r.ok) throw new Error('coingecko fetch failed')
    const j = await r.json()
    const px = j?.ethereum?.usd
    if (typeof px === 'number' && px > 0) return px
  } catch {}
  return 3500
}

async function fetchYieldAPRs() {
  try {
    const r = await fetch(LLAMA_POOLS)
    if (!r.ok) throw new Error('llama fetch failed')
    const j = await r.json()
    const pools = j.data || []
    const meth = pools.find(p => p.project === 'meth-protocol' && p.symbol === 'METH')
    const usdy = pools.find(p => p.project === 'ondo-yield-assets' && p.symbol === 'USDY' && p.chain === 'Mantle')
    return {
      methYieldAPR: typeof meth?.apy === 'number' ? meth.apy : 4.0,
      usdyYieldAPR: typeof usdy?.apy === 'number' ? usdy.apy : 4.8,
    }
  } catch {
    return { methYieldAPR: 4.0, usdyYieldAPR: 4.8 }
  }
}

async function fetchMarketState(currentMeth) {
  const [ethPrice, yields] = await Promise.all([fetchEthPrice(), fetchYieldAPRs()])
  return {
    methYieldAPR: yields.methYieldAPR,
    usdyYieldAPR: yields.usdyYieldAPR,
    ethPrice,
    methPrice: ethPrice * 1.04,
    usdyPrice: 1.05,
    currentMeth,
  }
}

async function decideWithClaude(state, apiKey) {
  const client = new Anthropic({ apiKey })
  const userMessage = `Current market state:

mETH:
  Price: $${state.methPrice.toFixed(2)}
  Staking APR: ${state.methYieldAPR.toFixed(2)}%
  ETH reference: $${state.ethPrice.toFixed(2)}

USDY:
  Price: $${state.usdyPrice.toFixed(4)}
  T-bill APR: ${state.usdyYieldAPR.toFixed(2)}%

Treasury:
  Current mETH allocation: ${state.currentMeth}%

Spread (mETH APR - USDY APR): ${(state.methYieldAPR - state.usdyYieldAPR).toFixed(2)}pp

Make your allocation decision. Respond with JSON only.`

  const resp = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const text = resp.content[0].type === 'text' ? resp.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('no JSON in Claude response')
  const parsed = JSON.parse(jsonMatch[0])
  return {
    action: parsed.action || 'HOLD',
    target: Math.max(0, Math.min(100, Math.floor(parsed.newMethAllocPct ?? state.currentMeth))),
    confidence: Math.max(0, Math.min(100, Math.floor(parsed.confidence ?? 50))),
    reasoning: parsed.reasoning || 'No reasoning provided',
  }
}

function decideHeuristic(state) {
  const spread = state.methYieldAPR - state.usdyYieldAPR
  if (spread > 0.5) {
    const target = Math.min(85, state.currentMeth + 10)
    return {
      action: 'REBALANCE',
      target,
      confidence: 75,
      reasoning: `[fallback] mETH yield (${state.methYieldAPR.toFixed(2)}%) outpaces USDY (${state.usdyYieldAPR.toFixed(2)}%) by ${spread.toFixed(2)}pp. Increasing mETH from ${state.currentMeth}% to ${target}%.`,
    }
  }
  if (spread < -0.5) {
    const target = Math.max(20, state.currentMeth - 10)
    return {
      action: 'REBALANCE',
      target,
      confidence: 78,
      reasoning: `[fallback] USDY yield (${state.usdyYieldAPR.toFixed(2)}%) higher than mETH (${state.methYieldAPR.toFixed(2)}%). Reducing mETH from ${state.currentMeth}% to ${target}%.`,
    }
  }
  return {
    action: 'HOLD',
    target: state.currentMeth,
    confidence: 60,
    reasoning: `[fallback] Spread ${spread.toFixed(2)}pp too narrow to rebalance.`,
  }
}

function fmtPrice(usd) {
  return BigInt(Math.floor(usd * 1e8))
}

async function runOnce(agent) {
  const currentMeth = Number(await agent.currentMethAllocPct())
  const state = await fetchMarketState(currentMeth)
  const apiKey = process.env.ANTHROPIC_API_KEY

  let decision
  let source
  if (apiKey) {
    try {
      decision = await decideWithClaude(state, apiKey)
      source = 'claude'
    } catch (e) {
      console.error(`[${new Date().toISOString()}] Claude failed, using heuristic: ${e.message}`)
      decision = decideHeuristic(state)
      source = 'fallback'
    }
  } else {
    decision = decideHeuristic(state)
    source = 'no-api-key'
  }

  console.log(`[${new Date().toISOString()}] [${source}] ${decision.action} target=${decision.target}% conf=${decision.confidence}%`)
  console.log(`  reasoning: ${decision.reasoning}`)

  if (decision.action === 'HOLD' || decision.target === currentMeth) {
    console.log(`  -> no on-chain action`)
    return
  }

  // Time gate
  const lastRebalanceAt = Number(await agent.lastRebalanceAt())
  const cooldown = Number(await agent.minTimeBetweenRebalances())
  const now = Math.floor(Date.now() / 1000)
  if (lastRebalanceAt > 0 && now < lastRebalanceAt + cooldown) {
    console.log(`  -> cooldown ${lastRebalanceAt + cooldown - now}s remaining`)
    return
  }

  // Delta threshold
  const minBps = Number(await agent.minRebalanceBps())
  const delta = Math.abs(decision.target - currentMeth)
  if (delta * 100 < minBps) {
    console.log(`  -> delta ${delta}pp below threshold ${minBps / 100}pp`)
    return
  }

  try {
    const tx = await agent.executeAllocation(
      decision.target,
      decision.confidence,
      decision.reasoning,
      fmtPrice(state.methPrice),
      fmtPrice(state.usdyPrice),
    )
    console.log(`  tx: ${tx.hash}`)
    await tx.wait()
    console.log(`  confirmed`)
  } catch (e) {
    console.error(`  failed: ${e.message}`)
  }
}

async function main() {
  const rawPk = process.env.PRIVATE_KEY
  if (!rawPk) { console.error('Set PRIVATE_KEY'); process.exit(1) }
  const pk = rawPk.trim().replace(/^["']|["']$/g, '')
  const isHex = /^0x[0-9a-fA-F]{64}$/.test(pk)
  console.log(`PK debug: length=${pk.length} starts0x=${pk.startsWith('0x')} hex64=${isHex}`)
  if (!isHex) {
    console.error('PRIVATE_KEY format invalid. Expected 0x + 64 hex chars (66 total).')
    process.exit(1)
  }

  const provider = new ethers.JsonRpcProvider(RPC)
  const wallet = new ethers.Wallet(pk, provider)
  const agent = new ethers.Contract(AGENT_ADDR, AGENT_ABI, wallet)

  console.log(`Agent operator: ${wallet.address}`)
  console.log(`Agent contract: ${AGENT_ADDR}`)
  console.log(`Claude: ${process.env.ANTHROPIC_API_KEY ? 'enabled' : 'DISABLED (fallback heuristic only)'}`)

  const onceFlag = process.argv.includes('--once')
  if (onceFlag) {
    await runOnce(agent)
    return
  }

  const intervalMin = Number(process.env.INTERVAL_MIN || 30)
  console.log(`Loop interval: ${intervalMin} minutes`)

  await runOnce(agent)
  setInterval(() => { runOnce(agent).catch(console.error) }, intervalMin * 60 * 1000)
}

main().catch(e => { console.error(e); process.exit(1) })
