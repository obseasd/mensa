import { NextResponse } from 'next/server'
import { getDecisionsWithReasoning } from '@/lib/contract'

// Decisions live in event logs and require walking back the chain in chunks,
// so this route is split out from /api/onchain to keep that page fast.
// Cached at the edge for 60s so the modal opens instantly for repeat viewers.
export const revalidate = 60
export const maxDuration = 30

export async function GET() {
  try {
    const decisions = await getDecisionsWithReasoning(20)
    return NextResponse.json({
      decisions: decisions.map(d => ({
        ...d,
        metaParam1: d.metaParam1.toString(),
        metaParam2: d.metaParam2.toString(),
      })),
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, decisions: [] }, { status: 500 })
  }
}
