import { NextRequest, NextResponse } from 'next/server'
import { appendAuditLog } from '@/lib/queries'
import { db } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const StatusSchema = z.object({
  status: z.enum(['scheduled', 'confirmed', 'checked_in', 'in_session', 'completed', 'cancelled', 'no_show']),
  reason: z.string().optional(),
})

const VALID_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['confirmed', 'checked_in', 'cancelled', 'no_show'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['in_session', 'completed', 'cancelled'],
  in_session: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const parsed = StatusSchema.parse(body)

    const appt = await db.appointment.findUnique({ where: { id }, include: { patient: true } })
    if (!appt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const allowed = VALID_TRANSITIONS[appt.status] || []
    if (!allowed.includes(parsed.status)) {
      return NextResponse.json({
        error: `Invalid transition: ${appt.status} → ${parsed.status}`,
      }, { status: 400 })
    }

    const updated = await db.appointment.update({
      where: { id },
      data: { status: parsed.status },
      include: { patient: true, practitioner: true },
    })

    await appendAuditLog({
      action: 'update',
      entity: 'appointment',
      entityId: id,
      payload: { from: appt.status, to: parsed.status, patient: appt.patientId },
    })

    // Waitlist auto-backfill (§13.2: smart overbooking)
    // When an appointment is cancelled, check waitlist for patients who
    // could fill the slot, sorted by priority
    if (parsed.status === 'cancelled') {
      const waitlistEntries = await db.waitlistEntry.findMany({
        where: {
          tenantId: appt.tenantId,
          status: 'waiting',
          patientId: { not: appt.patientId },
        },
        include: { patient: true },
        orderBy: { priority: 'asc' },
        take: 3,
      })

      // Notify top waitlist entries (simulate SMS/WhatsApp)
      for (const entry of waitlistEntries) {
        await db.waitlistEntry.update({
          where: { id: entry.id },
          data: { status: 'notified', notifiedAt: new Date() },
        })
        // In production: send SMS/WhatsApp via Twilio/WhatsApp Business API
        // For now: create a timeline event
        await db.timelineEvent.create({
          data: {
            patientId: entry.patientId,
            type: 'note',
            title: 'Notification liste d\'attente',
            description: `Créneau libéré — ${appt.startAt.toISOString()}`,
            occurredAt: new Date(),
          },
        })
      }
    }

    // Add timeline event for significant transitions
    if (parsed.status === 'completed') {
      await db.timelineEvent.create({
        data: {
          patientId: appt.patientId,
          type: 'appointment',
          title: `Consultation terminée`,
          description: `${appt.reason || 'Consultation'} — ${appt.practitionerId}`,
          occurredAt: new Date(),
        },
      })
    } else if (parsed.status === 'checked_in') {
      await db.timelineEvent.create({
        data: {
          patientId: appt.patientId,
          type: 'appointment',
          title: `Patient arrivé`,
          description: `Check-in pour ${appt.reason || 'consultation'}`,
          occurredAt: new Date(),
        },
      })
    }

    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
