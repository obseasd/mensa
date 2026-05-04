// One-time testnet setup: lower cooldowns so we can demo fast.
// Usage: PRIVATE_KEY=0x... node scripts/setup-testnet.mjs

import { ethers } from 'ethers'

const RPC = 'https://rpc.sepolia.mantle.xyz'
const AGENT_ADDR = '0x0B1018150C18dF5EB453Baa25a169884069AA81F'

const AGENT_ABI = [
  'function setRiskCaps(uint256 maxAllocBps, uint256 minRebalanceBps, uint256 minTime) external',
  'function maxAllocationBps() view returns (uint256)',
  'function minRebalanceBps() view returns (uint256)',
  'function minTimeBetweenRebalances() view returns (uint256)',
]

async function main() {
  const pk = process.env.PRIVATE_KEY
  if (!pk) { console.error('Set PRIVATE_KEY'); process.exit(1) }

  const provider = new ethers.JsonRpcProvider(RPC)
  const wallet = new ethers.Wallet(pk, provider)
  const agent = new ethers.Contract(AGENT_ADDR, AGENT_ABI, wallet)

  console.log('Wallet:', wallet.address)
  console.log('Setting testnet risk caps (instant rebalance allowed)...')

  // maxAllocBps=9500 (95% max), minRebalanceBps=200 (2% min delta), minTime=0 (no cooldown for demo)
  const tx = await agent.setRiskCaps(9500, 200, 0)
  console.log('tx:', tx.hash)
  await tx.wait()
  console.log('confirmed')

  console.log('\\nNew settings:')
  console.log('  maxAllocBps:', String(await agent.maxAllocationBps()))
  console.log('  minRebalanceBps:', String(await agent.minRebalanceBps()))
  console.log('  minTimeBetweenRebalances:', String(await agent.minTimeBetweenRebalances()), 'seconds')
}

main().catch(e => { console.error(e); process.exit(1) })
