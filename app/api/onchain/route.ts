import { NextResponse } from 'next/server'
import { getProtocolStats, getRecentRounds, computeAlphaFromRounds } from '@/lib/contract'

export const dynamic = 'force-dynamic'
export const revalidate = 0
// rpc.mantle.xyz batchMaxCount=1 makes each read its own HTTP roundtrip,
// so the full fan-out can take 5-10s. Give Vercel headroom past the
// default 10s serverless timeout.
export const maxDuration = 30

export async function GET() {
  try {
    // Fetch protocol stats + rounds in parallel. Then derive both alpha
    // snapshots (full + calibrated, which excludes the cold-start round #1)
    // locally from the same rounds array instead of re-fetching them twice.
    // This cuts the work from ~3x rounds reads down to 1x.
    const [stats, rounds] = await Promise.all([
      getProtocolStats(),
      getRecentRounds(60),
    ])
    const alpha = computeAlphaFromRounds(rounds)
    const alphaCalibrated = computeAlphaFromRounds(rounds, [1])

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
