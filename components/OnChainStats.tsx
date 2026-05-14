'use client'

import { useState, useEffect } from 'react'
import Tooltip, { GLOSSARY } from './Tooltip'

interface Alpha {
  settledRounds: number
  alphaBps: number
  perRoundAvgAlphaBps: number
  annualizedAlphaPct: number
}

interface Stats {
  totalDecisions: number
  totalRounds: number
  aiWins: number
  humanWins: number
  aiWinRatePct: number
  currentMethAllocPct: number
  tvlUsd: number
  lastRebalanceAt: number
  alpha?: Alpha
}

const STAT_FALLBACK: Stats = {
  totalDecisions: 0, totalRounds: 0, aiWins: 0, humanWins: 0, aiWinRatePct: 0, currentMethAllocPct: 50,
  tvlUsd: 0, lastRebalanceAt: 0,
}

function formatTvl(usd: number): string {
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(2)}B`
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(2)}M`
  if (usd >= 1e3) return `$${(usd / 1e3).toFixed(1)}k`
  return `$${usd.toFixed(2)}`
}

export default function OnChainStats() {
  const [stats, setStats] = useState<Stats>(STAT_FALLBACK)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/onchain')
      .then(r => r.json())
      .then(data => { if (data.stats) setStats(data.stats) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const a = stats.alpha
  const hasAlpha = !!a && a.settledRounds > 0
  const alphaSign = hasAlpha && a!.alphaBps >= 0 ? '+' : ''
  const alphaValue = hasAlpha
    ? `${alphaSign}${a!.annualizedAlphaPct.toFixed(2)}%`
    : '—'
  const alphaDetail = hasAlpha
    ? `${alphaSign}${(a!.perRoundAvgAlphaBps).toFixed(0)} bps / round · ${a!.settledRounds} settled`
    : 'building track record'

  const items: Array<{ label: string; value: string; detail: string; term?: keyof typeof GLOSSARY }> = [
    { label: 'TVL', value: formatTvl(stats.tvlUsd), detail: 'mETH + USDY in agent', term: 'TVL' },
    {
      label: 'AI Win Rate',
      value: (stats.aiWins + stats.humanWins) > 0 ? `${stats.aiWinRatePct.toFixed(0)}%` : '—',
      detail: `${stats.aiWins}W / ${stats.humanWins}L · ${stats.aiWins + stats.humanWins} settled`,
    },
    { label: 'Alpha vs 50/50', value: alphaValue, detail: alphaDetail, term: 'alpha' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {items.map(({ label, value, detail, term }, i) => (
        <div
          key={label}
          className="card p-4 stat-card"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className={`text-2xl font-medium tracking-tight mono transition-opacity duration-300 ${loading ? 'opacity-40' : 'opacity-100'}`}>{value}</div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-2">
            {term ? <Tooltip content={GLOSSARY[term]} side="bottom">{label}</Tooltip> : label}
          </div>
          <div className="text-[10px] text-[var(--fg-dim)] mt-1">{detail}</div>
        </div>
      ))}
    </div>
  )
}
