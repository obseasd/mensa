// One-shot admin script: raise MensaAgent risk caps BACK to contract defaults
// after the demo bootstrap left them too permissive.
//
// Reason for this script:
//   scripts/lower-thresholds.mjs was run early in the hackathon to force the
//   agent to open tournament rounds on small (0.5pp) deltas with a 30 min
//   cooldown. That bootstrapped the demo (the tournament page would otherwise
//   have been empty), but in production it makes the agent flip-flop every
//   cron tick and ignores real economics (gas + slippage cost > yield gain).
//
// Real-data economics check (Mantle, 2026-05-15):
//   * MNT price ~ $0.67
//   * Gas: avg 299,416 per executeAllocation @ 50 gwei = 0.015 MNT = $0.0101
//   * mETH pool liquidity on Mantle DEXes (combined): ~$14,185
//   * USDY pool liquidity on Mantle DEXes (combined): ~$254
//   * No direct mETH/USDY pair exists. Trade path is mETH -> WMNT -> USDY,
//     two hops through thin pools, cumulative slippage 13-21% on a $10 trade
//     and basically untradeable above ~$100 notional.
//   * Yield differential mETH vs USDY: ~1-3pp annual.
//
// Conclusion: while real swap execution remains gated on Mantle DEX depth
// growth, rebalances must be RARE and DECISIVE (not reactive). We restore
// the contract defaults: 200 bps (2pp) minimum allocation delta to act,
// 6 hours minimum between rebalances.
//
// Usage:
//   PRIVATE_KEY=0x... node scripts/raise-thresholds.mjs

import { ethers } from 'ethers'

const RPC = 'https://rpc.mantle.xyz'
const AGENT = '0xAcA925e51E7C801Af4E4080f041AF0ec112CCe49'

const AGENT_ABI = [
  'function owner() view returns (address)',
  'function maxAllocationBps() view returns (uint256)',
  'function minRebalanceBps() view returns (uint256)',
  'function minTimeBetweenRebalances() view returns (uint256)',
  'function setRiskCaps(uint256 _maxAllocBps, uint256 _minRebalanceBps, uint256 _minTime) external',
]

// Contract defaults (lines 38-41 of MensaAgent.sol):
//   maxAllocationBps      : 9500  (95% max in single asset)
//   minRebalanceBps       : 200   (2pp minimum delta to act)
//   minTimeBetweenRebalances : 21600  (6 hours)
const NEW_MAX_ALLOC_BPS = 9500
const NEW_MIN_REBALANCE_BPS = 200
const NEW_MIN_TIME = 21600

async function main() {
  const pk = (process.env.PRIVATE_KEY || '').trim().replace(/^["']|["']$/g, '')
  if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) {
    console.error('PRIVATE_KEY missing or malformed (expect 0x + 64 hex chars)')
    process.exit(1)
  }

  const provider = new ethers.JsonRpcProvider(RPC)
  const wallet = new ethers.Wallet(pk, provider)
  const agent = new ethers.Contract(AGENT, AGENT_ABI, wallet)

  console.log('Caller       :', wallet.address)
  console.log('Agent contract:', AGENT)

  const [owner, currentMax, currentMin, currentTime] = await Promise.all([
    agent.owner(),
    agent.maxAllocationBps(),
    agent.minRebalanceBps(),
    agent.minTimeBetweenRebalances(),
  ])
  console.log('Owner        :', owner)
  console.log('Current      : maxAllocBps=' + currentMax + ' minRebalanceBps=' + currentMin + ' minTime=' + currentTime + 's')
  console.log('Target       : maxAllocBps=' + NEW_MAX_ALLOC_BPS + ' minRebalanceBps=' + NEW_MIN_REBALANCE_BPS + ' minTime=' + NEW_MIN_TIME + 's')

  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    console.error('Caller is not the contract owner. Aborting.')
    process.exit(1)
  }

  if (Number(currentMin) === NEW_MIN_REBALANCE_BPS && Number(currentTime) === NEW_MIN_TIME) {
    console.log('Already set to target values. Nothing to do.')
    return
  }

  console.log('Sending setRiskCaps...')
  const tx = await agent.setRiskCaps(NEW_MAX_ALLOC_BPS, NEW_MIN_REBALANCE_BPS, NEW_MIN_TIME)
  console.log('Tx:', tx.hash)
  console.log('Mantlescan:', 'https://mantlescan.xyz/tx/' + tx.hash)
  await tx.wait()
  console.log('Confirmed.')
}

main().catch(e => { console.error(e.message || e); process.exit(1) })
