import { NextRequest, NextResponse } from 'next/server'
import { getTenantId, appendAuditLog } from '@/lib/queries'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const url = new URL(req.url)
    const status = url.searchParams.get('status')

    const where: any = { tenantId }
    if (status && status !== 'all') where.status = status

    const entries = await db.waitlistEntry.findMany({
      where,
      include: { patient: true, practitioner: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ items: entries })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const body = await req.json()
    const { patientId, practitionerId, reason, preferredDate, preferredTimeOfDay, priority } = body

    if (!patientId || !reason) {
      return NextResponse.json({ error: 'patientId, reason required' }, { status: 400 })
    }

    const entry = await db.waitlistEntry.create({
      data: {
        tenantId,
        patientId,
        practitionerId: practitionerId || null,
        reason,
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        preferredTimeOfDay: preferredTimeOfDay || null,
        priority: priority || 5,
        status: 'waiting',
      },
      include: { patient: true, practitioner: true },
    })

    await appendAuditLog({
      action: 'create',
      entity: 'patient',
      entityId: patientId,
      payload: { action: 'waitlist_add', reason, priority },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}

// PATCH — notify a waitlist entry (simulate SMS sent)
export async function PATCH(req: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const body = await req.json()
    const { id, action } = body

    if (action === 'notify') {
      const entry = await db.waitlistEntry.update({
        where: { id },
        data: { status: 'notified', notifiedAt: new Date() },
        include: { patient: true },
      })
      await appendAuditLog({
        action: 'create',
        entity: 'patient',
        entityId: entry.patientId,
        payload: { action: 'waitlist_notify', phone: entry.patient.phone },
      })
      return NextResponse.json({ success: true, message: `SMS envoyé à ${entry.patient.phone}` })
    }
    if (action === 'schedule') {
      const entry = await db.waitlistEntry.update({
        where: { id },
        data: { status: 'scheduled' },
        include: { patient: true },
      })
      return NextResponse.json({ success: true, message: 'Patient scheduled' })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
