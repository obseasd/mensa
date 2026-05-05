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

        {/* Why Mantle */}
        <section className="mt-20 mb-12">
          <div className="mb-6">
            <h2 className="text-xl font-medium">Built for Mantle</h2>
            <p className="text-sm text-[var(--fg-muted)] mt-1">Mensa is not a portable agent. It is built around Mantle&apos;s unique stack.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {[
              {
                title: 'Native mETH staking',
                detail: 'Mensa stakes ETH via Mantle\'s native liquid staking contract. The agent rebalances yields between mETH and USDY in real time.',
              },
              {
                title: 'Ondo USDY integration',
                detail: 'Real T-bill yield via Ondo\'s USDY deployment on Mantle. Risk-adjusted allocations across CeFi-grade RWA.',
              },
              {
                title: 'Low-gas decision log',
                detail: 'Every agent decision — including reasoning — is written on-chain. Mantle\'s low fees make full transparency economically viable.',
              },
              {
                title: 'Byreal Skills CLI',
                detail: 'Mensa exposes its agent loop as a Byreal Skill, callable from any compatible agent runtime. Composable by design.',
              },
              {
                title: 'Bybit signal integration',
                detail: 'Off-chain market signals via Bybit API enrich the agent\'s decision context. CeFi data, DeFi execution.',
              },
              {
                title: 'Tournament smart contract',
                detail: 'A vault that pits AI vs human allocators on identical inputs. Performance is settled on-chain after each round.',
              },
            ].map(({ title, detail }) => (
              <div key={title} className="card p-5">
                <div className="text-sm font-medium mb-2">{title}</div>
                <div className="text-xs text-[var(--fg-muted)] leading-relaxed">{detail}</div>
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
