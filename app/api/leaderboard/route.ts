import { NextResponse } from 'next/server'
import { getLeaderboard, getBountyStats } from '@/lib/contract'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const [profiles, bounty] = await Promise.all([
      getLeaderboard(100),
      getBountyStats(),
    ])
    return NextResponse.json({
      profiles: profiles.map(p => ({
        ...p,
        claimableBounty: p.claimableBounty.toString(),
      })),
      bounty,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
