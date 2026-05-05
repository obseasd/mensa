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

// Curated list — the protocols/tokens we care about for Mensa allocation
// These are the assets the AI could realistically allocate into
export const CURATED_POOLS = {
  // mETH / staking
  'mantle-meth': { protocol: 'Mantle Native Staking', token: 'mETH', riskTier: 'Low' },
  // Lending markets (Aave v3 on Mantle)
  'aave-v3-usdc': { protocol: 'Aave v3', token: 'USDC', riskTier: 'Low' },
  'aave-v3-usdt0': { protocol: 'Aave v3', token: 'USDT0', riskTier: 'Low' },
  'aave-v3-usde': { protocol: 'Aave v3', token: 'USDe', riskTier: 'Medium' },
  // RWA
  'ondo-usdy': { protocol: 'Ondo Finance', token: 'USDY', riskTier: 'Low' },
  // Lendle
  'lendle-meth': { protocol: 'Lendle', token: 'mETH', riskTier: 'Medium' },
  'lendle-cmeth': { protocol: 'Lendle', token: 'cmETH', riskTier: 'Medium' },
  // High yield (degen tier)
  'fluxion-bill': { protocol: 'Fluxion Network', token: 'BILL/USDT0', riskTier: 'High' },
  'fluxion-opg': { protocol: 'Fluxion Network', token: 'OPG/USDT0', riskTier: 'High' },
} as const

const RISK_COLORS = {
  Low: '#3CC2A4',
  Medium: '#fbbf24',
  High: '#ef4444',
}

export interface CuratedYield extends YieldPool {
  displayName: string
  riskTier: 'Low' | 'Medium' | 'High'
  riskColor: string
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
          riskTier: meta.riskTier as 'Low' | 'Medium' | 'High',
          riskColor: RISK_COLORS[meta.riskTier as 'Low' | 'Medium' | 'High'],
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
