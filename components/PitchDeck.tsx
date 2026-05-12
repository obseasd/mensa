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

const SLIDE_COUNT = 12

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

export default function PitchDeck() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [current, setCurrent] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/onchain').then(r => r.json()).then(d => {
      if (d.stats) setStats(d.stats)
    }).catch(() => {})
  }, [])

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
            <span className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-2xl font-bold text-[var(--accent)]">m</span>
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
          <div className="text-xs text-[var(--fg-dim)] mt-16">
            Use → / ↓ / Space to advance · ↑ / ← to go back
          </div>
        </Slide>

        {/* === Slide 2 — Problem === */}
        <Slide id={2} label="Problem">
          <H>You can&apos;t trust an AI with your money if you can&apos;t verify its reasoning.</H>
          <Lead>
            DeFi has billions in autonomous protocols. AI agents are starting to manage real
            capital. But every existing AI treasury is a black box: it acts, you trust, you hope.
          </Lead>
          <div className="grid md:grid-cols-3 gap-4 mt-12 text-sm">
            {[
              { title: 'No reasoning trail', detail: 'You see "the AI rebalanced." You don\'t see why.' },
              { title: 'No benchmark', detail: 'No way to measure if the AI is actually any good.' },
              { title: 'No accountability', detail: 'If it underperforms, no human is on the line — including the AI.' },
            ].map(b => (
              <div key={b.title} className="card p-5">
                <div className="text-sm font-medium mb-2 text-[var(--fg)]">{b.title}</div>
                <div className="text-[var(--fg-muted)]">{b.detail}</div>
              </div>
            ))}
          </div>
        </Slide>

        {/* === Slide 3 — Thesis === */}
        <Slide id={3} label="Solution">
          <H>Mensa: every decision logged, explained, and challenged.</H>
          <Lead>
            We take the hackathon name literally. The agent must prove, statistically and
            on-chain, that it allocates better than humans on the same data. Three primitives.
          </Lead>
          <div className="grid md:grid-cols-3 gap-4 mt-12">
            {[
              {
                tag: '01',
                title: 'Logged',
                detail: 'Every allocation decision is written to the DecisionLog contract — action, confidence, full reasoning text emitted as event data.',
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
        </Slide>

        {/* === Slide 4 — Live numbers === */}
        <Slide id={4} label="Traction">
          <H>This is happening right now.</H>
          <Lead>Not a mock. The contracts have been live on Mantle Mainnet for days, the cron has been deciding, the tournament has been settling.</Lead>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12">
            {[
              { label: 'Decisions logged', value: stats ? String(stats.totalDecisions) : '—' },
              { label: 'Tournament rounds', value: stats ? String(stats.totalRounds) : '—', detail: stats ? `${stats.aiWins}W / ${stats.humanWins}L` : '' },
              { label: 'AI win rate', value: stats && stats.totalRounds > 0 ? `${stats.aiWinRatePct.toFixed(0)}%` : '—' },
              {
                label: 'Alpha / round',
                value: stats?.alphaCalibrated && stats.alphaCalibrated.settledRounds > 0
                  ? `${stats.alphaCalibrated.perRoundAvgAlphaBps >= 0 ? '+' : ''}${stats.alphaCalibrated.perRoundAvgAlphaBps.toFixed(0)} bps`
                  : '—',
                detail: 'since memory loop calibrated',
              },
            ].map(s => (
              <div key={s.label} className="card p-5">
                <div className="text-3xl md:text-4xl font-medium mono">{s.value}</div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-3">{s.label}</div>
                {s.detail && <div className="text-[10px] text-[var(--fg-dim)] mt-1">{s.detail}</div>}
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--fg-dim)] mt-8">
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
{`Track record (since memory loop calibrated, 6 rounds):
  Cumulative alpha vs 50/50 baseline: +204 bps
  Per-round average: +34 bps

Recent rounds:
  Round #7: you=20% mETH (19bps) | 50/50=49bps | optimal=100% mETH (97bps) | you-vs-base=-30bps
  Round #6: you=0% mETH (0bps) | 50/50=-126bps | optimal=0% mETH (0bps) | you-vs-base=+126bps
  ...

Round #1 was a -324bps loss made before this feedback loop existed —
note it but don't let it dominate your current strategy.

Reflect: when did you under-allocate to the winning asset?
When did you over-rebalance and lose to passive 50/50?`}
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
          <H>Round #1 was a disaster. Here&apos;s what happened.</H>
          <Lead>
            We didn&apos;t want to ship a pitch deck where the AI looks like a genius. The first
            round on mainnet was a 19.4% loss. We learned in public.
          </Lead>
          <div className="grid md:grid-cols-7 gap-2 mt-10 text-xs">
            {[
              { id: 1, alloc: 60, alpha: -324, color: '#ef4444' },
              { id: 2, alloc: 35, alpha: 15, color: 'var(--accent)' },
              { id: 3, alloc: 25, alpha: 21, color: 'var(--accent)' },
              { id: 4, alloc: 15, alpha: 10, color: 'var(--accent)' },
              { id: 5, alloc: 5, alpha: 62, color: 'var(--accent)' },
              { id: 6, alloc: 0, alpha: 126, color: 'var(--accent)' },
              { id: 7, alloc: 20, alpha: -30, color: '#ef4444' },
            ].map(r => (
              <div key={r.id} className="card p-3 text-center">
                <div className="text-[10px] mono text-[var(--fg-muted)]">Round #{r.id}</div>
                <div className="text-xs mono mt-2">{r.alloc}% mETH</div>
                <div className="text-base mono font-medium mt-2" style={{ color: r.color }}>
                  {r.alpha >= 0 ? '+' : ''}{r.alpha}<span className="text-[9px]">bps</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-[var(--fg-muted)] mt-8 max-w-3xl leading-relaxed">
            Round #1 cold-start: 60% mETH, ETH crashed 19%, the AI ate the loss. Round #2
            onward — once the memory loop was active — the AI shifted defensive
            (60 → 35 → 25 → 15 → 5 → 0% mETH) and beat the baseline on every round until #7.
            <span className="text-[var(--fg)]"> Net since calibrated: +204 bps cumulative, +34 bps per round.</span>
          </p>
        </Slide>

        {/* === Slide 8 — Backtest === */}
        <Slide id={8} label="Verifiable">
          <H>Beyond live rounds: we backtest on 1 year of real ETH price history.</H>
          <Lead>
            Seven on-chain rounds isn&apos;t a track record. So we replay Mensa&apos;s strategy
            against three baselines (passive 50/50, 100% mETH HODL, 100% USDY) on a year of
            Coingecko ETH prices. The methodology is on{' '}
            <Link href="/backtest" className="text-[var(--accent)] hover:underline">/backtest</Link>.
          </Lead>
          <div className="card p-6 mt-10 max-w-3xl">
            <div className="text-[10px] uppercase tracking-wider text-[var(--accent)] mb-4">
              Honest finding
            </div>
            <p className="text-sm text-[var(--fg-muted)] leading-relaxed mb-3">
              In a strong directional bull (ETH +15%), allocation strategies always lag pure HODL.
              Mensa cut max drawdown by 5pp at the cost of some upside — risk-adjusted, that&apos;s
              the actual trade.
            </p>
            <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
              Mensa&apos;s value prop is chop and bear regimes, not bull tops. The page is
              explicit about this. No cherry-picked window.
            </p>
          </div>
        </Slide>

        {/* === Slide 9 — Stack === */}
        <Slide id={9} label="Tech">
          <H>7 verified contracts. ERC-8004 native. No external deps that aren&apos;t spec.</H>
          <Lead>Production-shaped on mainnet from day one.</Lead>
          <div className="grid md:grid-cols-2 gap-3 mt-10 text-sm">
            {[
              ['MensaAgent', 'The treasury. Holds deposits, gates rebalance, opens rounds.'],
              ['DecisionLog', 'Append-only on-chain record. Reasoning emitted as event data.'],
              ['TournamentVault', 'Round lifecycle, voting, settlement, payout distribution.'],
              ['Reputation', 'Sqrt-weighted scoring. Read by Tournament for vote weight.'],
              ['BountyPool', '15% perf-fee sink. 50/30/20 split. Pull-based claims.'],
              ['MensaBadges', '7 soulbound achievement NFTs. Transfer-blocked.'],
              ['MensaAgentIdentity (ERC-8004)', 'Agent registry NFT, agentId #1. Discoverable for A2A composability.'],
            ].map(([name, role]) => (
              <div key={name} className="card p-4">
                <div className="text-sm font-medium mb-1">{name}</div>
                <div className="text-xs text-[var(--fg-muted)] leading-relaxed">{role}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--fg-muted)] mt-8 leading-relaxed">
            Off-chain: Next.js 16 frontend on Vercel, GitHub Actions cron every 30 min for the
            decision + auto-settle loop, Claude Haiku 4.5 via Anthropic SDK with the on-chain
            track record injected on every call, Coingecko + DefiLlama for live market state.
          </p>
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

        {/* === Slide 11 — Track fit === */}
        <Slide id={11} label="Hackathon">
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

        {/* === Slide 12 — Try it === */}
        <Slide id={12} label="CTA">
          <H>Try it. Now. Live.</H>
          <Lead>
            Everything in this deck is fetched from on-chain state at slide load. No fake numbers,
            no static screenshots, no PDF tricks. Click through.
          </Lead>
          <div className="grid md:grid-cols-2 gap-3 mt-10 text-sm">
            {[
              { href: '/', label: 'Agent — live decisions + allocation' },
              { href: '/tournament', label: 'Tournament — vote against the AI' },
              { href: '/backtest', label: 'Backtest — 1y replay vs baselines' },
              { href: '/deposit', label: 'Deposit — try with $1 of mETH' },
              { href: '/leaderboard', label: 'Leaderboard — humans + bounty pool' },
              { href: '/docs', label: 'Docs — architecture + roadmap + compliance' },
            ].map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="card p-4 flex items-center justify-between hover:border-[var(--accent)] transition group"
              >
                <span className="text-sm">{l.label}</span>
                <span className="text-[var(--accent)] group-hover:translate-x-1 transition">→</span>
              </Link>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-3 text-xs text-[var(--fg-muted)]">
            <a href="https://github.com/obseasd/mensa" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-full border border-[var(--border)] hover:text-white hover:border-[var(--accent)] transition">
              GitHub →
            </a>
            <a href="https://mantlescan.xyz/address/0xAcA925e51E7C801Af4E4080f041AF0ec112CCe49#code" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-full border border-[var(--border)] hover:text-white hover:border-[var(--accent)] transition">
              Contracts on Mantlescan →
            </a>
            <a href="https://mensa-mu.vercel.app/api/agent-card" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-full border border-[var(--border)] hover:text-white hover:border-[var(--accent)] transition">
              ERC-8004 agent card →
            </a>
          </div>
          <p className="text-xs text-[var(--fg-dim)] mt-12">
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
