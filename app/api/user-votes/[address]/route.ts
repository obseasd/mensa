import { NextResponse } from 'next/server'
import { getUserVotes } from '@/lib/contract'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(_req: Request, ctx: { params: Promise<{ address: string }> }) {
  try {
    const { address } = await ctx.params
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
    }
    const votes = await getUserVotes(address)
    return NextResponse.json({ votes })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
