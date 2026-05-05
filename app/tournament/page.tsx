import Nav from '@/components/Nav'
import TournamentList from '@/components/TournamentList'
import TournamentHowItWorks from '@/components/TournamentHowItWorks'

export default function TournamentPage() {
  return (
    <div className="min-h-screen relative">
      <Nav />

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-medium tracking-tight mb-2">Tournament</h1>
          <p className="text-sm text-[var(--fg-muted)]">
            The Turing Test. AI vs Human, identical inputs, settled on-chain.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <TournamentList />
          <aside>
            <TournamentHowItWorks />
          </aside>
        </div>
      </main>
    </div>
  )
}
