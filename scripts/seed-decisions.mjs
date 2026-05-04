// Seed initial agent decisions on-chain.
// Runs the agent loop a few times and submits decisions to MensaAgent.
// Usage: PRIVATE_KEY=0x... node scripts/seed-decisions.mjs

import { ethers } from 'ethers'

const RPC = 'https://rpc.sepolia.mantle.xyz'
const AGENT_ADDR = '0x022F2E3EeAC339E4bE51A8a5193779477eB7B7C2'

const AGENT_ABI = [
  'function executeAllocation(uint8 newMethAllocPct, uint8 confidence, string reasoning, uint256 methPrice, uint256 usdyPrice) returns (uint256, uint256)',
  'function currentMethAllocPct() view returns (uint8)',
]

const SCENARIOS = [
  {
    newAlloc: 60,
    confidence: 87,
    reasoning: 'mETH staking yield (4.4% APR) exceeds USDY (3.9%) by 50bps. Increasing mETH allocation from 50% to 60% to capture spread.',
    methPrice: 3640_00000000n, // 8 decimals
    usdyPrice: 1_05000000n,
  },
  {
    newAlloc: 45,
    confidence: 72,
    reasoning: 'USDY T-bill yield rose to 4.7%, narrowing the spread vs mETH (4.5%). Reducing mETH exposure for safer real-yield positioning.',
    methPrice: 3620_00000000n,
    usdyPrice: 1_05100000n,
  },
  {
    newAlloc: 75,
    confidence: 91,
    reasoning: 'Mantle network upgrade increased mETH staking rewards to 5.1% APR. Strong conviction shift to mETH (45 to 75%) for outsized yield.',
    methPrice: 3680_00000000n,
    usdyPrice: 1_05200000n,
  },
  {
    newAlloc: 55,
    confidence: 78,
    reasoning: 'ETH price uncertainty (Fed minutes ahead). Trimming mETH exposure from 75 to 55% for risk management; keeping core position.',
    methPrice: 3650_00000000n,
    usdyPrice: 1_05300000n,
  },
]

async function main() {
  const pk = process.env.PRIVATE_KEY
  if (!pk) { console.error('Set PRIVATE_KEY'); process.exit(1) }

  const provider = new ethers.JsonRpcProvider(RPC)
  const wallet = new ethers.Wallet(pk, provider)
  const agent = new ethers.Contract(AGENT_ADDR, AGENT_ABI, wallet)

  console.log('Wallet:', wallet.address)
  console.log('Current allocation:', await agent.currentMethAllocPct(), '%')

  for (const [i, s] of SCENARIOS.entries()) {
    console.log(`\n[${i + 1}/${SCENARIOS.length}] Submitting: ${s.newAlloc}% mETH (confidence ${s.confidence}%)`)
    const tx = await agent.executeAllocation(
      s.newAlloc,
      s.confidence,
      s.reasoning,
      s.methPrice,
      s.usdyPrice,
    )
    console.log('  tx:', tx.hash)
    await tx.wait()
    console.log('  confirmed')
  }

  const final = await agent.currentMethAllocPct()
  console.log(`\nFinal allocation: ${final}% mETH`)
  console.log('All decisions seeded on-chain.')
}

main().catch(e => { console.error(e); process.exit(1) })
