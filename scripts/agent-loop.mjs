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
  'function roundVoters(uint256, uint256) view returns (address)',
  'function votes(uint256, address) view returns (uint8 allocMeth, uint256 weight, uint256 timestamp)',
]

/// Read recent settled rounds and compute reputation-weighted human consensus.
/// Returns null if no real human votes (auto-settle defaults are excluded so
/// we don't loop the AI's own 50% baseline back into its prompt).
async function fetchHumanConsensus(provider) {
  try {
    const t = new ethers.Contract(TOURNAMENT_ADDR, TOURNAMENT_ABI, provider)
    const total = Number(await t.totalRounds())
    if (total === 0) return null
    const ids = Array.from({ length: Math.min(20, total) }, (_, i) => total - i)
    const rounds = await Promise.all(ids.map(id => t.rounds(id)))

    let totalWeightedAlloc = 0n
    let totalWeight = 0n
    let voterCount = 0
    let winningAllocs = [] // allocations of voters who beat the AI in this round

    for (const r of rounds) {
      if (!r.settled) continue
      const id = Number(r.id)
      const numVoters = Number(await t.getVotersCount(id))
      if (numVoters === 0) continue
      // AI return for win comparison (we don't need AI alloc here)
      const aiBps = Number(r.aiReturnBps)
      // Compute mETH/USDY return from prices
      const sm = Number(r.startMethPrice), em = Number(r.settleMethPrice)
      const su = Number(r.startUsdyPrice), eu = Number(r.settleUsdyPrice)
      if (sm === 0 || su === 0) continue
      const methBps = Math.round(((em - sm) / sm) * 10000)
      const usdyBps = Math.round(((eu - su) / su) * 10000)

      // Read each voter's allocation + weight
      const voterAddrs = await Promise.all(
        Array.from({ length: numVoters }, (_, i) => t.roundVoters(id, i))
      )
      for (const addr of voterAddrs) {
        const v = await t.votes(id, addr)
        const alloc = Number(v.allocMeth)
        const weight = BigInt(v.weight)
        if (weight === 0n) continue
        totalWeightedAlloc += BigInt(alloc) * weight
        totalWeight += weight
        voterCount++
        // Did this voter beat the AI?
        const voterBps = Math.round((alloc * methBps + (100 - alloc) * usdyBps) / 100)
        if (voterBps > aiBps) winningAllocs.push({ alloc, gain: voterBps - aiBps, round: id })
      }
    }

    if (voterCount === 0 || totalWeight === 0n) return null

    const repWeightedAvg = Number(totalWeightedAlloc / totalWeight)
    return {
      voterCount,
      repWeightedAllocPct: repWeightedAvg,
      winningVotes: winningAllocs.sort((a, b) => b.gain - a.gain).slice(0, 5),
    }
  } catch (e) {
    console.error('[human-consensus] fetch failed:', e.message)
    return null
  }
}

function formatHumanConsensus(consensus) {
  if (!consensus) {
    return 'Human consensus: No real human votes yet on settled rounds. Operate on first principles.'
  }
  const lines = [
    `Human consensus from ${consensus.voterCount} settled vote${consensus.voterCount > 1 ? 's' : ''} (sqrt-rep weighted):`,
    `  Reputation-weighted average human allocation: ${consensus.repWeightedAllocPct}% mETH`,
  ]
  if (consensus.winningVotes.length > 0) {
    lines.push('')
    lines.push('Top human votes that beat you (consider their reasoning patterns):')
    for (const w of consensus.winningVotes) {
      lines.push(`  Round #${w.round}: human picked ${w.alloc}% mETH and beat you by ${w.gain}bps`)
    }
  }
  lines.push('')
  lines.push('Treat this as soft input. If you disagree, say so in your reasoning. If you agree, you can incorporate it into your allocation.')
  return lines.join('\n')
}

// Walk recent rounds and settle any whose 24h timer has expired.
// Uses current market prices for the settle and a 50% default for human
// aggregate when nobody voted (conservative neutral baseline).
//
// Two safety gates added after round #65 was killed by a Coingecko fallback
// to $3500 (recorded forever as a fake +71% mETH move):
//   1. state.pricesOk must be true (no settle with null / fallback prices)
//   2. The implied move vs startPrice must be plausible (<30%). If a settle
//      would write a >30% mETH move in 24h, refuse and skip — let a later
//      cycle pick it up when the off-chain price is fresh again.
const MAX_SETTLE_MOVE_BPS = 3000  // 30%

async function settleExpiredRounds(wallet, state) {
  if (!state.pricesOk) {
    console.log('  [settle] skipping: pricesOk=false (Coingecko failed, retry next cycle)')
    return []
  }
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

    // Sanity check vs the round's start prices. If the implied move is
    // implausibly large, skip rather than write garbage on chain.
    const startMethPrice = BigInt(r.startMethPrice)
    const startUsdyPrice = BigInt(r.startUsdyPrice)
    if (startMethPrice > 0n) {
      const methDiff = Number(((settleMethPrice * 10000n) / startMethPrice) - 10000n)
      if (Math.abs(methDiff) > MAX_SETTLE_MOVE_BPS) {
        console.warn(`  [settle] round #${id} refused: mETH ${methDiff} bps move > ${MAX_SETTLE_MOVE_BPS} bps threshold. Coingecko probably stale.`)
        continue
      }
    }
    if (startUsdyPrice > 0n) {
      const usdyDiff = Number(((settleUsdyPrice * 10000n) / startUsdyPrice) - 10000n)
      if (Math.abs(usdyDiff) > MAX_SETTLE_MOVE_BPS) {
        console.warn(`  [settle] round #${id} refused: USDY ${usdyDiff} bps move > ${MAX_SETTLE_MOVE_BPS} bps threshold.`)
        continue
      }
    }

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

/// Round #1 was the genesis decision BEFORE the memory loop existed (this
/// function didn't run on it). Including it makes the track record look much
/// worse than the actual post-feedback performance — Claude reads -62%
/// annualized and goes risk-off when reality is better. Track 'since
/// calibrated' as the headline number, but show the full sample below for
/// honesty.
const COLD_START_ROUND_IDS = new Set([1])

async function fetchTrackRecord(provider) {
  try {
    const t = new ethers.Contract(TOURNAMENT_ADDR, TOURNAMENT_ABI, provider)
    const total = Number(await t.totalRounds())
    if (total === 0) return 'Track record: No settled rounds yet — early-stage decision making. Be measured.'
    const ids = Array.from({ length: Math.min(20, total) }, (_, i) => total - i)
    const rounds = await Promise.all(ids.map(id => t.rounds(id)))

    let cumAiFull = 0, cumBaseFull = 0, settledFull = 0
    let cumAiCal = 0, cumBaseCal = 0, settledCal = 0
    const recent = []

    for (const r of rounds) {
      if (!r.settled) continue
      const id = Number(r.id)
      const sm = Number(r.startMethPrice), em = Number(r.settleMethPrice)
      const su = Number(r.startUsdyPrice), eu = Number(r.settleUsdyPrice)
      if (sm === 0 || su === 0) continue
      const methBps = Math.round(((em - sm) / sm) * 10000)
      const usdyBps = Math.round(((eu - su) / su) * 10000)
      const baseBps = Math.round((methBps + usdyBps) / 2)
      const aiBps = Number(r.aiReturnBps)
      cumAiFull += aiBps; cumBaseFull += baseBps; settledFull++
      if (!COLD_START_ROUND_IDS.has(id)) {
        cumAiCal += aiBps; cumBaseCal += baseBps; settledCal++
      }
      const optAlloc = methBps > usdyBps ? 100 : 0
      const optBps = optAlloc === 100 ? methBps : usdyBps
      const tag = COLD_START_ROUND_IDS.has(id) ? ' [cold start, pre-memory]' : ''
      recent.push(`  Round #${id}: you=${Number(r.aiAllocMeth)}% mETH (${aiBps}bps) | 50/50=${baseBps}bps | optimal=${optAlloc}% mETH (${optBps}bps) | you-vs-base=${aiBps - baseBps >= 0 ? '+' : ''}${aiBps - baseBps}bps${tag}`)
    }

    if (settledFull === 0) return 'Track record: No settled rounds yet — early-stage decision making. Be measured.'

    const alphaCal = cumAiCal - cumBaseCal
    const perRoundCal = settledCal > 0 ? alphaCal / settledCal : 0
    const signCal = alphaCal >= 0 ? '+' : ''
    const alphaFull = cumAiFull - cumBaseFull
    const perRoundFull = alphaFull / settledFull
    const signFull = alphaFull >= 0 ? '+' : ''

    const lines = [
      `Track record (since memory loop calibrated, ${settledCal} rounds):`,
      `  Cumulative alpha vs 50/50 baseline: ${signCal}${alphaCal} bps`,
      `  Per-round average: ${signCal}${perRoundCal.toFixed(0)} bps`,
      `  Reading: this is the post-feedback performance. Don't extrapolate annualization on a small sample.`,
      '',
      `Full sample including cold-start round #1 (${settledFull} rounds): ${signFull}${alphaFull} bps cumulative, ${signFull}${perRoundFull.toFixed(0)} bps/round.`,
      `Round #1 was a -324bps loss made before this feedback loop existed — note it but don't let it dominate your current strategy.`,
      '',
      'Recent rounds (newest first):',
      ...recent.slice(0, 8),
      '',
      'Reflect: when did you under-allocate to the winning asset? When did you over-rebalance and lose to passive 50/50? Use this self-knowledge.',
    ]
    return lines.join('\n')
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
- Maintain diversification: stay between 10% and 90% in each asset under normal conditions
- ACTION BIAS: when the absolute yield spread between mETH and USDY exceeds ~100bps (1 percentage point) AND the current allocation is not already aligned, you SHOULD rebalance. Don't HOLD a position that ignores a clear yield signal.
- Be opportunistic in BOTH directions:
    * Shift to mETH (60-80%) when staking yield exceeds USDY by 50+bps AND ETH macro is neutral-to-positive
    * Shift to USDY (60-80%) when T-bill yield exceeds mETH yield by 50+bps
    * Hold (40-60% mETH) only when the spread is genuinely small (< 50bps)
- ETH macro context matters: a strong ETH rally with competitive mETH yield justifies higher mETH weight even at slightly negative spread; conversely a weakening ETH outlook with USDY ahead justifies USDY weight
- The on-chain rebalance threshold is 200bps (2 percentage points), so target moves should clear that gap when you do decide to act

You will receive the current market state and must respond with:
1. action: REBALANCE, HOLD, STAKE, or UNSTAKE
2. newMethAllocPct: target mETH allocation (0-100, integer)
3. confidence: how sure you are (0-100, integer)
4. reasoning: ONE clear sentence explaining your decision in plain English

Format your response as valid JSON only. No prose outside the JSON.`

// Returns the live ETH price, or null on failure. The previous version
// silently returned $3500 on any error, which then leaked into the on-chain
// settle prices when Coingecko had a blip. Round #65 was killed by exactly
// this (settle wrote a 3500*1.04 ≈ $3640 fallback while the real price was
// ~$2115 → a fake +71% move recorded forever). Now we surface null and let
// the caller decide whether to skip the cycle.
async function fetchEthPrice() {
  try {
    const r = await fetch(COINGECKO_PRICE)
    if (!r.ok) throw new Error('coingecko fetch failed')
    const j = await r.json()
    const px = j?.ethereum?.usd
    if (typeof px === 'number' && px > 0) return px
  } catch {}
  return null
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
    ethPrice,                                // null if Coingecko failed
    methPrice: ethPrice ? ethPrice * 1.04 : null,
    usdyPrice: 1.05,
    currentMeth,
    pricesOk: ethPrice !== null,             // explicit flag for downstream gates
  }
}

async function decideWithClaude(state, apiKey, trackRecord, humanConsensus) {
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

${humanConsensus}

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

  // If the off-chain price feed failed, skip this whole cycle. We do NOT
  // want to write fallback prices on chain (the round #65 disaster came
  // from exactly this: Coingecko blip + silent fallback to $3500). Better
  // to wait 30 min and try again with fresh data.
  if (!state.pricesOk) {
    console.warn(`[${new Date().toISOString()}] Skipping cycle: ethPrice unavailable. Will retry next interval.`)
    return
  }

  // Settle any rounds whose 24h timer has expired BEFORE deciding,
  // so the new decision benefits from up-to-date track record.
  const settledIds = await settleExpiredRounds(agent.runner, state)
  if (settledIds.length > 0) {
    console.log(`Auto-settled rounds: ${settledIds.join(', ')}`)
  }

  const trackRecord = await fetchTrackRecord(agent.runner.provider)
  const consensus = await fetchHumanConsensus(agent.runner.provider)
  const humanConsensusText = formatHumanConsensus(consensus)
  console.log(`---\n${trackRecord}\n---\n${humanConsensusText}\n---`)

  let decision
  let source
  if (apiKey) {
    try {
      decision = await decideWithClaude(state, apiKey, trackRecord, humanConsensusText)
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
