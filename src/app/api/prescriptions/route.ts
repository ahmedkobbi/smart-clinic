import { NextRequest, NextResponse } from 'next/server'
import { getTenantId, appendAuditLog } from '@/lib/queries'
import { db } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const PrescriptionSchema = z.object({
  patientId: z.string().min(1),
  practitionerId: z.string().min(1),
  medication: z.string().min(1),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  quantity: z.number().int().optional(),
  instructions: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = PrescriptionSchema.parse(body)
    const tenantId = await getTenantId()

    const prescription = await db.prescription.create({
      data: {
        tenantId,
        patientId: parsed.patientId,
        practitionerId: parsed.practitionerId,
        medication: parsed.medication,
        dosage: parsed.dosage || null,
        frequency: parsed.frequency || null,
        duration: parsed.duration || null,
        quantity: parsed.quantity || null,
        instructions: parsed.instructions || null,
        status: 'active',
      },
      include: { patient: true, practitioner: true },
    })

    await appendAuditLog({
      action: 'create',
      entity: 'prescription',
      entityId: prescription.id,
      payload: {
        medication: parsed.medication,
        patient: parsed.patientId,
        practitioner: parsed.practitionerId,
      },
    })

    await db.timelineEvent.create({
      data: {
        patientId: parsed.patientId,
        type: 'prescription',
        title: `Ordonnance — ${parsed.medication}`,
        description: `${parsed.dosage || ''} ${parsed.frequency || ''} ${parsed.duration || ''}`.trim(),
        occurredAt: new Date(),
      },
    })

    return NextResponse.json(prescription, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
