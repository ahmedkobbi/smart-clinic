import { NextRequest, NextResponse } from 'next/server'
import { getTenantId, appendAuditLog } from '@/lib/queries'
import { db } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const LabSchema = z.object({
  patientId: z.string().min(1),
  testName: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().min(1),
  refRangeLow: z.number().nullable().optional(),
  refRangeHigh: z.number().nullable().optional(),
  flag: z.enum(['normal', 'low', 'high', 'critical']).default('normal'),
  category: z.string().default('general'),
  performedBy: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const url = new URL(req.url)
    const patientId = url.searchParams.get('patientId')
    const category = url.searchParams.get('category')
    const abnormalOnly = url.searchParams.get('abnormal') === 'true'

    const where: any = { tenantId }
    if (patientId) where.patientId = patientId
    if (category && category !== 'all') where.category = category
    if (abnormalOnly) where.flag = { in: ['low', 'high', 'critical'] }

    const results = await db.labResult.findMany({
      where,
      include: { patient: true },
      orderBy: { collectedAt: 'desc' },
    })

    return NextResponse.json({ items: results })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const body = await req.json()
    const parsed = LabSchema.parse(body)

    const lab = await db.labResult.create({
      data: {
        tenantId,
        ...parsed,
        collectedAt: new Date(),
        resultedAt: new Date(),
      },
      include: { patient: true },
    })

    await appendAuditLog({
      action: 'create',
      entity: 'patient',
      entityId: parsed.patientId,
      payload: { action: 'lab_result', test: parsed.testName, value: parsed.value, flag: parsed.flag },
    })

    await db.timelineEvent.create({
      data: {
        patientId: parsed.patientId,
        type: 'lab',
        title: `Résultat labo — ${parsed.testName}`,
        description: `${parsed.value} ${parsed.unit} (${parsed.flag})`,
        occurredAt: new Date(),
      },
    })

    return NextResponse.json(lab, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
