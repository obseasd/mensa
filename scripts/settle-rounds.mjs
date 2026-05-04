// Settle past tournament rounds with realistic price moves.
// First makes the AI operator the settler, then settles each ready round.
// Usage: PRIVATE_KEY=0x... node scripts/settle-rounds.mjs

import { ethers } from 'ethers'

const RPC = 'https://rpc.sepolia.mantle.xyz'
const VAULT_ADDR = '0xE0C0088acaD843e07Ceb77338fF1eC49979Be5f2'

const VAULT_ABI = [
  'function totalRounds() view returns (uint256)',
  'function rounds(uint256) view returns (uint256, uint64, uint64, uint256, uint256, uint256, uint256, uint8, uint8, int256, int256, uint8, bool)',
  'function settleRound(uint256, uint256, uint256, uint8)',
  'function setSettler(address)',
  'function settler() view returns (address)',
  'function roundDuration() view returns (uint256)',
]

async function main() {
  const pk = process.env.PRIVATE_KEY
  if (!pk) { console.error('Set PRIVATE_KEY'); process.exit(1) }

  const provider = new ethers.JsonRpcProvider(RPC)
  const wallet = new ethers.Wallet(pk, provider)
  const vault = new ethers.Contract(VAULT_ADDR, VAULT_ABI, wallet)

  console.log('Wallet:', wallet.address)

  // Round duration is 1 day by default — for testnet we shorten by sending forward time isnt possible
  // So we'll settle rounds with simulated future prices regardless of timestamp
  // Actually settleRound checks block.timestamp >= settlementTime — we need to wait or skip.
  // For testnet: we'll override by deploying a faster vault or accept that we need to wait.

  const total = Number(await vault.totalRounds())
  console.log(`Total rounds: ${total}`)

  if (total === 0) {
    console.log('No rounds to settle')
    return
  }

  // Check current settler
  const currentSettler = await vault.settler()
  console.log('Current settler:', currentSettler)

  if (currentSettler.toLowerCase() !== wallet.address.toLowerCase()) {
    console.log('\\nSettler is not us. Need to call vault.setSettler(us) FROM the agent.')
    console.log('This requires a TX from the MensaAgent contract address itself.')
    console.log('Workaround for testnet: deploying a new vault with us as settler-from-start.')
    console.log('Skipping settle for now — rounds will be settle-able when settler is set.')
    return
  }

  const roundDuration = Number(await vault.roundDuration())
  console.log(`Round duration: ${roundDuration}s (${roundDuration / 3600}h)`)

  // Generate realistic settle prices for each round
  // Round 1: AI bet 60% mETH @ 3640 -> mETH +5%, USDY flat -> AI wins (60*5 = 3% return)
  // Round 2: AI bet 45% mETH @ 3620 -> mETH -3%, USDY +0.1% -> Human (35%) wins
  // Round 3: AI bet 75% mETH @ 3680 -> mETH +8%, USDY +0.1% -> AI wins big
  // Round 4: AI bet 55% mETH @ 3650 -> mETH -2%, USDY +0.1% -> Human wins
  const scenarios = [
    { settleMeth: 3822_00000000n, settleUsdy: 1_05000000n, humanAlloc: 35 },
    { settleMeth: 3511_40000000n, settleUsdy: 1_05204600n, humanAlloc: 35 },
    { settleMeth: 3974_40000000n, settleUsdy: 1_05305200n, humanAlloc: 40 },
    { settleMeth: 3577_00000000n, settleUsdy: 1_05405300n, humanAlloc: 40 },
  ]

  const now = Math.floor(Date.now() / 1000)
  for (let id = 1; id <= total; id++) {
    const r = await vault.rounds(id)
    const settled = r[12]
    const settlementTime = Number(r[2])

    if (settled) {
      console.log(`Round ${id}: already settled`)
      continue
    }

    if (now < settlementTime) {
      const wait = settlementTime - now
      console.log(`Round ${id}: settles in ${wait}s (${(wait / 3600).toFixed(1)}h) — skipping`)
      continue
    }

    const s = scenarios[id - 1] || scenarios[0]
    console.log(`Round ${id}: settling with mETH=${s.settleMeth / 100000000n}, USDY=${Number(s.settleUsdy) / 1e8}`)
    const tx = await vault.settleRound(id, s.settleMeth, s.settleUsdy, s.humanAlloc)
    console.log(`  tx: ${tx.hash}`)
    await tx.wait()
    console.log(`  confirmed`)
  }

  console.log('\\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
