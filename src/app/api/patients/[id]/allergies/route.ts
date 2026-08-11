import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appendAuditLog } from '@/lib/queries'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const AllergySchema = z.object({
  substance: z.string().min(1),
  severity: z.enum(['mild', 'moderate', 'severe']).default('moderate'),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const parsed = AllergySchema.parse(body)
    const allergy = await db.allergy.create({
      data: { patientId: id, substance: parsed.substance, severity: parsed.severity },
    })
    await appendAuditLog({
      action: 'create',
      entity: 'patient',
      entityId: id,
      payload: { allergy: parsed.substance, severity: parsed.severity },
    })
    return NextResponse.json(allergy, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
