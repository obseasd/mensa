import { NextResponse } from 'next/server'
import { getProtocolStats, getRecentRounds, getAlphaStats } from '@/lib/contract'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const [stats, rounds, alpha] = await Promise.all([
      getProtocolStats(),
      getRecentRounds(20),
      getAlphaStats(20),
    ])
    return NextResponse.json({
      stats: { ...stats, alpha },
      rounds: rounds.map(r => ({
        ...r,
        startMethPrice: r.startMethPrice.toString(),
        startUsdyPrice: r.startUsdyPrice.toString(),
        aiReturnBps: r.aiReturnBps.toString(),
        humanReturnBps: r.humanReturnBps.toString(),
      })),
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
