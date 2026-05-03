import Nav from '@/components/Nav'

const MOCK_TOURNAMENT = [
  { round: 47, ai: '+12.4%', human: '+8.1%', winner: 'AI' },
  { round: 46, ai: '+6.2%', human: '+9.8%', winner: 'Human' },
  { round: 45, ai: '+15.7%', human: '+15.2%', winner: 'AI' },
  { round: 44, ai: '+3.1%', human: '+4.4%', winner: 'Human' },
  { round: 43, ai: '+22.0%', human: '+11.5%', winner: 'AI' },
]

const STATS = [
  { label: 'AI Win Rate', value: '63%', detail: '47 rounds' },
  { label: 'Avg AI Return', value: '+8.4%', detail: '30-day rolling' },
  { label: 'Total TVL', value: '$0', detail: 'Live on Mantle' },
  { label: 'Decisions Logged', value: '0', detail: 'on-chain' },
]

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
            <button className="btn-accent">Try with $1 USDY</button>
            <button className="btn-secondary">Watch the Tournament</button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STATS.map(({ label, value, detail }) => (
              <div key={label} className="card p-4">
                <div className="text-2xl font-medium tracking-tight mono">{value}</div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-2">{label}</div>
                <div className="text-[10px] text-[var(--fg-dim)] mt-1">{detail}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tournament Feed */}
        <section className="mt-20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-medium">Live Tournament</h2>
              <p className="text-sm text-[var(--fg-muted)] mt-1">AI vs Human, same inputs, same time horizon, settled on-chain.</p>
            </div>
            <button className="btn-secondary text-xs">View all</button>
          </div>

          <div className="card overflow-hidden">
            <div className="grid grid-cols-12 px-5 py-3 border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">
              <div className="col-span-2">Round</div>
              <div className="col-span-3">AI</div>
              <div className="col-span-3">Human</div>
              <div className="col-span-2">Winner</div>
              <div className="col-span-2 text-right">Status</div>
            </div>
            {MOCK_TOURNAMENT.map(({ round, ai, human, winner }) => (
              <div key={round} className="grid grid-cols-12 px-5 py-4 border-b border-[var(--border)] last:border-b-0 text-sm hover:bg-white/[0.01] transition">
                <div className="col-span-2 mono text-[var(--fg-muted)]">#{round}</div>
                <div className={`col-span-3 mono ${winner === 'AI' ? 'text-[var(--accent)]' : 'text-[var(--fg)]'}`}>{ai}</div>
                <div className={`col-span-3 mono ${winner === 'Human' ? 'text-[var(--accent)]' : 'text-[var(--fg)]'}`}>{human}</div>
                <div className="col-span-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${winner === 'AI' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'bg-white/5 text-[var(--fg-muted)]'}`}>{winner}</span>
                </div>
                <div className="col-span-2 text-right text-[var(--fg-muted)] text-xs">Settled</div>
              </div>
            ))}
          </div>
        </section>

        {/* What Mensa is thinking */}
        <section className="mt-20">
          <div className="mb-6">
            <h2 className="text-xl font-medium">What Mensa is thinking</h2>
            <p className="text-sm text-[var(--fg-muted)] mt-1">The latest on-chain decision, with reasoning. No black box.</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="pulse" />
              <span className="text-xs text-[var(--fg-muted)]">3 minutes ago</span>
            </div>

            <p className="text-base leading-relaxed mb-4">
              Increased <span className="text-[var(--accent)]">mETH allocation from 40% to 55%</span>.
              Mantle staking yield is now <span className="mono">4.2%</span> APR, while USDY T-bill yield dropped to{' '}
              <span className="mono">3.8%</span>. The 40bps spread justifies rebalancing despite{' '}
              <span className="mono">~$0.18</span> in gas costs.
            </p>

            <div className="flex items-center gap-3 text-xs text-[var(--fg-muted)]">
              <span>Confidence: <span className="text-white mono">87%</span></span>
              <span>•</span>
              <span>Tx: <a href="#" className="mono text-[var(--accent)] hover:underline">0xab12...cd34</a></span>
              <span>•</span>
              <span>Block <span className="mono">87234012</span></span>
            </div>
          </div>
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
