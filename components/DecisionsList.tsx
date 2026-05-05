'use client'

import { useState, useEffect } from 'react'
import { ACTIVE_CHAIN } from '@/lib/chains'

interface Decision {
  id: number
  timestamp: number
  action: number
  confidence: number
  reasoning: string
  txHash: string
  block: number
}

const ACTION_NAMES = ['REBALANCE', 'STAKE', 'UNSTAKE', 'DEPOSIT', 'WITHDRAW', 'HOLD']

const ACTION_COLORS: Record<string, string> = {
  REBALANCE: 'text-[var(--accent)] bg-[var(--accent-soft)]',
  STAKE: 'text-blue-400 bg-blue-400/10',
  UNSTAKE: 'text-orange-400 bg-orange-400/10',
  HOLD: 'text-[var(--fg-muted)] bg-white/5',
  DEPOSIT: 'text-blue-400 bg-blue-400/10',
  WITHDRAW: 'text-orange-400 bg-orange-400/10',
}

function timeAgo(ts: number) {
  const seconds = Math.floor(Date.now() / 1000 - ts)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function DecisionsList() {
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/decisions')
      .then(r => r.json())
      .then(data => { if (data.decisions) setDecisions(data.decisions) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="h-4 w-24 bg-white/5 rounded mb-3" />
            <div className="h-4 w-full bg-white/5 rounded mb-2" />
            <div className="h-4 w-3/4 bg-white/5 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (decisions.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-sm text-[var(--fg-muted)]">No decisions logged yet.</div>
        <div className="text-xs text-[var(--fg-dim)] mt-2">The agent will start posting decisions once activated.</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {decisions.map((d) => {
        const action = ACTION_NAMES[d.action] || 'UNKNOWN'
        return (
          <div key={d.id} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-[var(--fg-muted)]">#{d.id}</span>
                <span className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded ${ACTION_COLORS[action] || ACTION_COLORS.HOLD}`}>
                  {action}
                </span>
                <span className="text-xs text-[var(--fg-muted)]">{timeAgo(d.timestamp)}</span>
              </div>
              <div className="text-xs text-[var(--fg-muted)]">
                Confidence: <span className="text-white mono">{d.confidence}%</span>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-[var(--fg)] mb-4">{d.reasoning}</p>

            <div className="flex items-center justify-between text-xs text-[var(--fg-muted)] pt-3 border-t border-[var(--border)]">
              <a
                href={`${ACTIVE_CHAIN.explorer}/tx/${d.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono hover:text-[var(--accent)] transition truncate max-w-[300px]"
              >
                {d.txHash.slice(0, 18)}...{d.txHash.slice(-6)}
              </a>
              <span className="font-mono">Block {d.block.toLocaleString()}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
