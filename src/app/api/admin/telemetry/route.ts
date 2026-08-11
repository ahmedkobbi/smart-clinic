import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

// Get telemetry events for a specific instance (or all, with filters)
export async function GET(req: NextRequest) {
  // Auth check — superadmin only
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  try {
    const url = new URL(req.url)
    const instanceId = url.searchParams.get('instanceId')
    const eventType = url.searchParams.get('eventType')
    const limit = parseInt(url.searchParams.get('limit') || '100')

    const where: any = {}
    if (instanceId) where.instanceId = instanceId
    if (eventType && eventType !== 'all') where.eventType = eventType

    const events = await db.telemetryEvent.findMany({
      where,
      include: {
        instance: {
          select: {
            id: true,
            hostname: true,
            license: { select: { customerName: true } },
          },
        },
      },
      orderBy: { receivedAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ items: events })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
