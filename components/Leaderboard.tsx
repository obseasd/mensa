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
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function Leaderboard() {
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
    <div className="space-y-8">
      {/* Bounty pool stats */}
      {bounty && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4">
            <div className="text-2xl font-medium tracking-tight mono">
              {ethers.formatEther(bounty.winnerPoolBalance)}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-2">
              Winner Pool
            </div>
            <div className="text-[10px] text-[var(--fg-dim)] mt-1">MNT available to win</div>
          </div>
          <div className="card p-4">
            <div className="text-2xl font-medium tracking-tight mono">
              {ethers.formatEther(bounty.totalCollected)}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-2">
              Total Collected
            </div>
            <div className="text-[10px] text-[var(--fg-dim)] mt-1">15% of yield generated</div>
          </div>
          <div className="card p-4">
            <div className="text-2xl font-medium tracking-tight mono">
              {ethers.formatEther(bounty.totalDistributed)}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-2">
              Distributed
            </div>
            <div className="text-[10px] text-[var(--fg-dim)] mt-1">Paid out to winners</div>
          </div>
        </div>
      )}

      {/* Leaderboard table */}
      {loading ? (
        <div className="card p-8 text-center text-[var(--fg-muted)] text-sm">Loading...</div>
      ) : profiles.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-sm text-[var(--fg-muted)]">No voters yet.</div>
          <div className="text-xs text-[var(--fg-dim)] mt-2">Be the first to challenge the AI in the Tournament.</div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">
            <div className="col-span-1">Rank</div>
            <div className="col-span-4">Wallet</div>
            <div className="col-span-2">Reputation</div>
            <div className="col-span-2">Weight</div>
            <div className="col-span-2">Win Rate</div>
            <div className="col-span-1 text-right">Badges</div>
          </div>
          {profiles.map((p, i) => (
            <Link
              key={p.address}
              href={`/profile/${p.address}`}
              className="grid grid-cols-12 px-5 py-3 border-b border-[var(--border)] last:border-b-0 text-sm hover:bg-white/[0.01] transition"
            >
              <div className="col-span-1 mono text-[var(--fg-muted)]">#{i + 1}</div>
              <div className="col-span-4 mono">{shortAddr(p.address)}</div>
              <div className="col-span-2 mono">{p.reputation}</div>
              <div className="col-span-2 mono text-[var(--fg-muted)]">x{p.weight}</div>
              <div className={`col-span-2 mono ${p.winRatePct >= 50 ? 'text-[var(--accent)]' : 'text-[var(--fg-muted)]'}`}>
                {p.winRatePct}% ({p.correctVotes}/{p.totalVotes})
              </div>
              <div className="col-span-1 text-right text-[var(--fg-muted)]">{p.badgeCount}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
