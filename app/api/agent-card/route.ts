import { NextResponse } from 'next/server'

// ERC-8004 agent card. Returned at this stable URL so the IdentityRegistry NFT
// can point to it via tokenURI. Spec:
// https://eips.ethereum.org/EIPS/eip-8004#registration-v1
//
// The 'type' field is the spec discriminator. All other fields follow the
// schema for trustless agent discovery.

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export async function GET() {
  const card = {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: 'Mensa',
    description:
      'Autonomous AI treasury agent on Mantle Mainnet. Allocates between mETH (Mantle liquid-staked ETH) and USDY (Ondo tokenized US Treasury bills) using Claude Haiku 4.5. Every allocation decision is logged on-chain via DecisionLog and challenged by humans in a verifiable Turing tournament settled on-chain.',
    image: 'https://mensa-mu.vercel.app/opengraph-image',
    services: [
      {
        name: 'web',
        endpoint: 'https://mensa-mu.vercel.app',
      },
      {
        name: 'docs',
        endpoint: 'https://mensa-mu.vercel.app/docs',
      },
      {
        name: 'source',
        endpoint: 'https://github.com/obseasd/mensa',
      },
      {
        name: 'stats-api',
        endpoint: 'https://mensa-mu.vercel.app/api/onchain',
        version: '1',
      },
      {
        name: 'decisions-api',
        endpoint: 'https://mensa-mu.vercel.app/api/decisions',
        version: '1',
      },
    ],
    x402Support: false,
    active: true,
    registrations: [
      {
        chain: 'mantle',
        chainId: 5000,
      },
    ],
    supportedTrust: ['reputation-onchain', 'tournament-verified-alpha'],
    // Mensa-specific extensions — non-standard fields per the spec's
    // extensibility allowance.
    capabilities: [
      'rebalance-allocation',
      'log-decision-with-reasoning',
      'open-tournament-round',
      'auto-settle-round',
      'self-feedback-memory-loop',
    ],
    model: {
      provider: 'Anthropic',
      family: 'Claude',
      version: 'Haiku 4.5',
    },
    onchainContracts: {
      mensaAgent: '0xAcA925e51E7C801Af4E4080f041AF0ec112CCe49',
      decisionLog: '0xD889B7819eF45cda7b9D30bA677A27E0ef6788Fe',
      tournamentVault: '0x92E6B40da9566d6b7176420D88818500dB77d122',
      reputation: '0x10A519fd1867120C5379C7f8016A4223826b4E5f',
      bountyPool: '0x06460f1cb540951e115A95257D59FEeFf9A55f39',
      badges: '0x22867d39E3e9891A4F76754AF9BD1B131661144E',
    },
    operatorWallet: '0x3a0Dd90212838f32a953Acd4B32596b62859324A',
    hackathon: {
      name: 'Mantle Turing Test 2026 — Phase 2 AI Awakening',
      url: 'https://dorahacks.io/hackathon/mantleturingtesthackathon2026/',
      tracks: ['AI x RWA', 'Grand Champion', 'AI Alpha & Data', 'Best UI/UX'],
    },
  }

  return NextResponse.json(card, {
    headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
  })
}
