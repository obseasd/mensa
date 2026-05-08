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

function fmtMnt(weiStr: string, digits = 4): string {
  try { return Number(ethers.formatEther(weiStr)).toFixed(digits) } catch { return '0' }
}

export default function HumanLeaderboard() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [bounty, setBounty] = useState<BountyStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => {
        if (d.profiles) setProfiles(d.profiles)
        if (d.bounty) setBounty(d.bounty)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      {/* Bounty pool — prominent */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--accent)]">Bounty pool</div>
            <div className="text-[10px] text-[var(--fg-dim)] mt-1">Funded by 15% perf fee · split 50/30/20</div>
          </div>
          <Link href="/tournament" className="text-[10px] text-[var(--fg-muted)] hover:text-[var(--accent)] transition">
            Join tournament →
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-3xl font-medium tracking-tight mono text-[var(--accent)]">
              {bounty ? fmtMnt(bounty.winnerPoolBalance, 4) : '—'}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-2">Available</div>
            <div className="text-[10px] text-[var(--fg-dim)] mt-1">MNT in pool</div>
          </div>
          <div>
            <div className="text-2xl font-medium tracking-tight mono">
              {bounty ? fmtMnt(bounty.totalCollected, 4) : '—'}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-2">Collected</div>
            <div className="text-[10px] text-[var(--fg-dim)] mt-1">cumulative MNT</div>
          </div>
          <div>
            <div className="text-2xl font-medium tracking-tight mono">
              {bounty ? fmtMnt(bounty.totalDistributed, 4) : '—'}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-2">Distributed</div>
            <div className="text-[10px] text-[var(--fg-dim)] mt-1">paid to humans</div>
          </div>
        </div>
      </div>

      {/* Top humans table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm uppercase tracking-wider text-[var(--fg-muted)]">Top humans</h2>
          <span className="text-[10px] text-[var(--fg-dim)]">
            {profiles.length} voter{profiles.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="card p-8 text-center text-sm text-[var(--fg-muted)]">Loading...</div>
        ) : profiles.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-sm font-medium mb-2">No voters yet</div>
            <div className="text-xs text-[var(--fg-muted)] leading-relaxed max-w-md mx-auto mb-4">
              Each tournament round opens with the AI&apos;s allocation. Vote your own,
              and if your allocation outperforms the AI&apos;s when the round settles,
              you earn a slice of the bounty pool above. Reputation accumulates with every win.
            </div>
            <Link
              href="/tournament"
              className="inline-block btn-accent text-xs px-4 py-2"
            >
              Be the first to challenge the AI →
            </Link>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="grid grid-cols-[40px_1fr_80px_80px_80px_60px_80px] gap-3 px-5 py-3 border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">
              <div>Rank</div>
              <div>Address</div>
              <div className="text-right">Reputation</div>
              <div className="text-right">Win Rate</div>
              <div className="text-right">Votes</div>
              <div className="text-right">Badges</div>
              <div className="text-right">Claimable</div>
            </div>
            {profiles.map((p, i) => (
              <Link
                key={p.address}
                href={`/profile/${p.address}`}
                className="grid grid-cols-[40px_1fr_80px_80px_80px_60px_80px] gap-3 px-5 py-3 border-b border-[var(--border)] last:border-b-0 text-sm hover:bg-white/[0.02] transition"
              >
                <div className="text-[var(--fg-dim)] mono">#{i + 1}</div>
                <div className="mono truncate">{shortAddr(p.address)}</div>
                <div className="mono text-right text-[var(--accent)]">{p.reputation}</div>
                <div className={`mono text-right ${p.winRatePct >= 50 ? 'text-[var(--accent)]' : 'text-[var(--fg-muted)]'}`}>
                  {p.winRatePct}%
                </div>
                <div className="mono text-right text-[var(--fg-muted)]">
                  {p.correctVotes}/{p.totalVotes}
                </div>
                <div className="mono text-right text-[var(--fg-muted)]">
                  {p.badgeCount > 0 ? `${p.badgeCount}★` : '—'}
                </div>
                <div className={`mono text-right ${BigInt(p.claimableBounty || '0') > BigInt(0) ? 'text-[var(--accent)]' : 'text-[var(--fg-dim)]'}`}>
                  {fmtMnt(p.claimableBounty || '0', 3)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
