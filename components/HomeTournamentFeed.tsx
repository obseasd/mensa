'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Round {
  id: number
  aiAllocMeth: number
  humanAllocMeth: number
  aiReturnBps: string
  humanReturnBps: string
  outcome: number
  settled: boolean
}

const OUTCOME_NAMES = ['Pending', 'AI', 'Human', 'Tie']

function formatBps(bpsStr: string): string {
  const bps = Number(bpsStr)
  const pct = bps / 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
}

export default function HomeTournamentFeed() {
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/onchain')
      .then(r => r.json())
      .then(d => { if (d.rounds) setRounds(d.rounds.slice(0, 5)) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="card p-8 text-center text-[var(--fg-muted)] text-sm">Loading rounds...</div>
    )
  }

  if (rounds.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-sm text-[var(--fg-muted)]">No rounds yet.</div>
        <div className="text-xs text-[var(--fg-dim)] mt-2">
          The first tournament round opens once the agent makes its next decision.
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-12 px-5 py-3 border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">
        <div className="col-span-2">Round</div>
        <div className="col-span-3">AI</div>
        <div className="col-span-3">Human</div>
        <div className="col-span-2">Winner</div>
        <div className="col-span-2 text-right">Status</div>
      </div>
      {rounds.map((r) => {
        const outcome = OUTCOME_NAMES[r.outcome] || 'Pending'
        const aiReturn = Number(r.aiReturnBps) / 100
        const humanReturn = Number(r.humanReturnBps) / 100
        return (
          <Link
            key={r.id}
            href="/tournament"
            className="grid grid-cols-12 px-5 py-4 border-b border-[var(--border)] last:border-b-0 text-sm hover:bg-white/[0.01] transition"
          >
            <div className="col-span-2 mono text-[var(--fg-muted)]">#{r.id}</div>
            <div className={`col-span-3 mono ${r.settled ? (aiReturn >= 0 ? 'text-[var(--accent)]' : 'text-red-400') : 'text-[var(--fg-muted)]'}`}>
              {r.settled ? formatBps(r.aiReturnBps) : `${r.aiAllocMeth}% mETH`}
            </div>
            <div className={`col-span-3 mono ${r.settled ? (humanReturn >= 0 ? 'text-[var(--accent)]' : 'text-red-400') : 'text-[var(--fg-muted)]'}`}>
              {r.settled ? formatBps(r.humanReturnBps) : '—'}
            </div>
            <div className="col-span-2">
              {r.settled ? (
                <span className={`text-xs px-2 py-0.5 rounded ${
                  outcome === 'AI' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'bg-white/5 text-white'
                }`}>{outcome}</span>
              ) : (
                <span className="text-xs text-[var(--fg-muted)]">—</span>
              )}
            </div>
            <div className="col-span-2 text-right text-[var(--fg-muted)] text-xs">
              {r.settled ? 'Settled' : 'Live'}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
