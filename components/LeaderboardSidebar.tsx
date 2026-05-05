'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'

interface Profile {
  address: string
  reputation: number
  weight: number
  totalVotes: number
  correctVotes: number
  winRatePct: number
  badgeCount: number
  claimableBounty: string
}

interface BountyStats {
  totalCollected: string
  totalDistributed: string
  winnerPoolBalance: string
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export default function LeaderboardSidebar() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [bounty, setBounty] = useState<BountyStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(data => {
        if (data.profiles) setProfiles(data.profiles)
        if (data.bounty) setBounty(data.bounty)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
      {/* Bounty pool stat */}
      {bounty && (
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">
            Bounty pool
          </div>
          <div className="text-2xl font-medium tracking-tight mono mt-1">
            {ethers.formatEther(bounty.winnerPoolBalance).slice(0, 8)} <span className="text-sm text-[var(--fg-muted)]">MNT</span>
          </div>
          <div className="text-[10px] text-[var(--fg-dim)] mt-1">
            funded by 15% perf fee on yield
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[var(--border)] text-[10px]">
            <div>
              <div className="text-[var(--fg-muted)]">Collected</div>
              <div className="mono mt-1">{ethers.formatEther(bounty.totalCollected).slice(0, 6)}</div>
            </div>
            <div>
              <div className="text-[var(--fg-muted)]">Distributed</div>
              <div className="mono mt-1">{ethers.formatEther(bounty.totalDistributed).slice(0, 6)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Top humans */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">
            Top humans
          </div>
          <span className="text-[10px] text-[var(--fg-dim)]">
            {profiles.length} voter{profiles.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-white/[0.02] rounded animate-pulse" />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-xs text-[var(--fg-muted)]">No voters yet</div>
            <Link href="/tournament" className="text-[10px] text-[var(--accent)] hover:underline mt-2 inline-block">
              Be the first to challenge the AI →
            </Link>
          </div>
        ) : (
          <div className="space-y-1.5">
            {profiles.slice(0, 10).map((p, i) => (
              <Link
                key={p.address}
                href={`/profile/${p.address}`}
                className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-white/[0.02] transition"
              >
                <span className="text-[10px] text-[var(--fg-dim)] mono w-5">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs mono truncate">{shortAddr(p.address)}</div>
                  <div className="text-[9px] text-[var(--fg-muted)]">
                    rep <span className="text-white mono">{p.reputation}</span> · win{' '}
                    <span className={p.winRatePct >= 50 ? 'text-[var(--accent)]' : 'text-[var(--fg-muted)]'}>
                      {p.winRatePct}%
                    </span>
                  </div>
                </div>
                {p.badgeCount > 0 && (
                  <span className="text-[10px] text-[var(--accent)] mono">
                    {p.badgeCount}★
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
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
