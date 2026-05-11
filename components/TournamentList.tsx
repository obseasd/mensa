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
  settleMethPrice?: string
  settleUsdyPrice?: string
}

interface AlphaSummary {
  settledRounds: number
  alphaBps: number
  perRoundAvgAlphaBps: number
  annualizedAlphaPct: number
}

interface Stats {
  totalRounds: number
  aiWins: number
  humanWins: number
  aiWinRatePct: number
  alpha?: AlphaSummary
  alphaCalibrated?: AlphaSummary
}

const REFERENCE_TVL_USD = 1000  // demo projection: "if treasury was $1000"

function countdown(settlementTime: number): string {
  const remaining = settlementTime - Math.floor(Date.now() / 1000)
  if (remaining <= 0) return 'ready to settle'
  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  if (h >= 24) return `settles in ${Math.floor(h / 24)}d ${h % 24}h`
  if (h > 0) return `settles in ${h}h ${m}m`
  return `settles in ${m}m`
}

function formatBps(bpsStr: string | number): string {
  const bps = typeof bpsStr === 'string' ? Number(bpsStr) : bpsStr
  const pct = bps / 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
}

function formatBpsRaw(bps: number): string {
  return `${bps >= 0 ? '+' : ''}${bps} bps`
}

function fmtUsd(n: number): string {
  if (!isFinite(n)) return '—'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : (n > 0 ? '+' : '')
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(2)}k`
  return `${sign}$${abs.toFixed(2)}`
}

function fmtPriceUsd(rawWith8Decimals: string | undefined): string {
  if (!rawWith8Decimals) return '—'
  const n = Number(rawWith8Decimals) / 1e8
  if (!isFinite(n) || n === 0) return '—'
  return n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(4)}`
}

function AllocBar({ methPct }: { methPct: number }) {
  return (
    <div className="flex h-1 rounded-full overflow-hidden bg-[var(--border)] w-16">
      <div className="bg-[var(--accent)]" style={{ width: `${methPct}%` }} />
      <div className="bg-white/30" style={{ width: `${100 - methPct}%` }} />
    </div>
  )
}

function RoundDetail({ r }: { r: Round }) {
  const startMeth = r.startMethPrice ? Number(r.startMethPrice) : 0
  const settleMeth = r.settleMethPrice ? Number(r.settleMethPrice) : 0
  const startUsdy = r.startUsdyPrice ? Number(r.startUsdyPrice) : 0
  const settleUsdy = r.settleUsdyPrice ? Number(r.settleUsdyPrice) : 0

  const methReturnBps = startMeth > 0 ? Math.round(((settleMeth - startMeth) / startMeth) * 10000) : 0
  const usdyReturnBps = startUsdy > 0 ? Math.round(((settleUsdy - startUsdy) / startUsdy) * 10000) : 0

  const aiBps = Number(r.aiReturnBps)
  const baseBps = Number(r.humanReturnBps)
  const alphaBps = aiBps - baseBps

  const aiUsdImpact = (aiBps / 10000) * REFERENCE_TVL_USD
  const baseUsdImpact = (baseBps / 10000) * REFERENCE_TVL_USD
  const alphaUsd = aiUsdImpact - baseUsdImpact

  const optimalAllocMeth = methReturnBps >= usdyReturnBps ? 100 : 0
  const optimalReturnBps = optimalAllocMeth === 100 ? methReturnBps : usdyReturnBps

  return (
    <div className="px-5 py-4 border-b border-[var(--border)] bg-white/[0.015] text-xs space-y-4">
      {/* Market move */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-2">Market move during round</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-3" style={{ background: 'var(--bg-elevated)' }}>
            <div className="text-[var(--fg-muted)] text-[10px] mb-1">mETH</div>
            <div className="flex items-baseline gap-2">
              <span className="mono">{fmtPriceUsd(r.startMethPrice)}</span>
              <span className="text-[var(--fg-dim)]">→</span>
              <span className="mono">{fmtPriceUsd(r.settleMethPrice)}</span>
              <span className={`mono ml-auto ${methReturnBps >= 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>
                {formatBps(methReturnBps)}
              </span>
            </div>
          </div>
          <div className="card p-3" style={{ background: 'var(--bg-elevated)' }}>
            <div className="text-[var(--fg-muted)] text-[10px] mb-1">USDY</div>
            <div className="flex items-baseline gap-2">
              <span className="mono">{fmtPriceUsd(r.startUsdyPrice)}</span>
              <span className="text-[var(--fg-dim)]">→</span>
              <span className="mono">{fmtPriceUsd(r.settleUsdyPrice)}</span>
              <span className={`mono ml-auto ${usdyReturnBps >= 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>
                {formatBps(usdyReturnBps)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Strategy comparison */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-2">Strategy comparison</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-3" style={{ background: 'var(--bg-elevated)' }}>
            <div className="text-[var(--fg-muted)] text-[10px] mb-1">Mensa AI</div>
            <div className="text-sm mono mb-1">{r.aiAllocMeth}% mETH · {100 - r.aiAllocMeth}% USDY</div>
            <div className={`mono ${aiBps >= 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>
              {formatBps(aiBps)} <span className="text-[var(--fg-dim)]">({formatBpsRaw(aiBps)})</span>
            </div>
          </div>
          <div className="card p-3" style={{ background: 'var(--bg-elevated)' }}>
            <div className="text-[var(--fg-muted)] text-[10px] mb-1">Baseline 50/50</div>
            <div className="text-sm mono mb-1">{r.humanAllocMeth}% mETH · {100 - r.humanAllocMeth}% USDY</div>
            <div className={`mono ${baseBps >= 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>
              {formatBps(baseBps)} <span className="text-[var(--fg-dim)]">({formatBpsRaw(baseBps)})</span>
            </div>
          </div>
          <div className="card p-3" style={{ background: 'var(--bg-elevated)' }}>
            <div className="text-[var(--fg-muted)] text-[10px] mb-1">Hindsight optimal</div>
            <div className="text-sm mono mb-1">{optimalAllocMeth}% mETH · {100 - optimalAllocMeth}% USDY</div>
            <div className={`mono ${optimalReturnBps >= 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>
              {formatBps(optimalReturnBps)} <span className="text-[var(--fg-dim)]">({formatBpsRaw(optimalReturnBps)})</span>
            </div>
          </div>
        </div>
      </div>

      {/* $ Impact at reference TVL */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-2">
          $ impact (if treasury held ${REFERENCE_TVL_USD.toLocaleString()})
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-3" style={{ background: 'var(--bg-elevated)' }}>
            <div className="text-[var(--fg-muted)] text-[10px] mb-1">AI return</div>
            <div className={`text-sm mono ${aiUsdImpact >= 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>
              {fmtUsd(aiUsdImpact)}
            </div>
          </div>
          <div className="card p-3" style={{ background: 'var(--bg-elevated)' }}>
            <div className="text-[var(--fg-muted)] text-[10px] mb-1">Baseline return</div>
            <div className={`text-sm mono ${baseUsdImpact >= 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>
              {fmtUsd(baseUsdImpact)}
            </div>
          </div>
          <div className="card p-3" style={{ background: 'var(--bg-elevated)' }}>
            <div className="text-[var(--fg-muted)] text-[10px] mb-1">Alpha (AI saved)</div>
            <div className={`text-sm mono ${alphaUsd >= 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>
              {fmtUsd(alphaUsd)} <span className="text-[var(--fg-dim)]">({formatBpsRaw(alphaBps)})</span>
            </div>
          </div>
        </div>
        <div className="text-[10px] text-[var(--fg-dim)] mt-2">
          Treasury TVL during this round: $0 (nobody had deposited yet). Numbers above show the {' '}
          <span className="text-[var(--fg-muted)]">hypothetical</span> outcome if a $1k principal were active.
        </div>
      </div>
    </div>
  )
}

export default function TournamentList() {
  const [rounds, setRounds] = useState<Round[]>([])
  const [stats, setStats] = useState<Stats>({ totalRounds: 0, aiWins: 0, humanWins: 0, aiWinRatePct: 0 })
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)

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
  // 'since calibrated' = since the memory loop kicked in (round #1 was cold start).
  // Falls back to full alpha if we don't have it yet.
  const alphaC = stats.alphaCalibrated ?? stats.alpha
  const alphaSign = alphaC && alphaC.alphaBps >= 0 ? '+' : ''
  const hasAlpha = !!alphaC && alphaC.settledRounds > 0

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'AI Win Rate', value: stats.totalRounds > 0 ? `${aiWinRate.toFixed(0)}%` : '—', detail: `${stats.aiWins}W / ${stats.humanWins}L`, accent: true },
          {
            label: 'Alpha / round (since calibrated)',
            value: hasAlpha ? `${alphaSign}${alphaC!.perRoundAvgAlphaBps.toFixed(0)} bps` : '—',
            detail: hasAlpha
              ? `${alphaSign}${alphaC!.alphaBps} bps cum. · ${alphaC!.settledRounds} round${alphaC!.settledRounds > 1 ? 's' : ''}`
              : 'memory loop active from round #2',
            accent: true,
          },
          { label: 'AI Wins', value: stats.aiWins, detail: 'on-chain' },
          { label: 'Total Rounds', value: stats.totalRounds, detail: `${stats.totalRounds - stats.aiWins - stats.humanWins} pending` },
        ].map(({ label, value, detail, accent }) => (
          <div key={label} className="card p-4">
            <div className={`text-2xl font-medium tracking-tight mono ${accent ? 'text-[var(--accent)]' : ''}`}>
              {loading ? '—' : value}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-2">{label}</div>
            <div className="text-[10px] text-[var(--fg-dim)] mt-1">{detail}</div>
          </div>
        ))}
      </div>

      {/* Win bar */}
      {stats.totalRounds > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between text-xs text-[var(--fg-muted)] mb-2">
            <span>AI <span className="text-white mono">{stats.aiWins}</span></span>
            <span>Baseline 50/50 <span className="text-white mono">{stats.humanWins}</span></span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-[var(--border)]">
            <div className="bg-[var(--accent)]" style={{ width: `${aiWinRate}%` }} />
            <div className="bg-white/40" style={{ width: `${100 - aiWinRate}%` }} />
          </div>
        </div>
      )}

      {/* Pending rounds — vote UI */}
      {(() => {
        if (loading) return null
        const pending = rounds.filter(r => !r.settled)
        if (pending.length === 0) {
          const lastRound = rounds[0]
          const lastSettleTime = lastRound ? Number(lastRound.settlementTime) : 0
          const hoursAgo = lastSettleTime > 0 ? Math.max(0, Math.round((Date.now() / 1000 - lastSettleTime) / 3600)) : 0
          return (
            <div>
              <h2 className="text-sm uppercase tracking-wider text-[var(--fg-muted)] mb-3">
                Pending — vote against the AI
              </h2>
              <div className="card p-6">
                <div className="text-sm font-medium mb-2">No round open right now</div>
                <div className="text-xs text-[var(--fg-muted)] leading-relaxed">
                  A new round opens every time Mensa rebalances — that&apos;s when Claude&apos;s
                  decision changes by enough basis points to clear the cooldown. The most recent
                  round closed{hoursAgo > 0 ? ` ${hoursAgo}h ago` : ' just now'}. The GitHub Actions
                  cron runs every 30 minutes; the next time Claude calls REBALANCE, a fresh round
                  will appear here for voting (24h window).
                </div>
              </div>
            </div>
          )
        }
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
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm uppercase tracking-wider text-[var(--fg-muted)]">Settled history</h2>
              <span className="text-[10px] text-[var(--fg-dim)]">click a row for details</span>
            </div>
            {settled.length === 0 ? (
              <div className="card p-8 text-center">
                <div className="text-sm text-[var(--fg-muted)]">No settled rounds yet.</div>
                <div className="text-xs text-[var(--fg-dim)] mt-2">
                  Each round runs for 24h. Once a round&apos;s timer is up, anyone with the settler role
                  can close it and the outcome is recorded here.
                </div>
              </div>
            ) : (
              <div className="card overflow-x-auto">
                <div className="min-w-[640px]">
                <div className="grid grid-cols-[40px_1fr_100px_100px_100px_80px] gap-3 px-5 py-3 border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">
                  <div>Round</div>
                  <div>AI Allocation</div>
                  <div className="text-right">AI Return</div>
                  <div className="text-right">Baseline</div>
                  <div className="text-right">Alpha</div>
                  <div className="text-right">Winner</div>
                </div>

                {settled.map((r) => {
                  const aiBps = Number(r.aiReturnBps)
                  const baseBps = Number(r.humanReturnBps)
                  const alphaBps = aiBps - baseBps
                  const isOpen = expandedId === r.id
                  const winnerLabel = r.outcome === 1 ? 'AI' : r.outcome === 2 ? 'Baseline' : 'Tie'

                  return (
                    <div key={r.id}>
                      <button
                        onClick={() => setExpandedId(isOpen ? null : r.id)}
                        className="w-full grid grid-cols-[40px_1fr_100px_100px_100px_80px] gap-3 px-5 py-3 border-b border-[var(--border)] last:border-b-0 text-sm hover:bg-white/[0.02] transition text-left"
                      >
                        <div className="mono text-[var(--fg-muted)]">#{r.id}</div>
                        <div className="flex items-center gap-3 min-w-0">
                          <AllocBar methPct={r.aiAllocMeth} />
                          <span className="mono text-xs whitespace-nowrap">
                            <span className="text-[var(--accent)]">{r.aiAllocMeth}%</span>
                            <span className="text-[var(--fg-dim)]"> mETH · </span>
                            <span className="text-white">{100 - r.aiAllocMeth}%</span>
                            <span className="text-[var(--fg-dim)]"> USDY</span>
                          </span>
                        </div>
                        <div className={`mono text-right ${aiBps >= 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>
                          {formatBps(aiBps)}
                        </div>
                        <div className={`mono text-right ${baseBps >= 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>
                          {formatBps(baseBps)}
                        </div>
                        <div className={`mono text-right text-xs ${alphaBps >= 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>
                          {formatBpsRaw(alphaBps)}
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] px-2 py-0.5 rounded ${
                            r.outcome === 1 ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'bg-white/5 text-white'
                          }`}>{winnerLabel}</span>
                        </div>
                      </button>
                      {isOpen && <RoundDetail r={r} />}
                    </div>
                  )
                })}
                </div>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
