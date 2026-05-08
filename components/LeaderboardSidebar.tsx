'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface YieldContext {
  methApr: number
  usdyApr: number
  methAllocPct: number
}

export default function LeaderboardSidebar() {
  const [ctx, setCtx] = useState<YieldContext | null>(null)

  useEffect(() => {
    fetch('/api/agent').then(r => r.json()).then(d => {
      if (d?.marketSnapshot) {
        setCtx({
          methApr: Number(d.marketSnapshot.mETHYieldAPR ?? 0),
          usdyApr: Number(d.marketSnapshot.usdyYieldAPR ?? 0),
          methAllocPct: Number(d.marketSnapshot.currentMethAllocPct ?? 50),
        })
      }
    }).catch(() => {})
  }, [])

  return (
    <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
      {/* How rewards work */}
      <div className="card p-5">
        <div className="text-[10px] uppercase tracking-wider text-[var(--accent)] mb-3">
          How rewards work
        </div>
        <div className="text-xs text-[var(--fg-muted)] leading-relaxed mb-4">
          Mensa charges a 15% performance fee on yield, never on principal.
          The fee is collected in MNT and routed to the bounty pool, then
          split on every settlement:
        </div>
        <div className="space-y-2.5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[var(--fg-muted)]">Round winners</span>
            <span className="text-sm mono text-[var(--accent)]">50%</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[var(--fg-muted)]">Reputation pool</span>
            <span className="text-sm mono">30%</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[var(--fg-muted)]">Ops</span>
            <span className="text-sm mono">20%</span>
          </div>
        </div>
        <div className="text-[10px] text-[var(--fg-dim)] mt-4 pt-3 border-t border-[var(--border)] leading-relaxed">
          Winners get paid pro-rata to <span className="mono">sqrt(reputation)</span> so
          whales and bots can&apos;t dominate. Reputation pool unlocks to top
          historical voters monthly.
        </div>
      </div>

      {/* Mensa earns from */}
      <div className="card p-5">
        <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-3">
          Mensa earns from
        </div>
        {ctx ? (
          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-[var(--fg-muted)]">mETH staking</span>
              <span className="text-sm mono">{ctx.methApr.toFixed(2)}%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-[var(--fg-muted)]">USDY T-bills</span>
              <span className="text-sm mono">{ctx.usdyApr.toFixed(2)}%</span>
            </div>
            <div className="flex items-baseline justify-between pt-2 border-t border-[var(--border)] mt-2">
              <span className="text-xs">Current blend</span>
              <span className="text-sm mono text-[var(--accent)]">
                {((ctx.methApr * ctx.methAllocPct + ctx.usdyApr * (100 - ctx.methAllocPct)) / 100).toFixed(2)}%
              </span>
            </div>
            <div className="text-[10px] text-[var(--fg-dim)] mt-1">
              at current {ctx.methAllocPct}% / {100 - ctx.methAllocPct}% split
            </div>
          </div>
        ) : (
          <div className="text-xs text-[var(--fg-dim)]">Loading yields...</div>
        )}
        <div className="text-[10px] text-[var(--fg-dim)] mt-4 pt-3 border-t border-[var(--border)] leading-relaxed">
          Other Mantle protocols (Aave, Lendle, Fluxion) are monitored but not yet in the allocation set. See <Link href="/docs" className="text-[var(--fg-muted)] hover:text-[var(--accent)] underline">/docs</Link>.
        </div>
      </div>

      {/* CTA */}
      <Link
        href="/tournament"
        className="card p-4 block hover:border-[var(--accent)] transition group"
      >
        <div className="text-[10px] uppercase tracking-wider text-[var(--accent)] mb-1">
          Join the tournament →
        </div>
        <div className="text-xs text-[var(--fg-muted)]">
          Vote your allocation. Beat the AI. Earn from the bounty pool.
        </div>
      </Link>
    </div>
  )
}
