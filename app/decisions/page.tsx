import Nav from '@/components/Nav'
import DecisionsList from '@/components/DecisionsList'

export default function DecisionsPage() {
  return (
    <div className="min-h-screen relative">
      <Nav />

      <main className="relative z-10 max-w-4xl mx-auto px-6 pt-12 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-medium tracking-tight mb-2">Decisions</h1>
          <p className="text-sm text-[var(--fg-muted)]">
            Every Mensa decision is logged on-chain with reasoning. No black box.
            Every transaction is verifiable on Mantlescan.
          </p>
        </div>

        <DecisionsList />
      </main>
    </div>
  )
}
