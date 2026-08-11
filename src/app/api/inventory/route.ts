import { NextRequest, NextResponse } from 'next/server'
import { getInventory } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const items = await getInventory()
    return NextResponse.json({ items })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
