import Nav from '@/components/Nav'
import TournamentList from '@/components/TournamentList'

export default function TournamentPage() {
  return (
    <div className="min-h-screen relative">
      <Nav />

      <main className="relative z-10 max-w-4xl mx-auto px-6 pt-12 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-medium tracking-tight mb-2">Tournament</h1>
          <p className="text-sm text-[var(--fg-muted)]">
            The Turing Test. AI vs Human, identical inputs, settled on-chain.
          </p>
        </div>

        <TournamentList />
      </main>
    </div>
  )
}
