import { NextResponse } from 'next/server'
import { simulateMatchup } from '@/lib/simulation'

export const revalidate = 60

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const aiAlloc = Number(url.searchParams.get('ai') ?? '50')
    const humanAlloc = Number(url.searchParams.get('human') ?? '50')
    const days = Number(url.searchParams.get('days') ?? '1')

    if (Number.isNaN(aiAlloc) || aiAlloc < 0 || aiAlloc > 100) {
      return NextResponse.json({ error: 'invalid ai allocation' }, { status: 400 })
    }
    if (Number.isNaN(humanAlloc) || humanAlloc < 0 || humanAlloc > 100) {
      return NextResponse.json({ error: 'invalid human allocation' }, { status: 400 })
    }

    const result = await simulateMatchup(aiAlloc, humanAlloc, days)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
