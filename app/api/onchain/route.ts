import { NextResponse } from 'next/server'
import { getProtocolStats, getDecisionsWithReasoning, getRecentRounds } from '@/lib/contract'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const [stats, decisions, rounds] = await Promise.all([
      getProtocolStats(),
      getDecisionsWithReasoning(20),
      getRecentRounds(20),
    ])
    return NextResponse.json({ stats, decisions: decisions.map(d => ({
      ...d,
      metaParam1: d.metaParam1.toString(),
      metaParam2: d.metaParam2.toString(),
    })), rounds: rounds.map(r => ({
      ...r,
      aiReturnBps: r.aiReturnBps.toString(),
      humanReturnBps: r.humanReturnBps.toString(),
    })) })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
