import { NextRequest, NextResponse } from 'next/server'
import { getTenantId, appendAuditLog } from '@/lib/queries'
import { db } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const ConsentSchema = z.object({
  patientId: z.string().min(1),
  type: z.enum(['treatment', 'data_processing', 'ai_scribe', 'telemedicine', 'research']),
  status: z.enum(['granted', 'withdrawn', 'pending']),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const url = new URL(req.url)
    const patientId = url.searchParams.get('patientId')
    const items = await db.consentRecord.findMany({
      where: { tenantId, ...(patientId ? { patientId } : {}) },
      include: { patient: true },
      orderBy: { grantedAt: 'desc' },
    })
    return NextResponse.json({ items })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = ConsentSchema.parse(body)
    const tenantId = await getTenantId()

    // Check if consent already exists for this patient+type
    const existing = await db.consentRecord.findFirst({
      where: { tenantId, patientId: parsed.patientId, type: parsed.type },
    })

    if (existing) {
      // Update existing
      const updated = await db.consentRecord.update({
        where: { id: existing.id },
        data: {
          status: parsed.status,
          grantedAt: parsed.status === 'granted' ? new Date() : existing.grantedAt,
          withdrawnAt: parsed.status === 'withdrawn' ? new Date() : null,
          notes: parsed.notes,
        },
        include: { patient: true },
      })
      await appendAuditLog({
        action: 'update',
        entity: 'patient',
        entityId: parsed.patientId,
        payload: { consent: parsed.type, status: parsed.status },
      })
      return NextResponse.json(updated)
    }

    const consent = await db.consentRecord.create({
      data: {
        tenantId,
        patientId: parsed.patientId,
        type: parsed.type,
        status: parsed.status,
        grantedAt: parsed.status === 'granted' ? new Date() : null,
        notes: parsed.notes,
      },
      include: { patient: true },
    })

    await appendAuditLog({
      action: 'create',
      entity: 'patient',
      entityId: parsed.patientId,
      payload: { consent: parsed.type, status: parsed.status },
    })

    return NextResponse.json(consent, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
