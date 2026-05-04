import Nav from '@/components/Nav'
import Leaderboard from '@/components/Leaderboard'

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen relative">
      <Nav />
      <main className="relative z-10 max-w-4xl mx-auto px-6 pt-12 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-medium tracking-tight mb-2">Leaderboard</h1>
          <p className="text-sm text-[var(--fg-muted)]">
            Top humans by reputation. Higher reputation = more vote weight + bigger share of the bounty pool.
          </p>
        </div>
        <Leaderboard />
      </main>
    </div>
  )
}
