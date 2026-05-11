'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ethers } from 'ethers'
import { ACTIVE_CHAIN } from '@/lib/chains'
import Tooltip, { GLOSSARY } from './Tooltip'

const BOUNTY_CLAIM_ABI = [
  { name: 'claim', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
] as const

const BADGE_NAMES = [
  'First Vote',
  'Beat AI 10x',
  'Beat AI 100x',
  '5-Win Streak',
  'Reputation 500',
  'Reputation 1000',
  'Top 10 Monthly',
]

interface Profile {
  address: string
  reputation: number
  weight: number
  totalVotes: number
  correctVotes: number
  winRatePct: number
  hasParticipated: boolean
  firstParticipation: number
  badgeCount: number
  badges: boolean[]
  claimableBounty: string
}

export default function ProfileView({ address }: { address: string }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const { address: myAddress } = useAccount()

  const isOwnProfile = myAddress?.toLowerCase() === address.toLowerCase()

  const { writeContract, data: claimTx, isPending: claiming } = useWriteContract()
  const { isLoading: confirming, isSuccess: claimed } = useWaitForTransactionReceipt({ hash: claimTx })

  useEffect(() => {
    fetch(`/api/profile/${address}`)
      .then(r => r.json())
      .then(data => { if (!data.error) setProfile(data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [address])

  if (loading) return <div className="card p-8 text-center text-sm text-[var(--fg-muted)]">Loading...</div>

  if (!profile) return <div className="card p-8 text-center text-sm text-[var(--fg-muted)]">Profile not found</div>

  const handleClaim = () => {
    writeContract({
      address: ACTIVE_CHAIN.contracts.bountyPool as `0x${string}`,
      abi: BOUNTY_CLAIM_ABI,
      functionName: 'claim',
    })
  }

  const claimableEth = ethers.formatEther(profile.claimableBounty)
  const hasClaimable = BigInt(profile.claimableBounty) > BigInt(0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-1">
          <h1 className="text-2xl font-medium tracking-tight">
            {isOwnProfile ? 'Your profile' : 'Voter profile'}
          </h1>
          {!isOwnProfile && (
            <Link
              href="/leaderboard"
              className="text-[11px] text-[var(--fg-muted)] hover:text-[var(--accent)] transition"
            >
              ← Leaderboard
            </Link>
          )}
        </div>
        <a
          href={`${ACTIVE_CHAIN.explorer}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs mono text-[var(--fg-muted)] hover:text-[var(--accent)] transition"
        >
          {address}
        </a>
      </div>

      {/* Empty state if this user has never voted */}
      {!profile.hasParticipated && (
        <div className="card p-8 text-center">
          <div className="text-sm font-medium mb-2">
            {isOwnProfile ? 'You haven’t voted yet' : 'This wallet hasn’t voted yet'}
          </div>
          <div className="text-xs text-[var(--fg-muted)] leading-relaxed max-w-md mx-auto mb-4">
            Reputation, badges, and bounty rewards all kick in once you cast your first vote on a
            tournament round. Pick your own mETH/USDY split, beat the AI when it settles, earn
            your way up the leaderboard.
          </div>
          {isOwnProfile && (
            <Link href="/tournament" className="inline-block btn-accent text-xs px-4 py-2">
              Vote on a round →
            </Link>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-2xl font-medium tracking-tight mono text-[var(--accent)]">{profile.reputation}</div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-2">
            <Tooltip content={<>
              <span className="font-medium">Reputation</span> — Score that accumulates on every
              tournament round you participate in. +up to 50 for beating the AI, −up to 25 for
              underperforming it. Determines your vote weight.
            </>} side="bottom">Reputation</Tooltip>
          </div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-medium tracking-tight mono">{profile.weight}x</div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-2">
            <Tooltip content={GLOSSARY.sqrtRep} side="bottom">Vote Weight</Tooltip>
          </div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-medium tracking-tight mono">{profile.winRatePct}%</div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-2">Win Rate</div>
          <div className="text-[10px] text-[var(--fg-dim)] mt-1">{profile.correctVotes}/{profile.totalVotes}</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-medium tracking-tight mono">{profile.badgeCount}</div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-2">Badges</div>
          <div className="text-[10px] text-[var(--fg-dim)] mt-1">of {BADGE_NAMES.length} total</div>
        </div>
      </div>

      {/* Claimable bounty — only show if own profile AND there's something to claim
          or if it's own profile but participated (encourages voting more) */}
      {isOwnProfile && profile.hasParticipated && (
        <div className="card p-5">
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-2">Claimable bounty</div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-3xl font-medium tracking-tight mono">
                {Number(claimableEth).toFixed(4)}{' '}
                <span className="text-base text-[var(--fg-muted)]">MNT</span>
              </div>
              <div className="text-[10px] text-[var(--fg-dim)] mt-1">
                {hasClaimable ? 'Earned from beating the AI' : 'No rewards available right now'}
              </div>
            </div>
            <button
              onClick={handleClaim}
              disabled={!hasClaimable || claiming || confirming || claimed}
              className="btn-accent text-sm"
            >
              {claimed ? 'Claimed' : claiming ? 'Confirm...' : confirming ? 'Confirming...' : hasClaimable ? 'Claim' : 'Nothing to claim'}
            </button>
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="card p-5">
        <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-3">Achievements</div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {BADGE_NAMES.map((name, i) => {
            const owned = profile.badges[i]
            return (
              <div
                key={i}
                className={`p-3 rounded-lg text-center transition ${
                  owned
                    ? 'border border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border border-[var(--border)] opacity-30'
                }`}
                title={owned ? `${name} unlocked` : `Locked: ${name}`}
              >
                <div className={`text-lg ${owned ? 'text-[var(--accent)]' : 'text-[var(--fg-dim)]'}`}>
                  {owned ? '✓' : '·'}
                </div>
                <div className={`text-[9px] mt-1 ${owned ? 'text-white' : 'text-[var(--fg-dim)]'}`}>
                  {name}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Activity stats */}
      {profile.hasParticipated && (
        <div className="card p-5 space-y-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Activity</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-[var(--fg-muted)] text-xs">First vote</div>
              <div className="mt-1">{new Date(profile.firstParticipation * 1000).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-[var(--fg-muted)] text-xs">Total votes cast</div>
              <div className="mt-1 mono">{profile.totalVotes}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
