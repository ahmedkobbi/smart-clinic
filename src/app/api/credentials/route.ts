import { NextRequest, NextResponse } from 'next/server'
import { getTenantId } from '@/lib/queries'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const tenantId = await getTenantId()
    const credentials = await db.staffCredential.findMany({
      where: { tenantId },
      include: { practitioner: true },
      orderBy: { expiresAt: 'asc' },
    })

    // Compute status dynamically based on expiry
    const now = new Date()
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
    const computed = credentials.map((c) => {
      let status = c.status
      if (c.expiresAt) {
        if (c.expiresAt < now) status = 'expired'
        else if (c.expiresAt < ninetyDaysFromNow) status = 'expiring_soon'
        else status = 'valid'
      } else {
        status = 'valid'
      }
      return { ...c, status }
    })

    return NextResponse.json({ items: computed })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
