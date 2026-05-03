import Nav from '@/components/Nav'

const ROUNDS = Array.from({ length: 47 }, (_, i) => {
  const id = 47 - i
  const aiPct = (Math.random() - 0.4) * 30
  const humanPct = (Math.random() - 0.4) * 25
  const winner = aiPct > humanPct ? 'AI' : 'Human'
  return {
    id,
    timestamp: Date.now() - i * 24 * 60 * 60 * 1000,
    aiAlloc: 30 + Math.floor(Math.random() * 50),
    humanAlloc: 30 + Math.floor(Math.random() * 50),
    aiReturn: aiPct,
    humanReturn: humanPct,
    winner,
    settled: i < 45,
  }
})

const STATS = {
  totalRounds: 47,
  aiWins: ROUNDS.filter(r => r.settled && r.winner === 'AI').length,
  humanWins: ROUNDS.filter(r => r.settled && r.winner === 'Human').length,
  ties: 0,
}

const aiWinRate = STATS.aiWins / (STATS.aiWins + STATS.humanWins) * 100

export default function TournamentPage() {
  return (
    <div className="min-h-screen relative">
      <Nav />

      <main className="relative z-10 max-w-4xl mx-auto px-6 pt-12 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-medium tracking-tight mb-2">Tournament</h1>
          <p className="text-sm text-[var(--fg-muted)]">
            The Turing Test. AI vs Human, identical inputs, settled on-chain after each round.
          </p>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: 'AI Win Rate', value: `${aiWinRate.toFixed(1)}%`, accent: true },
            { label: 'AI Wins', value: STATS.aiWins },
            { label: 'Human Wins', value: STATS.humanWins },
            { label: 'Total Rounds', value: STATS.totalRounds },
          ].map(({ label, value, accent }) => (
            <div key={label} className="card p-4">
              <div className={`text-2xl font-medium tracking-tight mono ${accent ? 'text-[var(--accent)]' : ''}`}>
                {value}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mt-2">
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Win bar */}
        <div className="card p-5 mb-8">
          <div className="flex items-center justify-between text-xs text-[var(--fg-muted)] mb-2">
            <span>AI <span className="text-white mono">{STATS.aiWins}</span></span>
            <span>Human <span className="text-white mono">{STATS.humanWins}</span></span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-[var(--border)]">
            <div
              className="bg-[var(--accent)]"
              style={{ width: `${aiWinRate}%` }}
            />
            <div
              className="bg-white/40"
              style={{ width: `${100 - aiWinRate}%` }}
            />
          </div>
        </div>

        {/* Rounds table */}
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

          {ROUNDS.slice(0, 20).map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-12 px-5 py-3 border-b border-[var(--border)] last:border-b-0 text-sm hover:bg-white/[0.01] transition"
            >
              <div className="col-span-1 mono text-[var(--fg-muted)]">#{r.id}</div>
              <div className="col-span-2 mono">{r.aiAlloc}% mETH</div>
              <div className="col-span-2 mono text-[var(--fg-muted)]">{r.humanAlloc}% mETH</div>
              <div className={`col-span-2 mono ${r.aiReturn > 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>
                {r.aiReturn > 0 ? '+' : ''}{r.aiReturn.toFixed(2)}%
              </div>
              <div className={`col-span-2 mono ${r.humanReturn > 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>
                {r.humanReturn > 0 ? '+' : ''}{r.humanReturn.toFixed(2)}%
              </div>
              <div className="col-span-2">
                {r.settled ? (
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      r.winner === 'AI'
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'bg-white/5 text-white'
                    }`}
                  >
                    {r.winner}
                  </span>
                ) : (
                  <span className="text-xs text-[var(--fg-muted)]">—</span>
                )}
              </div>
              <div className="col-span-1 text-right text-xs text-[var(--fg-muted)]">
                {r.settled ? 'Settled' : 'Live'}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between text-xs text-[var(--fg-muted)]">
          <span>Showing 20 of {STATS.totalRounds} rounds</span>
          <button className="btn-secondary text-xs">Load more</button>
        </div>
      </main>
    </div>
  )
}
