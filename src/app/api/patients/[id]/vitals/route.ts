import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appendAuditLog } from '@/lib/queries'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const VitalSchema = z.object({
  type: z.enum(['blood_pressure', 'heart_rate', 'temperature', 'spo2', 'weight', 'height']),
  value: z.string().min(1),
  unit: z.string().min(1),
  recordedBy: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const parsed = VitalSchema.parse(body)
    const vital = await db.vital.create({
      data: {
        patientId: id,
        type: parsed.type,
        value: parsed.value,
        unit: parsed.unit,
        recordedBy: parsed.recordedBy,
      },
    })
    await appendAuditLog({
      action: 'create',
      entity: 'patient',
      entityId: id,
      payload: { vital: parsed.type, value: parsed.value },
    })
    return NextResponse.json(vital, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
