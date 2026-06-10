import { NextResponse } from 'next/server'
import { getProtocolStats, getRecentRounds, computeAlphaFromRounds, isImplausibleRound } from '@/lib/contract'

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

    // Strip rounds with implausibly large 24h moves (>±30% on either leg).
    // These are off-chain price feed glitches (Coingecko fallback at settle
    // time wrote a constant instead of a real price). The math on chain is
    // correct relative to the recorded prices, but the prices themselves
    // are garbage. Excluding them is the only honest move; the contract
    // outcome is immutable but the UI does not need to surface noise.
    const cleanRounds = rounds.filter(r => !isImplausibleRound(r))

    // Adjust the on-chain win counters: the contract increments aiWins or
    // humanWins on every settle, including the corrupted rounds. We rebase
    // those counts to exclude any anomaly that ended up flipping the AI
    // outcome.
    let aiWinsAdj = stats.aiWins
    let humanWinsAdj = stats.humanWins
    for (const r of rounds) {
      if (!r.settled) continue
      if (!isImplausibleRound(r)) continue
      if (r.outcome === 1) aiWinsAdj = Math.max(0, aiWinsAdj - 1)
      else if (r.outcome === 2) humanWinsAdj = Math.max(0, humanWinsAdj - 1)
    }
    const totalSettledClean = aiWinsAdj + humanWinsAdj
    const aiWinRateAdj = totalSettledClean > 0 ? (aiWinsAdj / totalSettledClean) * 100 : 0

    const cleanStats = {
      ...stats,
      aiWins: aiWinsAdj,
      humanWins: humanWinsAdj,
      aiWinRatePct: aiWinRateAdj,
    }

    const alpha = computeAlphaFromRounds(cleanRounds)
    const alphaCalibrated = computeAlphaFromRounds(cleanRounds, [1])

    return NextResponse.json({
      stats: { ...cleanStats, alpha, alphaCalibrated },
      // Count of rounds we suppressed so the UI can be transparent about it
      // if it wants to ("57 settled rounds shown, 1 excluded as price-feed
      // anomaly"). The contract still has all the data, this is purely a
      // display sanitization.
      excludedAnomalies: rounds.length - cleanRounds.length,
      rounds: cleanRounds.map(r => ({
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
