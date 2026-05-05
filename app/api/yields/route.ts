import { NextResponse } from 'next/server'
import { getMantleYields } from '@/lib/yields'

export const revalidate = 300 // 5min cache

export async function GET() {
  try {
    const pools = await getMantleYields()
    return NextResponse.json({ pools })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
