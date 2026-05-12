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

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--border)] mt-20" style={{ background: '#0F1010' }}>
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-xs">
          {/* Brand + chain */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center text-sm font-bold text-[var(--accent)]">m</span>
              <span className="text-sm font-medium tracking-tight text-white">mensa</span>
            </div>
            <div className="text-[var(--fg-muted)] leading-relaxed">
              The AI treasury that proves itself.
            </div>
            <div className="flex items-center gap-2 mt-3 text-[var(--fg-dim)]">
              <span className="pulse" />
              <span>Live on Mantle Mainnet</span>
            </div>
          </div>

          {/* Product */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-3">Product</div>
            <ul className="space-y-1.5 text-[var(--fg-muted)]">
              <li><Link href="/" className="hover:text-white transition">Agent</Link></li>
              <li><Link href="/tournament" className="hover:text-white transition">Tournament</Link></li>
              <li><Link href="/backtest" className="hover:text-white transition">Backtest</Link></li>
              <li><Link href="/deposit" className="hover:text-white transition">Deposit</Link></li>
              <li><Link href="/leaderboard" className="hover:text-white transition">Leaderboard</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-3">Resources</div>
            <ul className="space-y-1.5 text-[var(--fg-muted)]">
              <li><Link href="/pitch" className="hover:text-white transition">Pitch deck</Link></li>
              <li><Link href="/docs" className="hover:text-white transition">Architecture & docs</Link></li>
              <li><Link href="/docs#mvp-scope" className="hover:text-white transition">MVP scope & roadmap</Link></li>
              <li>
                <a href="https://mantlescan.xyz/address/0xAcA925e51E7C801Af4E4080f041AF0ec112CCe49#code" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                  Contracts on Mantlescan
                </a>
              </li>
              <li>
                <a href="https://github.com/obseasd/mensa" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                  Source on GitHub
                </a>
              </li>
            </ul>
          </div>

          {/* Built with */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-3">Built with</div>
            <ul className="space-y-1.5 text-[var(--fg-muted)]">
              <li>
                <a href="https://www.mantle.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                  Mantle Network
                </a>
              </li>
              <li>
                <a href="https://www.anthropic.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                  Anthropic (Claude Haiku 4.5)
                </a>
              </li>
              <li>
                <a href="https://ondo.finance" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                  Ondo Finance (USDY)
                </a>
              </li>
              <li>
                <a href="https://www.coingecko.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                  Coingecko + DefiLlama
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[var(--border)]">
          <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-[var(--fg-dim)]">
            <div>
              Built for the{' '}
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
