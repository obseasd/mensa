import { NextResponse } from 'next/server'
import { runAgentCycle } from '@/lib/agent'

export async function GET() {
  try {
    const decision = await runAgentCycle()
    return NextResponse.json(decision)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
