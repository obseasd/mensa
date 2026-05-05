import { NextResponse } from 'next/server'
import { getPoolHistory } from '@/lib/yields'

export const revalidate = 600

export async function GET(_req: Request, ctx: { params: Promise<{ poolId: string }> }) {
  try {
    const { poolId } = await ctx.params
    const history = await getPoolHistory(poolId)
    return NextResponse.json({ history })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
