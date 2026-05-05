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

// Mantle Mainnet
const RPC = 'https://rpc.mantle.xyz'
const AGENT_ADDR = '0xAcA925e51E7C801Af4E4080f041AF0ec112CCe49'

const COINGECKO_PRICE = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
const LLAMA_POOLS = 'https://yields.llama.fi/pools'

const AGENT_ABI = [
  'function executeAllocation(uint8,uint8,string,uint256,uint256) returns (uint256, uint256)',
  'function currentMethAllocPct() view returns (uint8)',
  'function minRebalanceBps() view returns (uint256)',
  'function lastRebalanceAt() view returns (uint256)',
  'function minTimeBetweenRebalances() view returns (uint256)',
]

const TOURNAMENT_ADDR = '0x92E6B40da9566d6b7176420D88818500dB77d122'
const TOURNAMENT_ABI = [
  'function totalRounds() view returns (uint256)',
  'function rounds(uint256) view returns (uint256 id, uint64 startTime, uint64 settlementTime, uint256 startMethPrice, uint256 startUsdyPrice, uint256 settleMethPrice, uint256 settleUsdyPrice, uint8 aiAllocMeth, uint8 humanAllocMeth, int256 aiReturnBps, int256 humanReturnBps, uint8 outcome, bool settled)',
  'function settleRound(uint256 roundId, uint256 settleMethPrice, uint256 settleUsdyPrice, uint8 aggregateHumanAlloc) external',
  'function getVotersCount(uint256) view returns (uint256)',
]

// Walk recent rounds and settle any whose 24h timer has expired.
// Uses current market prices for the settle and a 50% default for human
// aggregate when nobody voted (conservative neutral baseline).
async function settleExpiredRounds(wallet, state) {
  const t = new ethers.Contract(TOURNAMENT_ADDR, TOURNAMENT_ABI, wallet)
  const total = Number(await t.totalRounds())
  if (total === 0) return []
  const now = Math.floor(Date.now() / 1000)
  const start = Math.max(1, total - 20)
  const settled = []
  for (let id = total; id >= start; id--) {
    let r
    try { r = await t.rounds(id) } catch { continue }
    if (r.settled) continue
    if (now < Number(r.settlementTime)) continue

    // Default human aggregate is 50/50. If voters exist, the contract has
    // their individual votes but no on-chain aggregator — for now we keep
    // the conservative default. Active voting flow will compute this off-chain.
    let aggregateHumanAlloc = 50
    try {
      const voters = Number(await t.getVotersCount(id))
      if (voters > 0) {
        // TODO: compute weighted avg from individual votes when voting picks up.
        aggregateHumanAlloc = 50
      }
    } catch {}

    const settleMethPrice = BigInt(Math.floor(state.methPrice * 1e8))
    const settleUsdyPrice = BigInt(Math.floor(state.usdyPrice * 1e8))
    console.log(`  settling round #${id} mETH=$${state.methPrice.toFixed(2)} USDY=$${state.usdyPrice.toFixed(4)} humanAggr=${aggregateHumanAlloc}%`)
    try {
      const tx = await t.settleRound(id, settleMethPrice, settleUsdyPrice, aggregateHumanAlloc)
      console.log(`    tx: ${tx.hash}`)
      await tx.wait()
      console.log(`    confirmed`)
      settled.push(id)
    } catch (e) {
      console.error(`    failed: ${e.message}`)
    }
  }
  return settled
}

async function fetchTrackRecord(provider) {
  try {
    const t = new ethers.Contract(TOURNAMENT_ADDR, TOURNAMENT_ABI, provider)
    const total = Number(await t.totalRounds())
    if (total === 0) return 'Track record: No settled rounds yet — early-stage decision making. Be measured.'
    const ids = Array.from({ length: Math.min(20, total) }, (_, i) => total - i)
    const rounds = await Promise.all(ids.map(id => t.rounds(id)))
    let cumAi = 0, cumBase = 0, settled = 0
    const recent = []
    for (const r of rounds) {
      if (!r.settled) continue
      const sm = Number(r.startMethPrice), em = Number(r.settleMethPrice)
      const su = Number(r.startUsdyPrice), eu = Number(r.settleUsdyPrice)
      if (sm === 0 || su === 0) continue
      const methBps = Math.round(((em - sm) / sm) * 10000)
      const usdyBps = Math.round(((eu - su) / su) * 10000)
      const baseBps = Math.round((methBps + usdyBps) / 2)
      const aiBps = Number(r.aiReturnBps)
      cumAi += aiBps; cumBase += baseBps; settled++
      const optAlloc = methBps > usdyBps ? 100 : 0
      const optBps = optAlloc === 100 ? methBps : usdyBps
      recent.push(`  Round #${Number(r.id)}: you=${Number(r.aiAllocMeth)}% mETH (${aiBps}bps) | 50/50=${baseBps}bps | optimal=${optAlloc}% mETH (${optBps}bps) | you-vs-base=${aiBps - baseBps >= 0 ? '+' : ''}${aiBps - baseBps}bps`)
    }
    if (settled === 0) return 'Track record: No settled rounds yet — early-stage decision making. Be measured.'
    const alphaBps = cumAi - cumBase
    const perRound = alphaBps / settled
    const annualizedPct = (perRound * 365) / 100
    const sign = alphaBps >= 0 ? '+' : ''
    return [
      `Track record (${settled} settled rounds):`,
      `  Cumulative alpha vs 50/50: ${sign}${alphaBps} bps (${sign}${annualizedPct.toFixed(2)}% annualized)`,
      `  Per-round average: ${sign}${perRound.toFixed(0)} bps`,
      '',
      'Recent rounds:',
      ...recent.slice(0, 8),
      '',
      'Reflect: when did you under-allocate to the winning asset? When did you over-rebalance and lose to passive 50/50? Use this self-knowledge.',
    ].join('\n')
  } catch (e) {
    return `Track record: unavailable (${e.message}). Decide on first principles.`
  }
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

async function decideWithClaude(state, apiKey, trackRecord) {
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

${trackRecord}

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

  // Settle any rounds whose 24h timer has expired BEFORE deciding,
  // so the new decision benefits from up-to-date track record.
  const settledIds = await settleExpiredRounds(agent.runner, state)
  if (settledIds.length > 0) {
    console.log(`Auto-settled rounds: ${settledIds.join(', ')}`)
  }

  const trackRecord = await fetchTrackRecord(agent.runner.provider)
  console.log(`---\n${trackRecord}\n---`)

  let decision
  let source
  if (apiKey) {
    try {
      decision = await decideWithClaude(state, apiKey, trackRecord)
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
