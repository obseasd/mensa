// Continuous agent loop: every interval, query market state,
// ask Claude for an allocation decision, execute on-chain.
//
// Designed to run via cron or as a long-running process.
// Usage:
//   PRIVATE_KEY=0x... INTERVAL_MIN=30 node scripts/agent-loop.mjs
//   PRIVATE_KEY=0x... node scripts/agent-loop.mjs --once

import { ethers } from 'ethers'

const RPC = 'https://rpc.sepolia.mantle.xyz'
const AGENT_ADDR = '0x0B1018150C18dF5EB453Baa25a169884069AA81F'

const AGENT_ABI = [
  'function executeAllocation(uint8,uint8,string,uint256,uint256) returns (uint256, uint256)',
  'function currentMethAllocPct() view returns (uint8)',
  'function minRebalanceBps() view returns (uint256)',
  'function lastRebalanceAt() view returns (uint256)',
  'function minTimeBetweenRebalances() view returns (uint256)',
]

// Mock yield curves — in production these would be on-chain reads + Bybit API
function generateMarketState(currentMeth) {
  const baseMethYield = 4.2 + (Math.random() - 0.5) * 0.8
  const baseUsdyYield = 4.5 + (Math.random() - 0.5) * 0.4
  const ethPrice = 3500 + (Math.random() - 0.5) * 200
  const methPrice = ethPrice * 1.04
  const usdyPrice = 1.05

  return {
    methYieldAPR: baseMethYield,
    usdyYieldAPR: baseUsdyYield,
    ethPrice,
    methPrice,
    usdyPrice,
    currentMeth,
  }
}

// Simple deterministic decision logic (would be Claude in production)
function decide(state) {
  const spread = state.methYieldAPR - state.usdyYieldAPR

  let target = state.currentMeth
  let reasoning = ''
  let confidence = 70

  if (spread > 0.5) {
    target = Math.min(85, state.currentMeth + 10)
    reasoning = `mETH yield (${state.methYieldAPR.toFixed(2)}%) outpaces USDY (${state.usdyYieldAPR.toFixed(2)}%) by ${spread.toFixed(2)}pp. Increasing mETH allocation from ${state.currentMeth}% to ${target}% to capture spread.`
    confidence = 85
  } else if (spread < -0.5) {
    target = Math.max(20, state.currentMeth - 10)
    reasoning = `USDY yield (${state.usdyYieldAPR.toFixed(2)}%) is now higher than mETH (${state.methYieldAPR.toFixed(2)}%). Reducing mETH from ${state.currentMeth}% to ${target}% for safer real-yield exposure.`
    confidence = 78
  } else {
    // Hold
    return null
  }

  return { target, reasoning, confidence }
}

function fmtPrice(usd) {
  return BigInt(Math.floor(usd * 1e8))
}

async function runOnce(wallet, agent) {
  const currentMeth = Number(await agent.currentMethAllocPct())
  const state = generateMarketState(currentMeth)
  const decision = decide(state)

  if (!decision) {
    console.log(`[${new Date().toISOString()}] HOLD — spread ${(state.methYieldAPR - state.usdyYieldAPR).toFixed(2)}pp too narrow`)
    return
  }

  // Check time gate
  const lastRebalanceAt = Number(await agent.lastRebalanceAt())
  const cooldown = Number(await agent.minTimeBetweenRebalances())
  const now = Math.floor(Date.now() / 1000)
  if (lastRebalanceAt > 0 && now < lastRebalanceAt + cooldown) {
    console.log(`[${new Date().toISOString()}] Cooldown — ${lastRebalanceAt + cooldown - now}s remaining`)
    return
  }

  // Check delta threshold
  const minBps = Number(await agent.minRebalanceBps())
  const delta = Math.abs(decision.target - currentMeth)
  if (delta * 100 < minBps) {
    console.log(`[${new Date().toISOString()}] Delta ${delta}pp below threshold ${minBps / 100}pp`)
    return
  }

  console.log(`[${new Date().toISOString()}] REBALANCE ${currentMeth}% -> ${decision.target}% (conf ${decision.confidence}%)`)
  console.log(`  reasoning: ${decision.reasoning}`)

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
  const pk = process.env.PRIVATE_KEY
  if (!pk) { console.error('Set PRIVATE_KEY'); process.exit(1) }

  const provider = new ethers.JsonRpcProvider(RPC)
  const wallet = new ethers.Wallet(pk, provider)
  const agent = new ethers.Contract(AGENT_ADDR, AGENT_ABI, wallet)

  console.log(`Agent operator: ${wallet.address}`)
  console.log(`Agent contract: ${AGENT_ADDR}`)

  const onceFlag = process.argv.includes('--once')
  if (onceFlag) {
    await runOnce(wallet, agent)
    return
  }

  const intervalMin = Number(process.env.INTERVAL_MIN || 30)
  console.log(`Loop interval: ${intervalMin} minutes`)

  await runOnce(wallet, agent)
  setInterval(() => { runOnce(wallet, agent).catch(console.error) }, intervalMin * 60 * 1000)
}

main().catch(e => { console.error(e); process.exit(1) })
