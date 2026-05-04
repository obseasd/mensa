import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/contract'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ address: string }> }) {
  try {
    const { address } = await ctx.params
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
    }
    const profile = await getUserProfile(address)
    return NextResponse.json({
      ...profile,
      claimableBounty: profile.claimableBounty.toString(),
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
