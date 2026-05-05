'use client'

import { useState, useEffect } from 'react'
import VoteRound from './VoteRound'
import SettleButton from './SettleButton'

interface Round {
  id: number
  startTime: number
  settlementTime: number
  aiAllocMeth: number
  humanAllocMeth: number
  aiReturnBps: string
  humanReturnBps: string
  outcome: number
  settled: boolean
  startMethPrice?: string
  startUsdyPrice?: string
}

function countdown(settlementTime: number): string {
  const remaining = settlementTime - Math.floor(Date.now() / 1000)
  if (remaining <= 0) return 'ready to settle'
  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  if (h >= 24) return `settles in ${Math.floor(h / 24)}d ${h % 24}h`
  if (h > 0) return `settles in ${h}h ${m}m`
  return `settles in ${m}m`
}

interface Stats {
  totalRounds: number
  aiWins: number
  humanWins: number
  aiWinRatePct: number
}

const OUTCOME_NAMES = ['Pending', 'AI', 'Human', 'Tie']

function formatBps(bpsStr: string): string {
  const bps = Number(bpsStr)
  const pct = bps / 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
}

export default function TournamentList() {
  const [rounds, setRounds] = useState<Round[]>([])
  const [stats, setStats] = useState<Stats>({ totalRounds: 0, aiWins: 0, humanWins: 0, aiWinRatePct: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/onchain')
      .then(r => r.json())
      .then(data => {
        if (data.rounds) setRounds(data.rounds)
        if (data.stats) setStats(data.stats)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const aiWinRate = stats.totalRounds > 0 ? stats.aiWinRatePct : 0

  return (
    <div className="space-y-8">
      {/* How it works */}
      <div className="card p-5">
        <div className="text-[10px] uppercase tracking-wider text-[var(--accent)] mb-3">How it works</div>
        <div className="grid md:grid-cols-3 gap-4 text-xs">
          <div>
            <div className="text-[10px] mono text-[var(--fg-dim)] mb-1">01</div>
            <div className="text-sm font-medium mb-1">A round opens</div>
            <div className="text-[var(--fg-muted)] leading-relaxed">
              Every time Mensa rebalances, a round opens with the AI&apos;s allocation snapshot
              and the current mETH/USDY prices.
            </div>
          </div>
          <div>
            <div className="text-[10px] mono text-[var(--fg-dim)] mb-1">02</div>
            <div className="text-sm font-medium mb-1">You vote your allocation</div>
            <div className="text-[var(--fg-muted)] leading-relaxed">
              Pick your own mETH/USDY split. Live simulation shows projected returns vs the AI.
              Vote weight scales with sqrt(reputation) — bots can&apos;t dominate.
            </div>
          </div>
          <div>
            <div className="text-[10px] mono text-[var(--fg-dim)] mb-1">03</div>
            <div className="text-sm font-medium mb-1">Round settles in 24h</div>
            <div className="text-[var(--fg-muted)] leading-relaxed">
              Whoever&apos;s allocation produced the better return wins on-chain. Human winners
              earn from the bounty pool funded by the 15% performance fee on yield.
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'AI Win Rate', value: stats.totalRounds > 0 ? `${aiWinRate.toFixed(0)}%` : '—', accent: true },
          { label: 'AI Wins', value: stats.aiWins },
          { label: 'Human Wins', value: stats.humanWins },
          { label: 'Total Rounds', value: stats.totalRounds },
        ].map(({ label, value, accent }) => (
          <div key={label} className="card p-4">
            <div className={`text-2xl font-medium tracking-tight mono ${accent ? 'text-[var(--accent)]' : ''}`}>
              {loading ? '—' : value}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-2">{label}</div>
          </div>
        ))}
      </div>

      {/* Win bar */}
      {stats.totalRounds > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between text-xs text-[var(--fg-muted)] mb-2">
            <span>AI <span className="text-white mono">{stats.aiWins}</span></span>
            <span>Human <span className="text-white mono">{stats.humanWins}</span></span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-[var(--border)]">
            <div className="bg-[var(--accent)]" style={{ width: `${aiWinRate}%` }} />
            <div className="bg-white/40" style={{ width: `${100 - aiWinRate}%` }} />
          </div>
        </div>
      )}

      {/* Pending rounds — vote UI */}
      {(() => {
        const pending = rounds.filter(r => !r.settled)
        if (pending.length === 0) return null
        return (
          <div>
            <h2 className="text-sm uppercase tracking-wider text-[var(--fg-muted)] mb-3">
              Pending — vote against the AI
            </h2>
            <div className="grid gap-3">
              {pending.map((r) => (
                <div key={r.id} className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[var(--fg-muted)] px-1">
                    <span className="mono">Round #{r.id}</span>
                    <div className="flex items-center gap-3">
                      <span>AI bet {r.aiAllocMeth}% mETH</span>
                      <span className="text-[var(--accent)] mono">{countdown(r.settlementTime)}</span>
                    </div>
                  </div>
                  <VoteRound
                    roundId={r.id}
                    aiAllocMeth={r.aiAllocMeth}
                    startMethPrice={r.startMethPrice ?? '0'}
                    startUsdyPrice={r.startUsdyPrice ?? '0'}
                  />
                  <SettleButton
                    roundId={r.id}
                    startMethPrice={r.startMethPrice ?? '0'}
                    startUsdyPrice={r.startUsdyPrice ?? '0'}
                  />
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Settled history */}
      {(() => {
        if (loading) {
          return <div className="card p-8 text-center text-[var(--fg-muted)] text-sm">Loading rounds...</div>
        }
        const settled = rounds.filter(r => r.settled)
        return (
          <div>
            <h2 className="text-sm uppercase tracking-wider text-[var(--fg-muted)] mb-3">
              Settled history
            </h2>
            {settled.length === 0 ? (
              <div className="card p-8 text-center">
                <div className="text-sm text-[var(--fg-muted)]">No settled rounds yet.</div>
                <div className="text-xs text-[var(--fg-dim)] mt-2">
                  Each round runs for 24h. Once a round&apos;s timer is up, anyone with the settler role
                  can close it and the outcome (AI or Human win) is recorded here.
                </div>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="grid grid-cols-12 px-5 py-3 border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">
                  <div className="col-span-1">Round</div>
                  <div className="col-span-2">AI Alloc</div>
                  <div className="col-span-2">Human Alloc</div>
                  <div className="col-span-2">AI Return</div>
                  <div className="col-span-2">Human Return</div>
                  <div className="col-span-2">Winner</div>
                  <div className="col-span-1 text-right">Status</div>
                </div>

                {settled.map((r) => {
                  const outcome = OUTCOME_NAMES[r.outcome] || 'Pending'
                  const aiReturn = Number(r.aiReturnBps) / 100
                  const humanReturn = Number(r.humanReturnBps) / 100

                  return (
                    <div
                      key={r.id}
                      className="grid grid-cols-12 px-5 py-3 border-b border-[var(--border)] last:border-b-0 text-sm hover:bg-white/[0.01] transition"
                    >
                      <div className="col-span-1 mono text-[var(--fg-muted)]">#{r.id}</div>
                      <div className="col-span-2 mono">{r.aiAllocMeth}% mETH</div>
                      <div className="col-span-2 mono text-[var(--fg-muted)]">{r.humanAllocMeth}% mETH</div>
                      <div className={`col-span-2 mono ${aiReturn >= 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>
                        {formatBps(r.aiReturnBps)}
                      </div>
                      <div className={`col-span-2 mono ${humanReturn >= 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>
                        {formatBps(r.humanReturnBps)}
                      </div>
                      <div className="col-span-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          outcome === 'AI' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'bg-white/5 text-white'
                        }`}>{outcome}</span>
                      </div>
                      <div className="col-span-1 text-right text-xs text-[var(--fg-muted)]">Settled</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
