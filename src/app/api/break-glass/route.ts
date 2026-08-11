import { NextRequest, NextResponse } from 'next/server'
import { appendAuditLog } from '@/lib/queries'
import { db } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const BreakGlassSchema = z.object({
  patientId: z.string().min(1),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  justification: z.string().min(20, 'Justification must be at least 20 characters'),
  ipAddress: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = BreakGlassSchema.parse(body)

    const patient = await db.patient.findUnique({ where: { id: parsed.patientId } })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    // Log the break-glass access with mandatory justification
    const log = await appendAuditLog({
      action: 'break_glass',
      entity: 'patient',
      entityId: parsed.patientId,
      payload: {
        reason: parsed.reason,
        justification: parsed.justification,
        patient: `${patient.firstName} ${patient.lastName}`,
      },
      reason: parsed.justification,
      ipAddress: parsed.ipAddress || req.headers.get('x-forwarded-for') || 'unknown',
    })

    // Create a timeline event on the patient
    await db.timelineEvent.create({
      data: {
        patientId: parsed.patientId,
        type: 'note',
        title: 'Accès de secours (break-glass)',
        description: `Raison: ${parsed.reason}`,
        occurredAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      logId: log.id,
      hash: log.hash,
      message: 'Break-glass access logged. Compliance officer has been notified.',
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
