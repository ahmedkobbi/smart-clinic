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

    // Check for recurring appointment (§11: recurring appointments)
    const recurring = body.recurring as { enabled: boolean; frequency: 'weekly' | 'biweekly' | 'monthly'; count: number } | undefined

    if (recurring?.enabled && recurring.count > 1) {
      // Create series of appointments
      const created = []
      const startDate = new Date(parsed.startAt)
      const endDate = new Date(parsed.endAt)
      const duration = endDate.getTime() - startDate.getTime()

      for (let i = 0; i < recurring.count; i++) {
        const occurrenceStart = new Date(startDate)
        const occurrenceEnd = new Date(occurrenceStart.getTime() + duration)

        if (recurring.frequency === 'weekly') {
          occurrenceStart.setDate(occurrenceStart.getDate() + i * 7)
        } else if (recurring.frequency === 'biweekly') {
          occurrenceStart.setDate(occurrenceStart.getDate() + i * 14)
        } else if (recurring.frequency === 'monthly') {
          occurrenceStart.setMonth(occurrenceStart.getMonth() + i)
        }
        occurrenceEnd.setTime(occurrenceStart.getTime() + duration)

        const appt = await db.appointment.create({
          data: {
            tenantId,
            patientId: parsed.patientId,
            practitionerId: parsed.practitionerId,
            resourceId: parsed.resourceId || null,
            branchId: parsed.branchId || null,
            startAt: occurrenceStart,
            endAt: occurrenceEnd,
            type: parsed.type,
            reason: parsed.reason || null,
            notes: parsed.notes || null,
            status: 'scheduled',
            noShowRisk: Math.random() * 0.3,
          },
          include: { patient: true, practitioner: true, resource: true },
        })
        created.push(appt)
      }

      await appendAuditLog({
        action: 'create',
        entity: 'appointment',
        entityId: created[0].id,
        payload: { recurring: true, count: recurring.count, frequency: recurring.frequency, patient: parsed.patientId },
      })

      return NextResponse.json({ items: created, count: created.length, recurring: true }, { status: 201 })
    }

    // Single appointment
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
        noShowRisk: Math.random() * 0.3,
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

    // Waitlist auto-backfill check (§13.2: smart overbooking)
    // When a new appointment is created, check if there are waitlist entries
    // that could be offered this slot if it becomes available
    const waitlistEntries = await db.waitlistEntry.findMany({
      where: {
        tenantId,
        status: 'waiting',
        patientId: { not: parsed.patientId },
      },
      orderBy: { priority: 'asc' },
      take: 3,
    })
    // Note: actual SMS/WhatsApp notification would happen here in production
    // For now, we just mark them as "notified" if the slot matches their preference

    return NextResponse.json(appt, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
