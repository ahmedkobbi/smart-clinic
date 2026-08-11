import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')

    const where: any = {}
    if (status && status !== 'all') where.status = status

    const instances = await db.instance.findMany({
      where,
      include: {
        license: { select: { customerName: true, licenseKey: true, plan: true } },
        _count: { select: { telemetryEvents: true } },
      },
      orderBy: { lastSeenAt: 'desc' },
    })

    return NextResponse.json({ items: instances })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
