import { NextRequest, NextResponse } from 'next/server'
import { runBacktest } from '@/lib/backtest'

// Backtest is computed from public ETH price history + a deterministic strategy
// rule, so cache aggressively. Recomputing 90 days of price math + the simulation
// every request is wasteful and rate-limits Coingecko.
export const revalidate = 1800 // 30 min
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const days = Math.min(365, Math.max(7, Number(req.nextUrl.searchParams.get('days') || 90)))
  try {
    const result = await runBacktest(days)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
