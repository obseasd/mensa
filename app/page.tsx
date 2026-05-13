import Link from 'next/link'
import Nav from '@/components/Nav'
import AgentLive from '@/components/AgentLive'
import OnChainStats from '@/components/OnChainStats'
import HomeTournamentFeed from '@/components/HomeTournamentFeed'
import AllocationBar from '@/components/AllocationBar'
import Tooltip, { GLOSSARY } from '@/components/Tooltip'

export default function Home() {
  return (
    <div className="min-h-screen relative">
      <Nav />

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs text-[var(--fg-muted)] border border-[var(--border)]">
              <span className="pulse" />
              Live on Mantle Mainnet
            </div>
            <a
              href="https://mantlescan.xyz/address/0x6671E554Da8e874D7aF5F106D21b1930218560B6#code"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs text-[var(--fg-muted)] border border-[var(--border)] hover:text-white hover:border-[var(--accent)] transition"
              title="ERC-8004 IdentityRegistry, agentId #1"
            >
              <span className="mono text-[var(--accent)]">ERC-8004</span>
              <span className="text-[var(--fg-dim)]">·</span>
              <span>agent #1</span>
            </a>
          </div>

          <h1 className="text-5xl md:text-6xl font-medium tracking-tight leading-[1.05] mb-6">
            The AI treasury<br/>
            that proves itself.
          </h1>

          <p className="text-lg text-[var(--fg-muted)] leading-relaxed max-w-2xl mb-6">
            Mensa allocates your funds across <Tooltip content={GLOSSARY.mETH}>mETH</Tooltip> and{' '}
            <Tooltip content={GLOSSARY.USDY}>USDY</Tooltip> on Mantle, then competes against humans
            in a <Tooltip content={GLOSSARY.tournament}>tournament</Tooltip> to prove every decision.
            Every choice is explained, logged on-chain, and challenged.
          </p>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--fg-dim)] mb-8">
            <span className="text-[var(--fg-muted)]">Built for</span>
            <span className="px-2 py-0.5 rounded border border-[var(--border)]">DAO treasuries</span>
            <span className="px-2 py-0.5 rounded border border-[var(--border)]">Sophisticated DeFi savers</span>
            <span className="px-2 py-0.5 rounded border border-[var(--border)]">RWA-backed protocols</span>
          </div>

          <div className="flex items-center gap-3 mb-12">
            <Link href="/deposit" className="btn-accent">Try with $1 USDY</Link>
            <Link href="/tournament" className="btn-secondary">Watch the Tournament</Link>
          </div>

          {/* Live on-chain stats */}
          <OnChainStats />

          {/* Allocation split bar */}
          <div className="mt-3">
            <AllocationBar />
          </div>
        </div>

        {/* Tournament Feed */}
        <section className="mt-20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-medium">Live Tournament</h2>
              <p className="text-sm text-[var(--fg-muted)] mt-1">AI vs Human, same inputs, same time horizon, settled on-chain.</p>
            </div>
            <Link href="/tournament" className="btn-secondary text-xs">View all</Link>
          </div>

          <HomeTournamentFeed />
        </section>

        {/* What Mensa is thinking */}
        <section className="mt-20">
          <div className="mb-6">
            <h2 className="text-xl font-medium">What Mensa is thinking</h2>
            <p className="text-sm text-[var(--fg-muted)] mt-1">The latest on-chain decision, with reasoning. No black box.</p>
          </div>

          <AgentLive />
        </section>

        {/* What Mensa does */}
        <section className="mt-20 mb-12">
          <div className="mb-6">
            <h2 className="text-xl font-medium">What Mensa does</h2>
            <p className="text-sm text-[var(--fg-muted)] mt-1">Six features. Each one is built around Mantle&apos;s unique stack.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {[
              {
                title: 'Auto-allocates between yield and safety',
                detail: 'The agent reads live APYs and ETH macro signals to rebalance the treasury between staked ETH and T-bills. Targets the best risk-adjusted return at every step.',
                stack: 'mETH (Mantle native staking) · USDY (Ondo on Mantle)',
              },
              {
                title: 'Explains every decision in plain English',
                detail: 'Each rebalance ships with a written rationale. No black box: confidence score, market snapshot, and reasoning are all stored next to the action.',
                stack: 'DecisionLog contract · low-gas full transparency',
              },
              {
                title: 'Proves itself in a Turing tournament',
                detail: 'Anyone can stake their own allocation against the AI’s on the same round. After settlement, the closer-to-optimal allocation wins. No subjective judging.',
                stack: 'TournamentVault contract on Mantle',
              },
              {
                title: 'Sybil-resistant human voting',
                detail: 'Vote weight scales with sqrt(reputation), so 100 fresh wallets can’t outweigh one reputable voter. Whales and bots both get diminishing returns.',
                stack: 'Reputation contract · min-stake gate via MensaAgent',
              },
              {
                title: 'Pays humans who beat the AI',
                detail: 'Mensa charges a 15% performance fee — only on yield, never on principal. The fee funds a bounty pool that pays out to humans who out-allocate the AI.',
                stack: 'BountyPool contract · 50/30/20 winners/reputation/ops',
              },
              {
                title: 'Verifiable performance vs passive HODL',
                detail: 'Every settled round computes the AI return and the 50/50 baseline return from on-chain prices. The cumulative alpha — and the AI win rate — are public stats anyone can audit, not numbers we report.',
                stack: 'Alpha measured per round · annualized after 30 rounds',
              },
            ].map(({ title, detail, stack }) => (
              <div key={title} className="card p-5">
                <div className="text-sm font-medium mb-2">{title}</div>
                <div className="text-xs text-[var(--fg-muted)] leading-relaxed mb-3">{detail}</div>
                <div className="text-[10px] text-[var(--fg-dim)] mono pt-3 border-t border-[var(--border)]">
                  {stack}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer — Mantle-inspired layout: brand block on left with socials, columns on right */}
      <footer className="relative z-10 border-t border-[var(--border)] mt-20" style={{ background: '#0F1010' }}>
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10">
          {/* Brand block */}
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-9 h-9 rounded-md bg-zinc-800 flex items-center justify-center text-base font-bold text-[var(--accent)]">m</span>
              <span className="text-base font-medium tracking-tight text-white">mensa</span>
            </div>
            <div className="text-[11px] text-[var(--fg-muted)] mb-1">
              The AI treasury that proves itself.
            </div>
            <div className="text-[11px] text-[var(--fg-dim)] mb-5">
              An autonomous agent on{' '}
              <a href="https://www.mantle.xyz" target="_blank" rel="noopener noreferrer" className="text-[var(--fg-muted)] hover:text-white transition">
                Mantle
              </a>
            </div>

            {/* Socials — X kept as placeholder, Telegram links to user */}
            <div className="flex items-center gap-3 mb-5">
              {/* X / Twitter — empty for now, kept disabled until account exists */}
              <span
                className="w-8 h-8 rounded-md border border-[var(--border)] flex items-center justify-center text-[var(--fg-dim)] cursor-not-allowed opacity-40"
                title="Twitter / X — coming soon"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </span>

              {/* Telegram — redirects to user */}
              <a
                href="https://t.me/Obsedar"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-md border border-[var(--border)] flex items-center justify-center text-[var(--fg-muted)] hover:text-white hover:border-[var(--accent)] transition"
                title="Telegram — @Obsedar"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
                </svg>
              </a>

              {/* GitHub */}
              <a
                href="https://github.com/obseasd/mensa"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-md border border-[var(--border)] flex items-center justify-center text-[var(--fg-muted)] hover:text-white hover:border-[var(--accent)] transition"
                title="GitHub"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M12 .297C5.37.297 0 5.67 0 12.297c0 5.303 3.438 9.8 8.205 11.385.6.111.82-.26.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.834 2.807 1.304 3.492.997.107-.776.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.218.694.825.576C20.565 22.092 24 17.594 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
              </a>
            </div>

            <div className="text-[10px] text-[var(--fg-dim)] flex items-center gap-2">
              <span className="pulse" />
              Live on Mantle Mainnet
            </div>
          </div>

          {/* Columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-3">Product</div>
              <ul className="space-y-2 text-[var(--fg-muted)]">
                <li><Link href="/" className="hover:text-white transition">Agent</Link></li>
                <li><Link href="/tournament" className="hover:text-white transition">Tournament</Link></li>
                <li><Link href="/backtest" className="hover:text-white transition">Backtest</Link></li>
                <li><Link href="/deposit" className="hover:text-white transition">Deposit</Link></li>
                <li><Link href="/leaderboard" className="hover:text-white transition">Leaderboard</Link></li>
              </ul>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-3">Resources</div>
              <ul className="space-y-2 text-[var(--fg-muted)]">
                <li><Link href="/pitch" className="hover:text-white transition">Pitch deck</Link></li>
                <li><Link href="/docs" className="hover:text-white transition">Documentation</Link></li>
                <li><Link href="/docs#mvp-scope" className="hover:text-white transition">MVP scope & roadmap</Link></li>
                <li><Link href="/docs#compliance" className="hover:text-white transition">Compliance posture</Link></li>
                <li>
                  <a href="https://mensa-mu.vercel.app/api/agent-card" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                    Agent card (ERC-8004)
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-3">On-chain</div>
              <ul className="space-y-2 text-[var(--fg-muted)]">
                <li>
                  <a href="https://mantlescan.xyz/address/0xAcA925e51E7C801Af4E4080f041AF0ec112CCe49#code" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                    MensaAgent
                  </a>
                </li>
                <li>
                  <a href="https://mantlescan.xyz/address/0x92E6B40da9566d6b7176420D88818500dB77d122#code" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                    TournamentVault
                  </a>
                </li>
                <li>
                  <a href="https://mantlescan.xyz/address/0xD889B7819eF45cda7b9D30bA677A27E0ef6788Fe#code" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                    DecisionLog
                  </a>
                </li>
                <li>
                  <a href="https://mantlescan.xyz/address/0x6671E554Da8e874D7aF5F106D21b1930218560B6#code" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                    Agent Identity (ERC-8004)
                  </a>
                </li>
                <li>
                  <a href="https://mantlescan.xyz/address/0x3a0Dd90212838f32a953Acd4B32596b62859324A" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                    AI operator wallet
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-3">Built with</div>
              <ul className="space-y-2 text-[var(--fg-muted)]">
                <li>
                  <a href="https://www.mantle.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                    Mantle Network
                  </a>
                </li>
                <li>
                  <a href="https://www.anthropic.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                    Anthropic (Claude)
                  </a>
                </li>
                <li>
                  <a href="https://ondo.finance" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                    Ondo (USDY)
                  </a>
                </li>
                <li>
                  <a href="https://www.coingecko.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                    Coingecko
                  </a>
                </li>
                <li>
                  <a href="https://defillama.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                    DefiLlama
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border)]">
          <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-[var(--fg-dim)]">
            <div>
              © Mensa 2026. Built for the{' '}
              <a href="https://dorahacks.io/hackathon/mantleturingtesthackathon2026/" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)] underline">
                Mantle Turing Test Hackathon 2026
              </a>
              {' '}· MIT license · No financial advice
            </div>
            <div className="mono">v0.1.0 · {process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev'}</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
