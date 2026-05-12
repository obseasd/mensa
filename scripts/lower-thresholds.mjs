// One-shot admin script: lower MensaAgent risk caps so rebalances happen
// on smaller deltas. Only the owner (clean wallet 0x3a0Dd9...) can call this.
//
// Defaults shift from 2pp delta / 1h cooldown to 0.5pp delta / 30min cooldown,
// which means even modest yield shifts open a new tournament round. Useful for
// the hackathon demo where we need active rounds for human voting.
//
// Usage:
//   PRIVATE_KEY=0x... node scripts/lower-thresholds.mjs

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

// New caps:
//   maxAllocationBps      : 9500   (95%, unchanged — never put all eggs in one basket)
//   minRebalanceBps       : 50     (0.5pp delta, was 200 = 2pp)
//   minTimeBetweenRebalances : 1800 (30 min, was 3600 = 1h)
const NEW_MAX_ALLOC_BPS = 9500
const NEW_MIN_REBALANCE_BPS = 50
const NEW_MIN_TIME = 1800

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
