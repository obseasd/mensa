'use client'

import { useState, useEffect } from 'react'

interface Decision {
  action: string
  newMethAllocPct: number
  confidence: number
  reasoning: string
  marketSnapshot: {
    mETHYieldAPR: number
    usdyYieldAPR: number
    ethPrice: number
    currentMethAllocPct: number
  }
  proposedAt: number
}

const ACTION_COLORS: Record<string, string> = {
  REBALANCE: 'text-[var(--accent)] bg-[var(--accent-soft)]',
  HOLD: 'text-[var(--fg-muted)] bg-white/5',
  STAKE: 'text-blue-400 bg-blue-400/10',
  UNSTAKE: 'text-orange-400 bg-orange-400/10',
}

function timeAgo(ts: number) {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  return `${Math.floor(seconds / 60)}m ago`
}

export default function AgentLive() {
  const [decision, setDecision] = useState<Decision | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  // Re-render every 5s for fresh "X seconds ago" labels
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 5000)
    return () => clearInterval(i)
  }, [])

  // Fetch on mount + every 60s
  useEffect(() => {
    const fetchDecision = async () => {
      try {
        const res = await fetch('/api/agent')
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        setDecision(data)
      } catch (e) {
        console.error('[agent-live]', e)
      } finally {
        setLoading(false)
      }
    }
    fetchDecision()
    const i = setInterval(fetchDecision, 60000)
    return () => clearInterval(i)
  }, [])

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="pulse" />
          <span className="text-xs text-[var(--fg-muted)]">Agent reasoning...</span>
        </div>
        <div className="h-4 w-full bg-white/5 rounded animate-pulse mb-2" />
        <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse" />
      </div>
    )
  }

  if (!decision) {
    return (
      <div className="card p-6">
        <div className="text-sm text-[var(--fg-muted)]">Agent unavailable</div>
      </div>
    )
  }

  // tick is intentionally referenced to trigger re-renders for the time-ago label
  void tick

  const { action, newMethAllocPct, confidence, reasoning, marketSnapshot, proposedAt } = decision

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="pulse" />
          <span className="text-xs text-[var(--fg-muted)]">{timeAgo(proposedAt)}</span>
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded ${ACTION_COLORS[action] || ACTION_COLORS.HOLD}`}>
          {action}
        </span>
      </div>

      <p className="text-base leading-relaxed mb-4 text-[var(--fg)]">{reasoning}</p>

      <div className="grid grid-cols-4 gap-3 pt-4 border-t border-[var(--border)]">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Target mETH</div>
          <div className="text-sm font-medium mono mt-1">{newMethAllocPct}%</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Confidence</div>
          <div className="text-sm font-medium mono mt-1">{confidence}%</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">mETH APR</div>
          <div className="text-sm font-medium mono mt-1 text-[var(--accent)]">{marketSnapshot.mETHYieldAPR.toFixed(2)}%</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">USDY APR</div>
          <div className="text-sm font-medium mono mt-1 text-[var(--accent)]">{marketSnapshot.usdyYieldAPR.toFixed(2)}%</div>
        </div>
      </div>
    </div>
  )
}
