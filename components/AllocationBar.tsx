'use client'

import { useState, useEffect } from 'react'

export default function AllocationBar() {
  const [methPct, setMethPct] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/onchain')
      .then(r => r.json())
      .then(d => { if (d.stats) setMethPct(d.stats.currentMethAllocPct) })
      .catch(console.error)
  }, [])

  if (methPct === null) {
    return <div className="card p-5 h-24 animate-pulse bg-white/[0.02]" />
  }

  const usdyPct = 100 - methPct

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">
          Current allocation
        </span>
        <span className="text-[10px] text-[var(--fg-dim)]">live on Mantle</span>
      </div>

      <div className="flex h-3 rounded-full overflow-hidden bg-[var(--border)] mb-3">
        <div
          className="transition-all"
          style={{ width: `${methPct}%`, background: 'var(--accent)' }}
        />
        <div
          className="transition-all"
          style={{ width: `${usdyPct}%`, background: 'rgba(255,255,255,0.30)' }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm" style={{ background: 'var(--accent)' }} />
          <span className="text-[var(--fg-muted)] text-xs">mETH</span>
          <span className="mono">{methPct}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="mono">{usdyPct}%</span>
          <span className="text-[var(--fg-muted)] text-xs">USDY</span>
          <span className="w-2 h-2 rounded-sm bg-white/30" />
        </div>
      </div>
    </div>
  )
}
