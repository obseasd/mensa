'use client'

import { useState, useEffect } from 'react'

interface YieldPool {
  pool: string
  project: string
  symbol: string
  apy: number
  apyBase: number | null
  apyReward: number | null
  tvlUsd: number
  displayName: string
  riskTier: 'Low' | 'Medium' | 'High'
  riskColor: string
}

interface HistoryPoint {
  timestamp: number
  apy: number
}

type Timeframe = '24h' | '7d' | '30d' | 'all'

const TIMEFRAME_DAYS: Record<Timeframe, number> = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
  'all': 365,
}

function formatTvl(usd: number): string {
  if (usd > 1e9) return `$${(usd / 1e9).toFixed(2)}B`
  if (usd > 1e6) return `$${(usd / 1e6).toFixed(2)}M`
  if (usd > 1e3) return `$${(usd / 1e3).toFixed(0)}k`
  return `$${usd.toFixed(0)}`
}

function MiniChart({ history, timeframe }: { history: HistoryPoint[]; timeframe: Timeframe }) {
  const cutoff = Date.now() - TIMEFRAME_DAYS[timeframe] * 24 * 60 * 60 * 1000
  const filtered = history.filter(h => h.timestamp >= cutoff)

  if (filtered.length < 2) {
    return <div className="text-[9px] text-[var(--fg-dim)] py-2">No history</div>
  }

  const apys = filtered.map(h => h.apy)
  const min = Math.min(...apys)
  const max = Math.max(...apys)
  const range = max - min || 1

  const points = filtered.map((h, i) => {
    const x = (i / (filtered.length - 1)) * 100
    const y = 100 - ((h.apy - min) / range) * 80 - 10
    return `${x},${y}`
  }).join(' ')

  const last = filtered[filtered.length - 1]?.apy || 0
  const first = filtered[0]?.apy || 0
  const delta = last - first

  return (
    <div className="space-y-1.5">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-12">
        <polyline
          fill="none"
          stroke={delta >= 0 ? '#3CC2A4' : '#ef4444'}
          strokeWidth="1.5"
          points={points}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex items-center justify-between text-[9px] text-[var(--fg-muted)] mono">
        <span>{min.toFixed(2)}%</span>
        <span className={delta >= 0 ? 'text-[var(--accent)]' : 'text-red-400'}>
          {delta >= 0 ? '+' : ''}{delta.toFixed(2)}%
        </span>
        <span>{max.toFixed(2)}%</span>
      </div>
    </div>
  )
}

function PoolCard({ pool }: { pool: YieldPool }) {
  const [timeframe, setTimeframe] = useState<Timeframe>('7d')
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!expanded) return
    if (history.length > 0) return
    setLoadingHistory(true)
    fetch(`/api/yields/${pool.pool}`)
      .then(r => r.json())
      .then(d => { if (d.history) setHistory(d.history) })
      .catch(console.error)
      .finally(() => setLoadingHistory(false))
  }, [expanded, pool.pool, history.length])

  return (
    <div
      className="card p-4 cursor-pointer transition"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: `${pool.riskColor}15`, color: pool.riskColor }}
            >
              {pool.riskTier}
            </span>
            <span className="text-sm font-medium truncate">{pool.displayName}</span>
          </div>
          <div className="text-[10px] text-[var(--fg-dim)] mt-1">TVL {formatTvl(pool.tvlUsd)}</div>
        </div>
        <div className="text-right ml-3">
          <div className="text-2xl font-medium tracking-tight mono text-[var(--accent)]">
            {pool.apy.toFixed(2)}%
          </div>
          <div className="text-[9px] text-[var(--fg-muted)]">APY</div>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-3">
          {/* Timeframe selector */}
          <div className="flex gap-1">
            {(['24h', '7d', '30d', 'all'] as const).map((tf) => (
              <button
                key={tf}
                onClick={(e) => { e.stopPropagation(); setTimeframe(tf) }}
                className={`text-[10px] px-2 py-1 rounded transition ${
                  timeframe === tf
                    ? 'bg-white text-black'
                    : 'border border-[var(--border)] text-[var(--fg-muted)] hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart */}
          {loadingHistory ? (
            <div className="text-[10px] text-[var(--fg-dim)] py-4 text-center">Loading...</div>
          ) : (
            <MiniChart history={history} timeframe={timeframe} />
          )}

          {/* Breakdown */}
          {(pool.apyBase !== null || pool.apyReward !== null) && (
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="card p-2" style={{ background: 'var(--bg-elevated)' }}>
                <div className="text-[var(--fg-muted)]">Base APY</div>
                <div className="mono mt-1">{(pool.apyBase || 0).toFixed(2)}%</div>
              </div>
              <div className="card p-2" style={{ background: 'var(--bg-elevated)' }}>
                <div className="text-[var(--fg-muted)]">Reward APY</div>
                <div className="mono mt-1">{(pool.apyReward || 0).toFixed(2)}%</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function YieldProtocols() {
  const [pools, setPools] = useState<YieldPool[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/yields')
      .then(r => r.json())
      .then(d => { if (d.pools) setPools(d.pools) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium mb-1">Mantle yield markets</h2>
          <p className="text-xs text-[var(--fg-muted)]">Live APY for protocols Mensa can allocate to. Click a pool for history.</p>
        </div>
        <span className="text-[10px] text-[var(--fg-dim)]">via DefiLlama · 5min cache</span>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-[var(--fg-muted)]">Loading yields...</div>
      ) : pools.length === 0 ? (
        <div className="card p-8 text-center text-sm text-[var(--fg-muted)]">No pools available</div>
      ) : (
        <div className="space-y-2">
          {pools.map(p => (
            <PoolCard key={p.pool} pool={p} />
          ))}
        </div>
      )}
    </div>
  )
}
