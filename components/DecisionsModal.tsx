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

export default function DecisionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/onchain')
      .then(r => r.json())
      .then(d => { if (d.decisions) setDecisions(d.decisions) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6">
      <div className="absolute inset-0 modal-backdrop" onClick={onClose} />
      <div className="relative modal-panel w-full md:max-w-3xl max-h-[90vh] md:max-h-[85vh] flex flex-col bg-[var(--bg-card)] border border-[var(--border)] rounded-t-2xl md:rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--bg-card)] z-10">
          <div>
            <h2 className="text-base font-medium">All decisions</h2>
            <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
              {decisions.length} on-chain {decisions.length === 1 ? 'decision' : 'decisions'} — newest first
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--fg-muted)] hover:text-white transition w-8 h-8 rounded-md hover:bg-white/5 flex items-center justify-center text-lg"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-white/[0.02] rounded animate-pulse" />
              ))}
            </div>
          ) : decisions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-sm text-[var(--fg-muted)]">No decisions logged yet.</div>
              <div className="text-xs text-[var(--fg-dim)] mt-2">
                The agent will start posting decisions once the agent loop runs.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {decisions.map((d) => {
                const action = ACTION_NAMES[d.action] || 'UNKNOWN'
                return (
                  <div key={d.id} className="card p-4 fade-in">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] mono text-[var(--fg-muted)]">#{d.id}</span>
                        <span className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded ${ACTION_COLORS[action] || ACTION_COLORS.HOLD}`}>
                          {action}
                        </span>
                        <span className="text-[11px] text-[var(--fg-muted)]">{timeAgo(d.timestamp)}</span>
                      </div>
                      <div className="text-[11px] text-[var(--fg-muted)]">
                        Conf: <span className="text-white mono">{d.confidence}%</span>
                      </div>
                    </div>

                    <p className="text-[13px] leading-relaxed text-[var(--fg)] mb-3">{d.reasoning}</p>

                    <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] text-[11px] text-[var(--fg-muted)]">
                      <a
                        href={`${ACTIVE_CHAIN.explorer}/tx/${d.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono hover:text-[var(--accent)] transition truncate max-w-[260px]"
                      >
                        {d.txHash.slice(0, 14)}...{d.txHash.slice(-6)}
                      </a>
                      <span className="font-mono">Block {d.block.toLocaleString()}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
