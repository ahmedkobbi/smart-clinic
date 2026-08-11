import { NextRequest, NextResponse } from 'next/server'
import { getAppointments, getTenantId, appendAuditLog } from '@/lib/queries'
import { db } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const ApptCreateSchema = z.object({
  patientId: z.string().min(1),
  practitionerId: z.string().min(1),
  resourceId: z.string().optional(),
  branchId: z.string().optional(),
  startAt: z.string(),
  endAt: z.string(),
  type: z.enum(['consultation', 'follow_up', 'telemedicine', 'procedure', 'walk_in']).default('consultation'),
  reason: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const branchId = url.searchParams.get('branchId') || undefined
    const practitionerId = url.searchParams.get('practitionerId') || undefined
    const status = url.searchParams.get('status') || undefined
    const patientId = url.searchParams.get('patientId') || undefined

    const result = await getAppointments({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      branchId,
      practitionerId,
      status,
      patientId,
    })
    return NextResponse.json({ items: result })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = ApptCreateSchema.parse(body)
    const tenantId = await getTenantId()
    const appt = await db.appointment.create({
      data: {
        tenantId,
        patientId: parsed.patientId,
        practitionerId: parsed.practitionerId,
        resourceId: parsed.resourceId || null,
        branchId: parsed.branchId || null,
        startAt: new Date(parsed.startAt),
        endAt: new Date(parsed.endAt),
        type: parsed.type,
        reason: parsed.reason || null,
        notes: parsed.notes || null,
        status: 'scheduled',
        noShowRisk: Math.random() * 0.3, // low baseline for new appointments
      },
      include: { patient: true, practitioner: true, resource: true },
    })
    await appendAuditLog({
      action: 'create',
      entity: 'appointment',
      entityId: appt.id,
      payload: { patient: appt.patientId, practitioner: appt.practitionerId },
    })
    await db.timelineEvent.create({
      data: {
        patientId: parsed.patientId,
        type: 'appointment',
        title: `Rendez-vous planifié`,
        description: `${appt.reason || 'Consultation'} — ${appt.startAt.toISOString()}`,
        occurredAt: new Date(),
      },
    })
    return NextResponse.json(appt, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
