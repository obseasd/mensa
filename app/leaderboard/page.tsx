import Nav from '@/components/Nav'
import HumanLeaderboard from '@/components/HumanLeaderboard'
import LeaderboardSidebar from '@/components/LeaderboardSidebar'

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen relative">
      <Nav />
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-medium tracking-tight mb-2">Leaderboard</h1>
          <p className="text-sm text-[var(--fg-muted)] max-w-2xl">
            The humans challenging Mensa AI in the tournament. Vote your allocation,
            beat the AI, earn from the bounty pool.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <HumanLeaderboard />
          <LeaderboardSidebar />
        </div>
      </main>
    </div>
  )
}
