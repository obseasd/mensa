'use client'

import { useState, useEffect } from 'react'

interface Stats {
  totalDecisions: number
  totalRounds: number
  aiWins: number
  humanWins: number
  aiWinRatePct: number
  currentMethAllocPct: number
}

const STAT_FALLBACK: Stats = {
  totalDecisions: 0, totalRounds: 0, aiWins: 0, humanWins: 0, aiWinRatePct: 0, currentMethAllocPct: 50,
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

  const items = [
    { label: 'mETH Allocation', value: `${stats.currentMethAllocPct}%`, detail: 'live on Mantle' },
    { label: 'AI Win Rate', value: stats.totalRounds > 0 ? `${stats.aiWinRatePct.toFixed(0)}%` : '—', detail: `${stats.totalRounds} rounds` },
    { label: 'Decisions Logged', value: stats.totalDecisions.toString(), detail: 'on-chain' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {items.map(({ label, value, detail }) => (
        <div key={label} className="card p-4">
          <div className={`text-2xl font-medium tracking-tight mono ${loading ? 'opacity-40' : ''}`}>{value}</div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-2">{label}</div>
          <div className="text-[10px] text-[var(--fg-dim)] mt-1">{detail}</div>
        </div>
      ))}
    </div>
  )
}
