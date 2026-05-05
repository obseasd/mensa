import Link from 'next/link'
import Nav from '@/components/Nav'
import AgentLive from '@/components/AgentLive'
import OnChainStats from '@/components/OnChainStats'
import HomeTournamentFeed from '@/components/HomeTournamentFeed'

export default function Home() {
  return (
    <div className="min-h-screen relative">
      <Nav />

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs text-[var(--fg-muted)] border border-[var(--border)] mb-8">
            <span className="pulse" />
            Live on Mantle Mainnet
          </div>

          <h1 className="text-5xl md:text-6xl font-medium tracking-tight leading-[1.05] mb-6">
            The AI treasury<br/>
            that proves itself.
          </h1>

          <p className="text-lg text-[var(--fg-muted)] leading-relaxed max-w-2xl mb-8">
            Mensa allocates your funds across mETH and USDY on Mantle, then
            competes against humans to prove every decision. Every choice is
            explained, logged on-chain, and challenged.
          </p>

          <div className="flex items-center gap-3 mb-12">
            <Link href="/deposit" className="btn-accent">Try with $1 USDY</Link>
            <Link href="/tournament" className="btn-secondary">Watch the Tournament</Link>
          </div>

          {/* Live on-chain stats */}
          <OnChainStats />
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
                title: 'Composable as an agent skill',
                detail: 'Mensa’s reasoning loop and on-chain calls are exposed as a Byreal Skill, callable from any compatible agent runtime. Bybit signals enrich the context.',
                stack: 'Byreal Skills CLI · Bybit market data API',
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
      <footer className="relative z-10 border-t border-[var(--border)] mt-20">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-[var(--fg-muted)]">
          <div className="flex items-center gap-4">
            <span>mensa</span>
            <a href="https://github.com/obseasd/mensa" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">GitHub</a>
            <a href="https://mantlescan.xyz/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Mantlescan</a>
          </div>
          <div className="flex items-center gap-2">
            <span className="pulse" />
            <span>Mantle Mainnet</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
