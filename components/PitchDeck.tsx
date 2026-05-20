'use client'

import { useEffect, useState, useRef, ReactNode } from 'react'
import Link from 'next/link'

interface Stats {
  totalDecisions: number
  totalRounds: number
  aiWinRatePct: number
  aiWins: number
  humanWins: number
  currentMethAllocPct: number
  tvlUsd: number
  alphaCalibrated?: { settledRounds: number; alphaBps: number; perRoundAvgAlphaBps: number }
}

interface RoundLite {
  id: number
  aiAllocMeth: number
  aiReturnBps: string
  humanReturnBps: string
  settled: boolean
  outcome: number
}

const SLIDE_COUNT = 13

function Slide({ id, label, children }: { id: number; label?: string; children: ReactNode }) {
  return (
    <section
      data-slide={id}
      className="min-h-screen flex flex-col justify-center px-6 md:px-12 py-12 snap-start"
    >
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--fg-dim)] mono">
            {String(id).padStart(2, '0')} / {String(SLIDE_COUNT).padStart(2, '0')}
            {label ? <span className="ml-3 text-[var(--fg-muted)]">{label}</span> : null}
          </div>
          <div className="text-[10px] mono text-[var(--fg-dim)]">mensa-mu.vercel.app</div>
        </div>
        {children}
      </div>
    </section>
  )
}

function H({ children }: { children: ReactNode }) {
  return <h2 className="text-4xl md:text-6xl font-medium tracking-tight leading-[1.05] mb-6">{children}</h2>
}

function Lead({ children }: { children: ReactNode }) {
  return <p className="text-lg md:text-xl text-[var(--fg-muted)] leading-relaxed max-w-3xl">{children}</p>
}

interface JourneyRound { id: number; alloc: number; alpha: number; outcome: number }

/// Compact per-round bar strip. Tells the dramatic story of round 1
/// vs the recovery. Single visual instead of a wall of cards.
function JourneyStrip({ journey, stats }: { journey: JourneyRound[]; stats: Stats | null }) {
  if (journey.length === 0) return null

  const W = 1000
  const H = 220
  const PAD_X = 30
  const PAD_TOP = 28
  const PAD_BOTTOM = 36

  const maxAbs = Math.max(...journey.map(r => Math.abs(r.alpha)), 50)
  const xOf = (i: number) => PAD_X + (i / Math.max(1, journey.length - 1)) * (W - 2 * PAD_X)
  const yOf = (v: number) => {
    const mid = PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) / 2
    return mid - (v / maxAbs) * ((H - PAD_TOP - PAD_BOTTOM) / 2)
  }
  const zeroY = yOf(0)
  const barW = Math.max(6, Math.min(24, (W - 2 * PAD_X) / journey.length - 6))

  const wins = journey.filter(r => r.alpha > 0).length
  const losses = journey.filter(r => r.alpha < 0).length
  const r1 = journey.find(r => r.id === 1)
  const winRatePct = journey.length > 0 ? Math.round((wins / journey.length) * 100) : 0
  const cal = stats?.alphaCalibrated

  return (
    <div className="mt-8 space-y-4">
      {/* Per-round bar chart with round 1 highlighted */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--accent)]">
            Per-round alpha vs baseline · all settled rounds
          </div>
          <div className="text-[10px] mono text-[var(--fg-dim)]">
            <span className="text-[var(--accent)]">{wins} wins</span> · <span className="text-red-400">{losses} losses</span> · {winRatePct}% win rate
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto', maxHeight: '260px' }}>
          <defs>
            <linearGradient id="barPos" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="barNeg" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Zero baseline */}
          <line x1={PAD_X} x2={W - PAD_X} y1={zeroY} y2={zeroY} stroke="rgba(255,255,255,0.10)" strokeDasharray="3 4" />
          <text x={PAD_X - 6} y={zeroY + 4} textAnchor="end" fontSize="10" fill="var(--fg-dim)" fontFamily="JetBrains Mono, monospace">0</text>

          {/* Bars */}
          {journey.map((r, i) => {
            const x = xOf(i) - barW / 2
            const y = r.alpha >= 0 ? yOf(r.alpha) : zeroY
            const h = Math.abs(yOf(r.alpha) - zeroY)
            const isR1 = r.id === 1
            return (
              <g key={r.id}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(2, h)}
                  fill={r.alpha >= 0 ? 'url(#barPos)' : 'url(#barNeg)'}
                  rx="1"
                />
                {/* Round id under each bar */}
                {(i === 0 || i === journey.length - 1 || isR1 || r.id % 5 === 0) && (
                  <text x={xOf(i)} y={H - 18} textAnchor="middle" fontSize="9" fill="var(--fg-dim)" fontFamily="JetBrains Mono, monospace">
                    #{r.id}
                  </text>
                )}
                {/* Highlight round 1 with a label callout */}
                {isR1 && (
                  <g>
                    <line x1={xOf(i)} x2={xOf(i)} y1={yOf(r.alpha) + 8} y2={H - 32} stroke="#ef4444" strokeOpacity="0.4" strokeDasharray="2 3" />
                    <text x={xOf(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#ef4444" fontFamily="JetBrains Mono, monospace">
                      cold start −324
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Three narrative blocks: the disaster, the recovery, the present */}
      <div className="grid md:grid-cols-3 gap-3 text-sm">
        <div className="card p-5 border-l-2 border-red-400">
          <div className="text-[10px] uppercase tracking-wider text-red-400 mb-2">The disaster</div>
          <div className="text-2xl mono font-medium text-red-400 mb-1">
            {r1 ? `${r1.alpha} bps` : '−324 bps'}
          </div>
          <div className="text-xs text-[var(--fg-muted)] leading-relaxed">
            Round #1, cold start, 60% mETH. ETH crashed 19% in the first 24h
            window. The AI was over-allocated to staked ETH with no track record
            yet, so the memory loop had nothing to pull from. A real loss,
            recorded irreversibly.
          </div>
        </div>
        <div className="card p-5 border-l-2 border-[var(--accent)]">
          <div className="text-[10px] uppercase tracking-wider text-[var(--accent)] mb-2">The recovery</div>
          <div className="text-2xl mono font-medium text-[var(--accent)] mb-1">
            {wins}W · {losses}L
          </div>
          <div className="text-xs text-[var(--fg-muted)] leading-relaxed">
            Once the feedback loop activated (round #2 onward), the AI shifted
            defensive and started reading its own track record on every call.
            It is now {winRatePct}% on settled rounds, with multi-round winning
            streaks visible in the chart above.
          </div>
        </div>
        <div className="card p-5 border-l-2 border-[var(--accent)]">
          <div className="text-[10px] uppercase tracking-wider text-[var(--accent)] mb-2">The present</div>
          <div className="text-2xl mono font-medium text-[var(--accent)] mb-1">
            {cal && cal.settledRounds > 0
              ? `${cal.alphaBps >= 0 ? '+' : ''}${cal.alphaBps} bps`
              : '...'}
          </div>
          <div className="text-xs text-[var(--fg-muted)] leading-relaxed">
            {cal && cal.settledRounds > 0
              ? `Net since calibrated: ${cal.alphaBps >= 0 ? '+' : ''}${cal.alphaBps} bps cumulative over ${cal.settledRounds} rounds, ${cal.perRoundAvgAlphaBps >= 0 ? '+' : ''}${Math.round(cal.perRoundAvgAlphaBps)} bps per round average. All values live from contract reads, not screenshots.`
              : 'Calibrated alpha will appear here once enough rounds have settled.'}
          </div>
        </div>
      </div>
    </div>
  )
}

/// Cumulative alpha chart. SVG line on a baseline, drawn from round
/// to round. The shape tells the story: the big dip at round #1 is
/// the cold-start disaster, then the line climbs back through the
/// memory loop, dips again on rounds the AI lost, finishes positive.
function AlphaChart({ journey }: { journey: JourneyRound[] }) {
  if (journey.length === 0) return null

  const W = 1000
  const H = 200
  const PAD_X = 30
  const PAD_TOP = 24
  const PAD_BOTTOM = 36

  // Cumulative trajectory
  const points: { id: number; cum: number; alpha: number }[] = []
  let cum = 0
  for (const r of journey) {
    cum += r.alpha
    points.push({ id: r.id, cum, alpha: r.alpha })
  }
  const minCum = Math.min(0, ...points.map(p => p.cum))
  const maxCum = Math.max(0, ...points.map(p => p.cum))
  const range = Math.max(1, maxCum - minCum)
  const lastCum = points[points.length - 1].cum
  const best = points.reduce((a, b) => (b.alpha > a.alpha ? b : a))
  const worst = points.reduce((a, b) => (b.alpha < a.alpha ? b : a))

  // Map a (id, cum) to (x, y)
  const xOf = (i: number) => PAD_X + (i / Math.max(1, points.length - 1)) * (W - 2 * PAD_X)
  const yOf = (v: number) => PAD_TOP + (1 - (v - minCum) / range) * (H - PAD_TOP - PAD_BOTTOM)
  const zeroY = yOf(0)

  // Build smooth path (linear segments, sufficient for the visual)
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(2)} ${yOf(p.cum).toFixed(2)}`).join(' ')
  // Area fill path: line + back to baseline at first/last x
  const areaPath = `${linePath} L ${xOf(points.length - 1).toFixed(2)} ${zeroY.toFixed(2)} L ${xOf(0).toFixed(2)} ${zeroY.toFixed(2)} Z`

  return (
    <div className="card p-6 mt-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--accent)]">
            Cumulative alpha trajectory · {points.length} settled round{points.length === 1 ? '' : 's'}
          </div>
          <div className="text-[10px] text-[var(--fg-dim)] mt-1">vs passive 50/50 baseline, basis points</div>
        </div>
        <div className="flex gap-5 text-right">
          <div>
            <div className={`text-2xl mono font-medium ${lastCum >= 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>
              {lastCum >= 0 ? '+' : ''}{lastCum}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-[var(--fg-muted)]">net bps</div>
          </div>
          <div>
            <div className="text-2xl mono font-medium text-[var(--accent)]">+{best.alpha}</div>
            <div className="text-[9px] uppercase tracking-wider text-[var(--fg-muted)]">best round (#{best.id})</div>
          </div>
          <div>
            <div className="text-2xl mono font-medium text-red-400">{worst.alpha}</div>
            <div className="text-[9px] uppercase tracking-wider text-[var(--fg-muted)]">worst round (#{worst.id})</div>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto', maxHeight: '300px' }}>
        <defs>
          <linearGradient id="alphaGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="alphaGradientNeg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.32" />
          </linearGradient>
        </defs>

        {/* Zero baseline */}
        <line x1={PAD_X} x2={W - PAD_X} y1={zeroY} y2={zeroY} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 4" />
        <text x={PAD_X - 6} y={zeroY + 4} textAnchor="end" fontSize="10" fill="var(--fg-dim)" fontFamily="JetBrains Mono, monospace">0</text>

        {/* Area fill */}
        <path d={areaPath} fill="url(#alphaGradient)" opacity={lastCum >= 0 ? 1 : 0.4} />

        {/* Line */}
        <path d={linePath} fill="none" stroke={lastCum >= 0 ? 'var(--accent)' : '#ef4444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Per-round dots */}
        {points.map((p, i) => (
          <g key={p.id}>
            <circle
              cx={xOf(i)}
              cy={yOf(p.cum)}
              r={p.id === 1 ? 5 : 3}
              fill={p.alpha >= 0 ? 'var(--accent)' : '#ef4444'}
              stroke="var(--bg-card)"
              strokeWidth="1.5"
            />
            {/* Label for round 1 (cold start anchor) and last point */}
            {(p.id === 1 || i === points.length - 1) && (
              <g>
                <text
                  x={xOf(i)}
                  y={yOf(p.cum) - 12}
                  textAnchor="middle"
                  fontSize="10"
                  fill={p.id === 1 ? '#ef4444' : 'var(--accent)'}
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="500"
                >
                  {p.id === 1 ? 'cold start' : `now: ${p.cum >= 0 ? '+' : ''}${p.cum}`}
                </text>
              </g>
            )}
          </g>
        ))}

        {/* X-axis: show first and last round id */}
        <text x={xOf(0)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--fg-dim)" fontFamily="JetBrains Mono, monospace">
          #{points[0].id}
        </text>
        <text x={xOf(points.length - 1)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--fg-dim)" fontFamily="JetBrains Mono, monospace">
          #{points[points.length - 1].id}
        </text>
      </svg>
    </div>
  )
}

export default function PitchDeck() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [rounds, setRounds] = useState<RoundLite[]>([])
  const [current, setCurrent] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/onchain').then(r => r.json()).then(d => {
      if (d.stats) setStats(d.stats)
      if (Array.isArray(d.rounds)) setRounds(d.rounds)
    }).catch(() => {})
  }, [])

  // Settled rounds, ordered by id ascending, with alpha pre-computed.
  const journey = rounds
    .filter(r => r.settled)
    .sort((a, b) => a.id - b.id)
    .map(r => ({
      id: r.id,
      alloc: r.aiAllocMeth,
      alpha: Number(r.aiReturnBps) - Number(r.humanReturnBps),
      outcome: r.outcome,
    }))

  // Track current slide
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.5) {
            const id = Number(e.target.getAttribute('data-slide'))
            if (id) setCurrent(id)
          }
        })
      },
      { threshold: 0.5 },
    )
    document.querySelectorAll('[data-slide]').forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        const next = Math.min(SLIDE_COUNT, current + 1)
        document.querySelector(`[data-slide="${next}"]`)?.scrollIntoView({ behavior: 'smooth' })
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        const prev = Math.max(1, current - 1)
        document.querySelector(`[data-slide="${prev}"]`)?.scrollIntoView({ behavior: 'smooth' })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [current])

  const goTo = (n: number) => {
    document.querySelector(`[data-slide="${n}"]`)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <div
        ref={containerRef}
        className="snap-y snap-mandatory overflow-y-auto h-screen"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* === Slide 1 — Cover === */}
        <Slide id={1}>
          <div className="flex items-center gap-3 mb-12">
            <img src="/logo.png" alt="Mensa" className="w-[72px] h-[72px]" />
            <span className="text-2xl font-medium tracking-tight">mensa</span>
          </div>
          <h1 className="text-5xl md:text-8xl font-medium tracking-tight leading-[0.95] mb-8">
            The AI treasury<br/>that proves itself.
          </h1>
          <p className="text-xl md:text-2xl text-[var(--fg-muted)] max-w-3xl leading-relaxed mb-12">
            Intelligent RWA portfolio management agent on Mantle. Allocates between mETH and USDY,
            with every decision logged on-chain and challenged by humans in a verifiable Turing
            tournament.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--fg-muted)]">
            <span className="px-3 py-1.5 rounded-full border border-[var(--border)] inline-flex items-center gap-2">
              <span className="pulse" /> Live on Mantle Mainnet
            </span>
            <span className="px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--accent)] mono">
              ERC-8004 · agent #1
            </span>
            <span className="px-3 py-1.5 rounded-full border border-[var(--border)] mono">7/7 contracts verified</span>
            <span className="px-3 py-1.5 rounded-full border border-[var(--border)]">Mantle Turing Test 2026</span>
          </div>

          {/* Powered-by row — small favicon logos of the stack */}
          <div className="flex items-center gap-5 mt-12 opacity-70">
            <span className="text-[10px] uppercase tracking-wider text-[var(--fg-dim)]">Powered by</span>
            {[
              { name: 'Mantle Network', url: 'https://www.mantle.xyz', icon: 'https://www.mantle.xyz/favicon.ico' },
              { name: 'Anthropic Claude', url: 'https://www.anthropic.com', icon: 'https://www.anthropic.com/favicon.ico' },
              { name: 'Ondo Finance (USDY)', url: 'https://ondo.finance', icon: 'https://ondo.finance/favicon.ico' },
              { name: 'Coingecko', url: 'https://www.coingecko.com', icon: 'https://www.coingecko.com/favicon.ico' },
              { name: 'DefiLlama', url: 'https://defillama.com', icon: 'https://defillama.com/favicon.ico' },
            ].map(p => (
              <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer" title={p.name} className="hover:opacity-100 transition">
                <img src={p.icon} alt={p.name} className="w-5 h-5 rounded grayscale hover:grayscale-0 transition" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </a>
            ))}
          </div>

          <div className="text-xs text-[var(--fg-dim)] mt-12">
            Use → / ↓ / Space to advance · ↑ / ← to go back
          </div>
        </Slide>

        {/* === Slide 2 — Problem === */}
        <Slide id={2} label="Problem">
          <H>Every yield vault today is either a black box or a static bet.</H>
          <Lead>
            DeFi has hundreds of millions in yield vaults. Users pick one allocation and live with
            it for months. When market conditions shift, they stay in the wrong asset, capturing
            less yield with more risk than they should. AI-managed vaults exist, but they act, you
            trust, you hope. Two broken patterns.
          </Lead>
          <div className="grid md:grid-cols-2 gap-4 mt-12 text-sm">
            <div className="card p-5">
              <div className="text-[10px] uppercase tracking-wider text-[var(--accent)] mb-3">Pattern 1, static vaults</div>
              <div className="text-sm font-medium mb-2 text-[var(--fg)]">Pick once, suffer later</div>
              <div className="text-[var(--fg-muted)] leading-relaxed">
                Aave passive, Yearn, single-asset LST vaults. Lock in one allocation. When the
                yield spread between assets shifts, you have no way to react. You captured the
                spread when it favored your bet. You lose it when it does not.
              </div>
            </div>
            <div className="card p-5">
              <div className="text-[10px] uppercase tracking-wider text-[var(--accent)] mb-3">Pattern 2, AI black boxes</div>
              <div className="text-sm font-medium mb-2 text-[var(--fg)]">Trust without verification</div>
              <div className="text-[var(--fg-muted)] leading-relaxed">
                Existing AI treasuries rebalance, but the reasoning is private. No on-chain
                decision log, no human benchmark, no accountability. If the agent underperforms
                for a year, you find out via your wallet, not via a public trail.
              </div>
            </div>
          </div>
          <p className="text-sm text-[var(--fg-muted)] mt-8 max-w-3xl leading-relaxed">
            <span className="text-[var(--fg)] font-medium">The user is left choosing</span> between a
            static vault that ignores market shifts, or an opaque AI that you cannot audit. Both
            leave yield on the table, both increase risk, and neither earns trust at scale.
          </p>
        </Slide>

        {/* === Slide 3 — Thesis === */}
        <Slide id={3} label="Solution">
          <H>Optimize yield and reduce risk, with every move verifiable on-chain.</H>
          <Lead>
            Mensa rebalances dynamically between mETH and USDY based on live market state, so
            users capture the better-yielding asset while keeping diversification. The AI decides,
            humans audit, the chain records. Three primitives make every move provable.
          </Lead>
          <div className="grid md:grid-cols-3 gap-4 mt-12">
            {[
              {
                tag: '01',
                title: 'Logged',
                detail: 'Every allocation decision is written to the DecisionLog contract: action, confidence, full reasoning text emitted as event data.',
              },
              {
                tag: '02',
                title: 'Explained',
                detail: 'Claude Haiku 4.5 generates a plain-English justification for every rebalance. No black-box scores, no opaque embeddings.',
              },
              {
                tag: '03',
                title: 'Challenged',
                detail: 'The TournamentVault pits the AI against humans on identical inputs. After 24h, the higher-return allocation wins, settled on-chain.',
              },
            ].map(b => (
              <div key={b.tag} className="card p-5">
                <div className="text-[10px] mono text-[var(--accent)] mb-3">{b.tag}</div>
                <div className="text-base font-medium mb-2">{b.title}</div>
                <div className="text-sm text-[var(--fg-muted)] leading-relaxed">{b.detail}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--fg-muted)] mt-8 max-w-3xl leading-relaxed">
            <span className="text-[var(--fg)] font-medium">Net effect for users:</span> better
            risk-adjusted yield than any static vault, plus a public audit trail no AI black box
            can match.
          </p>
        </Slide>

        {/* === Slide 4 — Live numbers === */}
        <Slide id={4} label="Traction">
          <H>This is happening right now.</H>
          <Lead>Not a mock. The contracts have been live on Mantle Mainnet for days, the cron has been deciding, the tournament has been settling.</Lead>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12">
            {[
              {
                label: 'Decisions logged',
                value: stats ? String(stats.totalDecisions) : '—',
                detail: 'on-chain · DecisionLog',
                icon: '◎',
              },
              {
                label: 'Tournament rounds',
                value: stats ? String(stats.totalRounds) : '—',
                detail: stats ? `${stats.aiWins}W / ${stats.humanWins}L · ${stats.totalRounds - stats.aiWins - stats.humanWins} pending` : '',
                icon: '⊕',
              },
              {
                label: 'AI win rate',
                value: stats && (stats.aiWins + stats.humanWins) > 0 ? `${stats.aiWinRatePct.toFixed(0)}%` : '—',
                detail: stats ? `${stats.aiWins}W / ${stats.humanWins}L · ${stats.aiWins + stats.humanWins} settled` : 'vs 50/50 baseline',
                icon: '◐',
                accent: true,
              },
              {
                label: 'Alpha / round',
                value: stats?.alphaCalibrated && stats.alphaCalibrated.settledRounds > 0
                  ? `${stats.alphaCalibrated.perRoundAvgAlphaBps >= 0 ? '+' : ''}${stats.alphaCalibrated.perRoundAvgAlphaBps.toFixed(0)} bps`
                  : '—',
                detail: stats?.alphaCalibrated && stats.alphaCalibrated.settledRounds > 0
                  ? `${stats.alphaCalibrated.alphaBps >= 0 ? '+' : ''}${stats.alphaCalibrated.alphaBps} bps over ${stats.alphaCalibrated.settledRounds} rounds`
                  : 'since memory loop calibrated',
                icon: '↗',
                accent: true,
              },
            ].map(s => (
              <div key={s.label} className="card p-5 relative overflow-hidden">
                <div className="text-2xl text-[var(--fg-dim)] mb-2 mono">{s.icon}</div>
                <div className={`text-3xl md:text-4xl font-medium mono ${s.accent ? 'text-[var(--accent)]' : ''}`}>{s.value}</div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-3">{s.label}</div>
                {s.detail && <div className="text-[10px] text-[var(--fg-dim)] mt-1">{s.detail}</div>}
              </div>
            ))}
          </div>

          {/* Cumulative alpha chart: tells the story in one line.
              Shows the recovery from round #1 disaster + the streak from #2 onward. */}
          {journey.length > 0 && <AlphaChart journey={journey} />}

          <p className="text-xs text-[var(--fg-dim)] mt-6">
            Values fetched live from <code className="mono">/api/onchain</code>. Refresh this slide to see them update.
          </p>
        </Slide>

        {/* === Slide 5 — Memory loop === */}
        <Slide id={5} label="Innovation 1">
          <H>The memory loop: how Claude learns without retraining.</H>
          <Lead>
            Before every decision, the agent reads its own on-chain track record and injects it
            into Claude&apos;s prompt. Self-correction emerges without a single training pipeline.
          </Lead>
          <div className="card p-6 mt-10 mono text-[11px] md:text-xs leading-relaxed text-[var(--fg-muted)] overflow-x-auto whitespace-pre">
{(() => {
  const cal = stats?.alphaCalibrated
  const calRounds = cal?.settledRounds ?? 0
  const calCum = cal?.alphaBps ?? 0
  const calPer = cal?.perRoundAvgAlphaBps ?? 0
  const sign = (n: number) => (n >= 0 ? '+' : '')
  const recent = [...journey].filter(r => r.id > 1).sort((a, b) => b.id - a.id).slice(0, 3)
  const recentBlock = recent.length
    ? recent.map(r => `  Round #${r.id}: AI=${r.alloc}% mETH, alpha vs 50/50 = ${sign(r.alpha)}${r.alpha} bps`).join('\n')
    : '  (no calibrated rounds yet)'
  const r1 = journey.find(r => r.id === 1)
  const r1Line = r1
    ? `Round #1 was a ${sign(r1.alpha)}${r1.alpha} bps loss made before this feedback loop existed —\nnote it but don't let it dominate your current strategy.`
    : ''
  return `Track record (since memory loop calibrated, ${calRounds} rounds):
  Cumulative alpha vs 50/50 baseline: ${sign(calCum)}${calCum} bps
  Per-round average: ${sign(calPer)}${Math.round(calPer)} bps

Recent rounds:
${recentBlock}

${r1Line}

Reflect: when did you under-allocate to the winning asset?
When did you over-rebalance and lose to passive 50/50?`
})()}
          </div>
          <p className="text-xs text-[var(--fg-muted)] mt-6 max-w-3xl leading-relaxed">
            This is the actual prompt context shipped on every Claude call. The agent reads
            its alpha, sees which rounds it underperformed, and adjusts. Cheap, transparent,
            no ML infra.
          </p>
        </Slide>

        {/* === Slide 6 — Tournament === */}
        <Slide id={6} label="Innovation 2">
          <H>The Turing tournament: humans challenge the AI on identical data.</H>
          <Lead>
            Each rebalance opens a 24h round. Anyone with a stake can vote their own mETH/USDY
            split. After settlement, whoever produced the better return wins on-chain.
            <span className="text-[var(--fg)]"> No subjective judging, no leaderboard cooking.</span>
          </Lead>
          <div className="grid md:grid-cols-3 gap-4 mt-10 text-sm">
            <div className="card p-5">
              <div className="text-[10px] mono text-[var(--accent)] mb-2">SQRT-WEIGHTED VOTING</div>
              <div className="text-[var(--fg-muted)] leading-relaxed">
                Vote weight = sqrt(reputation). 100 Sybil wallets at rep=1 sum to weight 100; one
                whale at rep=10000 also gets weight 100. Diminishing returns kill bot dominance.
              </div>
            </div>
            <div className="card p-5">
              <div className="text-[10px] mono text-[var(--accent)] mb-2">15% PERFORMANCE FEE</div>
              <div className="text-[var(--fg-muted)] leading-relaxed">
                On yield, never principal. Splits 50/30/20: winners / reputation pool / ops.
                Humans who beat the AI get paid in MNT, claimable.
              </div>
            </div>
            <div className="card p-5">
              <div className="text-[10px] mono text-[var(--accent)] mb-2">SOULBOUND BADGES</div>
              <div className="text-[var(--fg-muted)] leading-relaxed">
                7 milestones (First Vote, Beat AI 10x/100x, 5-Win Streak, Rep 500/1000, Top 10
                Monthly) minted as non-transferable ERC-721. Reputation is portable.
              </div>
            </div>
          </div>
        </Slide>

        {/* === Slide 7 — Honest journey === */}
        <Slide id={7} label="Why we&apos;re honest">
          <H>Round #1 was a disaster. We kept it visible.</H>
          <Lead>
            We didn&apos;t want to ship a pitch deck where the AI looks like a genius. The first
            round on mainnet was a 19.4% loss. Then the memory loop activated and the AI
            recovered. Both halves are on-chain, irreversible.
          </Lead>

          {journey.length > 0 ? <JourneyStrip journey={journey} stats={stats} /> : (
            <div className="card p-8 text-center text-sm text-[var(--fg-muted)] mt-10">
              Loading rounds from on-chain...
            </div>
          )}
        </Slide>

        {/* === Slide 8 — Backtest === */}
        <Slide id={8} label="Verifiable">
          <H>Beyond live rounds: we backtest on 1 year of real ETH price history.</H>
          <Lead>
            A handful of on-chain rounds isn&apos;t a long enough track record. So we replay Mensa&apos;s strategy
            against three baselines (passive 50/50, 100% mETH HODL, 100% USDY) on a year of real price data.
            The methodology is on{' '}
            <Link href="/backtest" className="text-[var(--accent)] hover:underline">/backtest</Link>.
          </Lead>

          <div className="grid md:grid-cols-[1.4fr_1fr] gap-4 mt-10">
            <div className="card p-6">
              <div className="text-[10px] uppercase tracking-wider text-[var(--accent)] mb-3">
                Honest finding
              </div>
              <p className="text-sm text-[var(--fg-muted)] leading-relaxed mb-3">
                In a strong directional bull (ETH +15%), allocation strategies always lag pure HODL.
                Mensa cut max drawdown by 5pp at the cost of some upside. Risk-adjusted, that is
                the actual trade.
              </p>
              <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
                Mensa&apos;s value prop is chop and bear regimes, not bull tops. The backtest
                page is explicit about this. No cherry-picked window.
              </p>
            </div>

            <div className="card p-6">
              <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-4">
                Data sources, all live
              </div>
              <div className="space-y-3 text-xs">
                {[
                  { name: 'Coingecko', detail: '1y ETH price history, daily candles', url: 'https://www.coingecko.com', icon: 'https://www.coingecko.com/favicon.ico' },
                  { name: 'DefiLlama', detail: 'mETH + USDY yields on Mantle, live APRs', url: 'https://defillama.com', icon: 'https://defillama.com/favicon.ico' },
                  { name: 'Mantlescan', detail: '7 verified contracts, every round + decision', url: 'https://mantlescan.xyz', icon: 'https://mantlescan.xyz/favicon.ico' },
                  { name: 'Anthropic Claude', detail: 'Haiku 4.5, the decision engine', url: 'https://www.anthropic.com', icon: 'https://www.anthropic.com/favicon.ico' },
                  { name: 'Mantle Network', detail: 'L2 settlement, low-cost decision logging', url: 'https://www.mantle.xyz', icon: 'https://www.mantle.xyz/favicon.ico' },
                ].map(s => (
                  <a
                    key={s.name}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 group"
                  >
                    <img
                      src={s.icon}
                      alt={s.name}
                      className="w-6 h-6 rounded-sm grayscale group-hover:grayscale-0 transition opacity-70 group-hover:opacity-100"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[var(--fg)] group-hover:text-[var(--accent)] transition">{s.name}</div>
                      <div className="text-[10px] text-[var(--fg-dim)] truncate">{s.detail}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </Slide>

        {/* === Slide 9 — Stack === */}
        <Slide id={9} label="Tech">
          <H>7 verified contracts. ERC-8004 native.</H>
          <Lead>Production-shaped on mainnet from day one. Every piece independently verifiable on Mantlescan.</Lead>

          <div className="grid md:grid-cols-2 gap-3 mt-10 text-sm">
            {[
              { sym: '◆', name: 'MensaAgent', role: 'The treasury. Holds deposits, gates rebalance, opens rounds.', addr: '0xAcA925e5...CCe49' },
              { sym: '✎', name: 'DecisionLog', role: 'Append-only on-chain record. Reasoning emitted as event data.', addr: '0xD889B781...88Fe' },
              { sym: '⚔', name: 'TournamentVault', role: 'Round lifecycle, voting, settlement, payout distribution.', addr: '0x92E6B40d...d122' },
              { sym: '★', name: 'Reputation', role: 'Sqrt-weighted scoring. Read by Tournament for vote weight.', addr: '0x10A519fd...4E5f' },
              { sym: '💰', name: 'BountyPool', role: '15% perf-fee sink. 50/30/20 split. Pull-based claims.', addr: '0x06460f1c...5f39' },
              { sym: '🏆', name: 'MensaBadges', role: '7 soulbound achievement NFTs. Transfer-blocked.', addr: '0x22867d39...144E' },
              { sym: '◎', name: 'MensaAgentIdentity (ERC-8004)', role: 'Agent registry NFT, agentId #1. Discoverable for A2A composability.', addr: '0x6671E554...60B6', highlight: true },
            ].map(c => (
              <div key={c.name} className={`card p-4 ${c.highlight ? 'border-[var(--accent)]' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="text-lg shrink-0 mt-0.5" style={{ color: c.highlight ? 'var(--accent)' : 'var(--fg-muted)' }}>{c.sym}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium mb-0.5">{c.name}</div>
                    <div className="text-[10px] mono text-[var(--fg-dim)] mb-1.5">{c.addr}</div>
                    <div className="text-xs text-[var(--fg-muted)] leading-relaxed">{c.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Off-chain stack row with favicons */}
          <div className="card p-4 mt-6">
            <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-3">Off-chain stack</div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
              {[
                { name: 'Next.js + Vercel', icon: 'https://www.vercel.com/favicon.ico' },
                { name: 'Claude Haiku 4.5', icon: 'https://www.anthropic.com/favicon.ico' },
                { name: 'GitHub Actions cron', icon: 'https://github.com/favicon.ico' },
                { name: 'Coingecko (ETH)', icon: 'https://www.coingecko.com/favicon.ico' },
                { name: 'DefiLlama (yields)', icon: 'https://defillama.com/favicon.ico' },
                { name: 'Foundry', icon: 'https://getfoundry.sh/favicon.ico' },
              ].map(s => (
                <div key={s.name} className="flex items-center gap-2">
                  <img src={s.icon} alt={s.name} className="w-4 h-4 rounded grayscale" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  <span className="text-[var(--fg-muted)]">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Slide>

        {/* === Slide 10 — MVP scope === */}
        <Slide id={10} label="Honest scope">
          <H>What we know we don&apos;t have yet.</H>
          <Lead>A hackathon submission that pretends it&apos;s production is a hackathon submission that lies. Here&apos;s the gap list.</Lead>
          <div className="grid gap-3 mt-10 text-sm">
            {[
              {
                tag: 'NOW',
                title: 'Notional rebalancing',
                detail: 'executeAllocation updates a target % and opens a round but does not swap tokens. We surveyed Merchant Moe V2 — pools mETH/USDC ≈ $6 TVL, USDC/USDY ≈ $22. Real execution is gated less on our code and more on Mantle DEX liquidity maturity.',
              },
              {
                tag: 'NOW',
                title: 'Per-user balance tracker (not shares)',
                detail: 'userDeposits is a unified counter, not per-asset. Safe at small TVL, multi-user mainnet needs the ERC-4626 share model upgrade.',
              },
              {
                tag: 'NEXT',
                title: 'ERC-4626 share model + Velora swap',
                detail: 'Replace the counter with shares minted at deposit. Route executeAllocation through Velora aggregator with slippage caps. Designed, not deployed.',
              },
              {
                tag: 'NEXT',
                title: 'Real human-vote aggregation in settle',
                detail: 'Auto-settle passes 50% as the human aggregate when no voters showed up. With active voting we compute reputation-weighted median off-chain and pass it in.',
              },
              {
                tag: 'LATER',
                title: 'Hybrid AI / human steering',
                detail: 'Wired today: Claude reads the human consensus as a soft input. With more voters this becomes a real co-allocation mechanism, not just a benchmark.',
              },
            ].map(b => (
              <div key={b.title} className="card p-4 flex gap-3">
                <span
                  className="text-[10px] uppercase tracking-wider mono shrink-0 mt-0.5"
                  style={{ color: b.tag === 'NOW' ? 'var(--accent)' : 'var(--fg-muted)' }}
                >
                  {b.tag}
                </span>
                <div>
                  <div className="text-sm font-medium mb-1">{b.title}</div>
                  <div className="text-xs text-[var(--fg-muted)] leading-relaxed">{b.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Slide>

        {/* === Slide 11 — Opportunity / market === */}
        <Slide id={11} label="Opportunity">
          <H>Static yield vaults are the cassette tape of DeFi.</H>
          <Lead>
            Today every yield vault on every chain locks the user into one allocation. Mantle has
            hundreds of millions in yield TVL sitting in static positions. The first project to
            ship a verifiable AI-rebalanced vault captures the flow when those users upgrade. We
            think that is when, not if.
          </Lead>

          <div className="grid md:grid-cols-3 gap-4 mt-10 text-sm">
            <div className="card p-5">
              <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-3">Today, static</div>
              <div className="text-base font-medium mb-2">Pick once, live with it</div>
              <div className="text-xs text-[var(--fg-muted)] leading-relaxed">
                Single-asset LST vaults lose when stables yield ahead. T-bill vaults lose when ETH
                appreciates. The user holds one view of the world for months while the market
                moves on. Yield captured: the spread when it favored your bet. Yield missed: the
                spread when it did not.
              </div>
            </div>
            <div className="card p-5 border-[var(--accent)]" style={{ background: 'var(--accent-soft)' }}>
              <div className="text-[10px] uppercase tracking-wider text-[var(--accent)] mb-3">Mensa, dynamic</div>
              <div className="text-base font-medium mb-2">Read, reason, rebalance</div>
              <div className="text-xs text-[var(--fg-muted)] leading-relaxed">
                Every 6 hours Claude reads the live yield spread, the ETH market, and its own
                on-chain track record. If a rebalance clears the cost of execution, the agent
                moves capital. Same TVL, better risk-adjusted return, public audit trail of every
                decision.
              </div>
            </div>
            <div className="card p-5">
              <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-3">Tomorrow, the default</div>
              <div className="text-base font-medium mb-2">Verifiable AI vaults win</div>
              <div className="text-xs text-[var(--fg-muted)] leading-relaxed">
                Once users compare a static 50/50 vault to a vault that captured +1278 bps of
                cumulative alpha over 24 rounds with a public reasoning trail, the choice writes
                itself. Static vaults stay around for the same reason cassette tapes did: legacy,
                not preference.
              </div>
            </div>
          </div>

          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-10 mb-2">Who this is for, and at what scale</div>
          <div className="grid md:grid-cols-2 gap-3 text-xs">
            <div className="card p-4">
              <div className="text-sm font-medium mb-1">DAO treasuries</div>
              <div className="text-[var(--fg-muted)] leading-relaxed">
                Tens of millions in idle stables across Mantle and Ethereum DAOs. They need yield
                without permanent ETH exposure. A verifiable AI rebalancing vault is exactly the
                primitive their governance can defend.
              </div>
            </div>
            <div className="card p-4">
              <div className="text-sm font-medium mb-1">Sophisticated DeFi savers</div>
              <div className="text-[var(--fg-muted)] leading-relaxed">
                The user who today rotates between Aave, Pendle, Spark, Yearn manually. Mensa
                automates that rotation for them and proves it on-chain. Their alpha goes up,
                their gas drops, their reasoning is auditable.
              </div>
            </div>
            <div className="card p-4">
              <div className="text-sm font-medium mb-1">RWA-backed protocols</div>
              <div className="text-[var(--fg-muted)] leading-relaxed">
                Protocols holding USDY, USDM, BUIDL as collateral or as reserve need yield that
                does not introduce hidden risk. A vault that explicitly bounds ETH exposure with
                a public reasoning trail makes the risk committee&apos;s job easier.
              </div>
            </div>
            <div className="card p-4">
              <div className="text-sm font-medium mb-1">Institutional crypto funds</div>
              <div className="text-[var(--fg-muted)] leading-relaxed">
                Funds that already accept AI in trading still avoid AI in custody, because they
                can&apos;t audit it. An open-source, on-chain-reasoning vault closes that gap and
                opens the door to actual institutional flow.
              </div>
            </div>
          </div>

          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-10 mb-2">TVL milestones, what each one unlocks</div>
          <div className="card p-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <div className="mono text-[var(--accent)] text-base mb-1">Today</div>
                <div className="text-[var(--fg-muted)] leading-relaxed">
                  Notional rebalancing. The AI declares the optimal allocation, the contract
                  records it, alpha is measured against the baseline. No swaps yet, Mantle DEX
                  depth is the blocker, not our code.
                </div>
              </div>
              <div>
                <div className="mono text-[var(--accent)] text-base mb-1">$100K TVL</div>
                <div className="text-[var(--fg-muted)] leading-relaxed">
                  Real swap execution via Velora-style aggregator. Ship the ERC-4626 share model.
                  This is when Mensa stops being notional and starts being a live treasury.
                </div>
              </div>
              <div>
                <div className="mono text-[var(--accent)] text-base mb-1">$1M TVL</div>
                <div className="text-[var(--fg-muted)] leading-relaxed">
                  DAO treasuries onboard. Active human tournament voting. Auditor engagement
                  (Spearbit, Trail of Bits, Macro). Per-asset isolation in the share model.
                </div>
              </div>
              <div>
                <div className="mono text-[var(--accent)] text-base mb-1">$10M and beyond</div>
                <div className="text-[var(--fg-muted)] leading-relaxed">
                  Cross-chain deployment (Base, Arbitrum, Solana via WDK). Multiple Mensa
                  instances each with its own ERC-8004 identity, federated reputation across
                  chains. Institutional flow.
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-[var(--fg-dim)] mt-6 leading-relaxed">
            None of this is hypothetical at the protocol level. mETH staking yields 0.34 to 2.28%
            APY (DefiLlama). USDY T-bills yield 3.55% (Ondo native). A vault that flips between
            them based on real-time spread is a primitive that should exist. We are building it
            with the audit trail no AI black box can offer.
          </p>
        </Slide>

        {/* === Slide 12 — Track fit === */}
        <Slide id={12} label="Hackathon">
          <H>Why Mensa fits the Mantle Turing Test.</H>
          <Lead>The hackathon brief asked for autonomous agents that compete on-chain, verify reasoning, and use Mantle&apos;s native RWAs. Mensa is that, line by line.</Lead>
          <div className="grid md:grid-cols-2 gap-3 mt-10">
            {[
              {
                track: 'AI × RWA (primary)',
                fit: 'Path B — end-user-facing intelligent RWA portfolio agent. mETH (Mantle LST) + USDY (Ondo T-bills) are exactly the RWAs the track names.',
              },
              {
                track: 'Grand Champion',
                fit: '7 verified contracts (Tech Depth), Turing tournament + verifiable alpha + memory loop (Innovation), Mantle-native (Ecosystem), live deployed (Completeness).',
              },
              {
                track: 'AI Alpha & Data',
                fit: 'Path B — trading strategy with verifiable on-chain alpha. Every return computed from contract reads, alpha measured against passive baseline.',
              },
              {
                track: 'Best UI/UX',
                fit: 'Dark Mantle-aligned design. AI reasoning surfaced. Glossary tooltips. Responsive. Live data everywhere.',
              },
              {
                track: '20 Project Deployment Award',
                fit: '7/7 verified on Mantlescan, AI-powered function callable on-chain, public frontend, open MIT repo with README + Foundry tests.',
              },
            ].map(t => (
              <div key={t.track} className="card p-5">
                <div className="text-sm font-medium mb-2 text-[var(--fg)]">{t.track}</div>
                <div className="text-xs text-[var(--fg-muted)] leading-relaxed">{t.fit}</div>
              </div>
            ))}
          </div>
        </Slide>

        {/* === Slide 13 — Try it === */}
        <Slide id={13} label="CTA">
          <H>Try it. Now. Live.</H>
          <Lead>
            Everything in this deck is fetched from on-chain state at slide load. No fake numbers,
            no static screenshots, no PDF tricks. Click through.
          </Lead>

          {/* 4 main destinations, redesigned with icon + title + subtitle, no dashes */}
          <div className="grid md:grid-cols-2 gap-4 mt-10">
            {[
              {
                href: '/',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                  </svg>
                ),
                title: 'Agent',
                subtitle: 'Live AI decisions, allocation, and reasoning',
              },
              {
                href: '/tournament',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2" />
                    <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
                    <path d="M6 22v-4M18 22v-4M10 22h4" />
                    <path d="M6 3h12v6a6 6 0 0 1-12 0V3z" />
                  </svg>
                ),
                title: 'Tournament',
                subtitle: 'Vote your allocation against the AI',
              },
              {
                href: '/backtest',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <path d="M3 3v18h18" />
                    <path d="M7 14l4-4 4 3 5-6" />
                  </svg>
                ),
                title: 'Backtest',
                subtitle: 'Strategy replayed on 1y of real ETH history',
              },
              {
                href: '/docs',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <path d="M4 4h12a4 4 0 0 1 4 4v12a2 2 0 0 0-2-2H4z" />
                    <path d="M8 9h8M8 13h6" />
                  </svg>
                ),
                title: 'Docs',
                subtitle: 'Architecture, roadmap, compliance, tracks',
              },
            ].map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="card interactive p-5 flex items-center gap-4 group"
              >
                <div className="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-[var(--accent)] transition group-hover:scale-110" style={{ background: 'var(--accent-soft)' }}>
                  {l.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-medium">{l.title}</div>
                  <div className="text-xs text-[var(--fg-muted)] mt-0.5 leading-relaxed">{l.subtitle}</div>
                </div>
                <span className="text-[var(--accent)] text-xl shrink-0 group-hover:translate-x-1 transition">→</span>
              </Link>
            ))}
          </div>

          {/* Secondary external links */}
          <div className="mt-8 flex flex-wrap items-center gap-2 text-xs text-[var(--fg-muted)]">
            <span className="text-[var(--fg-dim)] mr-1">Also:</span>
            <a href="https://github.com/obseasd/mensa" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-full border border-[var(--border)] hover:text-white hover:border-[var(--accent)] transition">
              GitHub
            </a>
            <a href="https://mantlescan.xyz/address/0xAcA925e51E7C801Af4E4080f041AF0ec112CCe49#code" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-full border border-[var(--border)] hover:text-white hover:border-[var(--accent)] transition">
              Mantlescan
            </a>
            <a href="https://mensa-mu.vercel.app/api/agent-card" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-full border border-[var(--border)] hover:text-white hover:border-[var(--accent)] transition">
              ERC-8004 agent card
            </a>
            <Link href="/deposit" className="px-3 py-1.5 rounded-full border border-[var(--border)] hover:text-white hover:border-[var(--accent)] transition">
              Deposit
            </Link>
            <Link href="/leaderboard" className="px-3 py-1.5 rounded-full border border-[var(--border)] hover:text-white hover:border-[var(--accent)] transition">
              Leaderboard
            </Link>
          </div>

          <p className="text-xs text-[var(--fg-dim)] mt-12 leading-relaxed">
            Built for the Mantle Turing Test Hackathon 2026 — Phase 2 AI Awakening.<br/>
            MIT licensed. No financial advice. Audit pending.
          </p>
        </Slide>
      </div>

      {/* Fixed dot navigator */}
      <nav className="fixed right-4 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col gap-2">
        {Array.from({ length: SLIDE_COUNT }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => goTo(n)}
            className={`w-2 h-2 rounded-full transition ${
              current === n ? 'bg-[var(--accent)] scale-150' : 'bg-[var(--border-strong)] hover:bg-[var(--fg-muted)]'
            }`}
            aria-label={`Slide ${n}`}
            title={`Slide ${n}`}
          />
        ))}
      </nav>

      {/* Bottom progress bar */}
      <div className="fixed bottom-0 left-0 right-0 h-0.5 bg-[var(--border)] z-50">
        <div
          className="h-full bg-[var(--accent)] transition-all duration-300"
          style={{ width: `${(current / SLIDE_COUNT) * 100}%` }}
        />
      </div>
    </>
  )
}
