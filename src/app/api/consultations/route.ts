import { NextRequest, NextResponse } from 'next/server'
import { getConsultations, getTenantId, appendAuditLog } from '@/lib/queries'
import { db } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const ConsultCreateSchema = z.object({
  patientId: z.string().min(1),
  practitionerId: z.string().min(1),
  appointmentId: z.string().optional(),
  chiefComplaint: z.string().optional(),
  history: z.string().optional(),
  examination: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  diagnosisCodes: z.array(z.object({ code: z.string(), label: z.string() })).optional(),
  procedureCodes: z.array(z.object({ code: z.string(), label: z.string(), price: z.number().optional() })).optional(),
  aiDrafted: z.boolean().default(false),
  aiConfidence: z.number().default(0),
})

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const patientId = url.searchParams.get('patientId') || undefined
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const items = await getConsultations({ patientId, limit })
    return NextResponse.json({ items })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = ConsultCreateSchema.parse(body)
    const tenantId = await getTenantId()
    const consultation = await db.consultation.create({
      data: {
        tenantId,
        patientId: parsed.patientId,
        practitionerId: parsed.practitionerId,
        appointmentId: parsed.appointmentId || null,
        chiefComplaint: parsed.chiefComplaint || null,
        history: parsed.history || null,
        examination: parsed.examination || null,
        assessment: parsed.assessment || null,
        plan: parsed.plan || null,
        diagnosisCodes: parsed.diagnosisCodes ? JSON.stringify(parsed.diagnosisCodes) : null,
        procedureCodes: parsed.procedureCodes ? JSON.stringify(parsed.procedureCodes) : null,
        aiDrafted: parsed.aiDrafted,
        aiConfidence: parsed.aiConfidence,
      },
      include: { patient: true, practitioner: true },
    })
    await appendAuditLog({
      action: 'create',
      entity: 'consultation',
      entityId: consultation.id,
      payload: { patient: consultation.patientId, aiDrafted: parsed.aiDrafted },
    })
    await db.timelineEvent.create({
      data: {
        patientId: parsed.patientId,
        type: 'consultation',
        title: `Consultation — ${parsed.chiefComplaint || 'Note'}`,
        description: parsed.assessment?.slice(0, 200) || '',
        occurredAt: new Date(),
      },
    })
    return NextResponse.json(consultation, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
