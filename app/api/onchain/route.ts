import { NextResponse } from 'next/server'
import { getProtocolStats, getRecentRounds, getAlphaStats } from '@/lib/contract'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Round #1 was the genesis decision before the memory loop existed.
    // 'alphaCalibrated' excludes it so we can show "alpha since AI started learning".
    const [stats, rounds, alpha, alphaCalibrated] = await Promise.all([
      getProtocolStats(),
      getRecentRounds(60),
      getAlphaStats(60),
      getAlphaStats(60, [1]),
    ])
    return NextResponse.json({
      stats: { ...stats, alpha, alphaCalibrated },
      rounds: rounds.map(r => ({
        ...r,
        startMethPrice: r.startMethPrice.toString(),
        startUsdyPrice: r.startUsdyPrice.toString(),
        settleMethPrice: r.settleMethPrice.toString(),
        settleUsdyPrice: r.settleUsdyPrice.toString(),
        aiReturnBps: r.aiReturnBps.toString(),
        humanReturnBps: r.humanReturnBps.toString(),
      })),
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
