'use client'

import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'
import BacktestChart from '@/components/BacktestChart'

interface StrategyStats {
  finalReturnBps: number
  maxDrawdownBps: number
  volatilityBps: number
  sharpeLike: number
}

interface BacktestResult {
  days: number
  points: Array<{
    ts: number
    ethPrice: number
    methPrice: number
    usdyPrice: number
    mensaAlloc: number
    mensaCumBps: number
    hold5050CumBps: number
    allMethCumBps: number
    allUsdyCumBps: number
  }>
  summary: {
    mensa: StrategyStats
    hold5050: StrategyStats
    allMeth: StrategyStats
    allUsdy: StrategyStats
    alphaVsBaseline: number
    annualizedAlphaPct: number
    winRateVs5050: number
  }
}

const PERIODS = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '180d', days: 180 },
  { label: '1y', days: 365 },
]

function fmtBps(bps: number): string {
  const pct = bps / 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
}

function StatRow({ label, value, color, mono = true }: { label: string; value: string; color?: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-[var(--fg-muted)]">{label}</span>
      <span className={`${mono ? 'mono' : ''} text-sm`} style={color ? { color } : {}}>{value}</span>
    </div>
  )
}

export default function BacktestPage() {
  const [days, setDays] = useState(90)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setErr(null)
    fetch(`/api/backtest?days=${days}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setErr(d.error)
        else setResult(d)
      })
      .catch(e => setErr(String(e)))
      .finally(() => setLoading(false))
  }, [days])

  return (
    <div className="min-h-screen relative">
      <Nav />
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-medium tracking-tight mb-2">Backtest</h1>
          <p className="text-sm text-[var(--fg-muted)] max-w-2xl">
            Mensa&apos;s allocation strategy replayed on real historical ETH prices vs three baselines:
            passive 50/50 hold, all mETH, all USDY. Six on-chain rounds isn&apos;t a track record —
            this is.
          </p>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-2 mb-6">
          {PERIODS.map(p => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`text-xs px-3 py-1.5 rounded-md transition ${
                days === p.days
                  ? 'bg-[var(--accent)] text-black'
                  : 'border border-[var(--border-strong)] text-[var(--fg-muted)] hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
          <span className="text-[10px] text-[var(--fg-dim)] ml-2">
            ETH price history via Coingecko · cached 30 min
          </span>
        </div>

        {/* Loading / Error / Empty */}
        {loading && (
          <div className="card p-12 text-center text-sm text-[var(--fg-muted)]">
            Running simulation over {days} days...
          </div>
        )}

        {err && !loading && (
          <div className="card p-8 text-center text-sm text-red-400">
            Backtest failed: {err}
          </div>
        )}

        {result && !loading && (
          <div className="space-y-6">
            {/* Headline alpha */}
            <div className="card p-6">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--accent)] mb-2">
                    Mensa alpha vs passive 50/50 — {result.days} days
                  </div>
                  <div className="flex items-baseline gap-3">
                    <div
                      className="text-4xl font-medium tracking-tight mono"
                      style={{ color: result.summary.alphaVsBaseline >= 0 ? 'var(--accent)' : '#ef4444' }}
                    >
                      {fmtBps(result.summary.alphaVsBaseline)}
                    </div>
                    <div className="text-xs text-[var(--fg-muted)]">
                      {result.summary.annualizedAlphaPct >= 0 ? '+' : ''}
                      {result.summary.annualizedAlphaPct.toFixed(2)}% annualized
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-1">
                    Win rate vs baseline
                  </div>
                  <div className="text-2xl font-medium mono">
                    {result.summary.winRateVs5050}%
                  </div>
                  <div className="text-[10px] text-[var(--fg-dim)] mt-1">
                    of days mensa &gt; 50/50
                  </div>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="card p-5">
              <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-4">
                Cumulative return — {result.days} days
              </div>
              <BacktestChart points={result.points} />
            </div>

            {/* Per-strategy stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { name: 'Mensa AI', stats: result.summary.mensa, color: 'var(--accent)' },
                { name: 'Passive 50/50', stats: result.summary.hold5050, color: 'rgba(255,255,255,0.7)' },
                { name: '100% mETH', stats: result.summary.allMeth, color: '#fbbf24' },
                { name: '100% USDY', stats: result.summary.allUsdy, color: '#7c8ca8' },
              ].map(({ name, stats, color }) => (
                <div key={name} className="card p-4">
                  <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color }}>{name}</div>
                  <div className="space-y-2.5">
                    <StatRow
                      label="Final return"
                      value={fmtBps(stats.finalReturnBps)}
                      color={stats.finalReturnBps >= 0 ? 'var(--accent)' : '#ef4444'}
                    />
                    <StatRow
                      label="Max drawdown"
                      value={`-${(stats.maxDrawdownBps / 100).toFixed(2)}%`}
                      color="#fbbf24"
                    />
                    <StatRow
                      label="Volatility (ann.)"
                      value={`${(stats.volatilityBps / 100).toFixed(2)}%`}
                    />
                    <StatRow
                      label="Sharpe-like"
                      value={stats.sharpeLike.toFixed(2)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Methodology */}
            <div className="card p-5">
              <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-3">
                Methodology
              </div>
              <div className="text-xs text-[var(--fg-muted)] leading-relaxed space-y-2">
                <p>
                  <span className="text-white">ETH price history</span> from Coingecko, resampled
                  to one point per UTC day. mETH price = ETH × rate(t), where rate compounds at
                  4% APY. USDY price compounds at 4.5% APY from $1.00 at t=0.
                </p>
                <p>
                  <span className="text-white">Mensa&apos;s decision rule</span> in this backtest is a
                  deterministic heuristic that mimics what Claude does live: tilts allocation based
                  on 7-day and 30-day ETH momentum + the structural mETH-vs-USDY yield spread,
                  clamped to <code className="text-white mono">[10%, 90%]</code>, with a 10-percentage-point
                  minimum threshold to avoid churn. We don&apos;t call Claude N times for the
                  backtest — same logic, deterministic execution, no API spend.
                </p>
                <p>
                  <span className="text-white">No lookahead.</span> Each day&apos;s allocation
                  is decided using only data through that day; today&apos;s return is computed with
                  yesterday&apos;s allocation. Standard backtest hygiene.
                </p>
                <p className="text-[var(--fg-dim)]">
                  Yields and the mETH/ETH base rate are held stationary over the window. Real APYs
                  drift but for a 90-day backtest the price action dominates the alpha signal —
                  introducing yield drift would add noise without changing the qualitative result.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
