// Real-time yield data for Mantle DeFi protocols, via DefiLlama API
// Reference: https://defillama.com/docs/api

export interface YieldPool {
  pool: string             // pool ID
  project: string          // protocol name (lendle, aave-v3, ondo-yield-assets, etc.)
  symbol: string           // token symbol
  apy: number              // total APY %
  apyBase: number | null   // base lending APY
  apyReward: number | null // reward / incentive APY
  tvlUsd: number
  chain: string
  url?: string
  underlyingTokens?: string[]
}

export interface YieldHistoryPoint {
  timestamp: number
  tvlUsd: number
  apy: number
  apyBase: number
  apyReward: number
}

const LLAMA_BASE = 'https://yields.llama.fi'

// Curated list — the protocols/tokens we care about for Mensa allocation.
// Logo URLs use icons.llamao.fi (current DefiLlama icon CDN; old icons.llama.fi 404s).
const PROTOCOL_LOGO = (slug: string) => `https://icons.llamao.fi/icons/protocols/${slug}?w=48&h=48`
const CHAIN_LOGO = (slug: string) => `https://icons.llamao.fi/icons/chains/rsz_${slug}?w=48&h=48`
const TOKEN_LOGO_ETHEREUM = (addr: string) => `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${addr}/logo.png`

export const CURATED_POOLS = {
  'mantle-meth': {
    protocol: 'Mantle Native Staking',
    token: 'mETH',
    riskTier: 'Low',
    protocolLogo: CHAIN_LOGO('mantle'),
    tokenLogo: TOKEN_LOGO_ETHEREUM('0xd5F7838F5C461fefF7FE49ea5ebaF7728bB0ADfa'),
  },
  'aave-v3-usdc': {
    protocol: 'Aave v3',
    token: 'USDC',
    riskTier: 'Low',
    protocolLogo: PROTOCOL_LOGO('aave-v3'),
    tokenLogo: TOKEN_LOGO_ETHEREUM('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'),
  },
  'aave-v3-usdt0': {
    protocol: 'Aave v3',
    token: 'USDT0',
    riskTier: 'Low',
    protocolLogo: PROTOCOL_LOGO('aave-v3'),
    tokenLogo: TOKEN_LOGO_ETHEREUM('0xdAC17F958D2ee523a2206206994597C13D831ec7'),
  },
  'aave-v3-usde': {
    protocol: 'Aave v3',
    token: 'USDe',
    riskTier: 'Medium',
    protocolLogo: PROTOCOL_LOGO('aave-v3'),
    tokenLogo: TOKEN_LOGO_ETHEREUM('0x4c9EDD5852cd905f086C759E8383e09bff1E68B3'),
  },
  'ondo-usdy': {
    protocol: 'Ondo Finance',
    token: 'USDY',
    riskTier: 'Low',
    protocolLogo: PROTOCOL_LOGO('ondo-yield-assets'),
    tokenLogo: TOKEN_LOGO_ETHEREUM('0x96F6eF951840721AdBF46Ac996b59E0235CB985C'),
  },
  'lendle-meth': {
    protocol: 'Lendle',
    token: 'mETH',
    riskTier: 'Medium',
    protocolLogo: PROTOCOL_LOGO('lendle-pooled-markets'),
    tokenLogo: TOKEN_LOGO_ETHEREUM('0xd5F7838F5C461fefF7FE49ea5ebaF7728bB0ADfa'),
  },
  'lendle-cmeth': {
    protocol: 'Lendle',
    token: 'cmETH',
    riskTier: 'Medium',
    protocolLogo: PROTOCOL_LOGO('lendle-pooled-markets'),
    tokenLogo: PROTOCOL_LOGO('mantle'),
  },
  'fluxion-bill': {
    protocol: 'Fluxion Network',
    token: 'BILL/USDT0',
    riskTier: 'High',
    protocolLogo: PROTOCOL_LOGO('fluxion-network'),
    tokenLogo: TOKEN_LOGO_ETHEREUM('0xdAC17F958D2ee523a2206206994597C13D831ec7'),
  },
  'fluxion-opg': {
    protocol: 'Fluxion Network',
    token: 'OPG/USDT0',
    riskTier: 'High',
    protocolLogo: PROTOCOL_LOGO('fluxion-network'),
    tokenLogo: TOKEN_LOGO_ETHEREUM('0xdAC17F958D2ee523a2206206994597C13D831ec7'),
  },
} as const

const RISK_COLORS = {
  Low: '#A3BAB9',
  Medium: '#fbbf24',
  High: '#ef4444',
}

export interface CuratedYield extends YieldPool {
  displayName: string
  protocolName: string
  tokenName: string
  riskTier: 'Low' | 'Medium' | 'High'
  riskColor: string
  protocolLogo: string
  tokenLogo: string
}

/// Fetch all Mantle pools from DefiLlama, filter to curated list
export async function getMantleYields(): Promise<CuratedYield[]> {
  try {
    const res = await fetch(`${LLAMA_BASE}/pools`, { next: { revalidate: 300 } })
    if (!res.ok) throw new Error('llama fetch failed')
    const data = await res.json()
    const mantlePools: YieldPool[] = data.data.filter((p: YieldPool) => p.chain === 'Mantle')

    // Match each curated pool to a real pool
    const matchers: Array<{ key: keyof typeof CURATED_POOLS; match: (p: YieldPool) => boolean }> = [
      { key: 'mantle-meth', match: p => p.project === 'mantle' && /meth/i.test(p.symbol) },
      { key: 'aave-v3-usdc', match: p => p.project === 'aave-v3' && p.symbol === 'USDC' },
      { key: 'aave-v3-usdt0', match: p => p.project === 'aave-v3' && p.symbol === 'USDT0' },
      { key: 'aave-v3-usde', match: p => p.project === 'aave-v3' && p.symbol === 'USDE' },
      { key: 'ondo-usdy', match: p => p.project === 'ondo-yield-assets' && p.symbol === 'USDY' },
      { key: 'lendle-meth', match: p => p.project === 'lendle-pooled-markets' && p.symbol === 'METH' },
      { key: 'lendle-cmeth', match: p => p.project === 'lendle-pooled-markets' && p.symbol === 'CMETH' },
      { key: 'fluxion-bill', match: p => p.project === 'fluxion-network' && p.symbol.includes('BILL') },
      { key: 'fluxion-opg', match: p => p.project === 'fluxion-network' && p.symbol.includes('OPG') },
    ]

    const results: CuratedYield[] = []
    for (const m of matchers) {
      const found = mantlePools.find(m.match)
      if (found) {
        const meta = CURATED_POOLS[m.key]
        results.push({
          ...found,
          displayName: `${meta.protocol} · ${meta.token}`,
          protocolName: meta.protocol,
          tokenName: meta.token,
          riskTier: meta.riskTier as 'Low' | 'Medium' | 'High',
          riskColor: RISK_COLORS[meta.riskTier as 'Low' | 'Medium' | 'High'],
          protocolLogo: meta.protocolLogo,
          tokenLogo: meta.tokenLogo,
        })
      }
    }

    return results.sort((a, b) => b.tvlUsd - a.tvlUsd)
  } catch {
    return []
  }
}

/// Fetch APY history for a specific pool
export async function getPoolHistory(poolId: string): Promise<YieldHistoryPoint[]> {
  try {
    const res = await fetch(`${LLAMA_BASE}/chart/${poolId}`, { next: { revalidate: 600 } })
    if (!res.ok) throw new Error('llama history failed')
    const data = await res.json()
    if (data.status !== 'success') return []
    return (data.data as Array<{ timestamp: string; tvlUsd: number; apy: number; apyBase: number; apyReward: number }>).map((p) => ({
      timestamp: new Date(p.timestamp).getTime(),
      tvlUsd: p.tvlUsd,
      apy: p.apy,
      apyBase: p.apyBase || 0,
      apyReward: p.apyReward || 0,
    }))
  } catch {
    return []
  }
}
