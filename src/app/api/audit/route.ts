import { NextRequest, NextResponse } from 'next/server'
import { getAuditLogs, verifyAuditChain } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || undefined
    const entity = url.searchParams.get('entity') || undefined
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const result = await getAuditLogs({ action, entity, limit, offset })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // Verify audit chain
  try {
    const result = await verifyAuditChain()
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
