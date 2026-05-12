// One-shot admin script: lower min voting stake from 10 units to 0.001 units
// so users with small mainnet deposits ($2+) can vote.
//
// Uses MensaAgent.wireVault() because TournamentVault.setMinVotingStake is
// onlyAgent. We re-wire all four addresses (reputation, bountyPool, badges)
// with the current production values + the new min stake.

import { ethers } from 'ethers'

const RPC = 'https://rpc.mantle.xyz'
const AGENT = '0xAcA925e51E7C801Af4E4080f041AF0ec112CCe49'

// Current mainnet wiring (from lib/chains.ts)
const REPUTATION = '0x10A519fd1867120C5379C7f8016A4223826b4E5f'
const BOUNTY_POOL = '0x06460f1cb540951e115A95257D59FEeFf9A55f39'
const BADGES = '0x22867d39E3e9891A4F76754AF9BD1B131661144E'

// New min voting stake: 0.001 units (1e15 wei). With mETH at ~$2400, that's
// $2.40 minimum. Any micro-deposit qualifies, but you still need to be a
// non-zero depositor — keeps the contract's anti-Sybil framing intact.
const NEW_MIN_STAKE = ethers.parseUnits('0.001', 18)

const AGENT_ABI = [
  'function owner() view returns (address)',
  'function wireVault(address _reputation, address _pool, address _badges, uint256 _minStake) external',
]

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

  const owner = await agent.owner()
  console.log('Owner        :', owner)
  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    console.error('Caller is not the owner. Aborting.')
    process.exit(1)
  }

  console.log('Rewiring vault: reputation=' + REPUTATION + ' bountyPool=' + BOUNTY_POOL + ' badges=' + BADGES)
  console.log('New min voting stake: ' + ethers.formatEther(NEW_MIN_STAKE) + ' units')

  const tx = await agent.wireVault(REPUTATION, BOUNTY_POOL, BADGES, NEW_MIN_STAKE)
  console.log('Tx:', tx.hash)
  console.log('Mantlescan:', 'https://mantlescan.xyz/tx/' + tx.hash)
  await tx.wait()
  console.log('Confirmed.')
}

main().catch(e => { console.error(e.message || e); process.exit(1) })
