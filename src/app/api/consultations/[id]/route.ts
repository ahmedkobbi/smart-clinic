import { NextRequest, NextResponse } from 'next/server'
import { appendAuditLog } from '@/lib/queries'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { action, signedBy } = body as { action: 'sign'; signedBy: string }

    if (action !== 'sign') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    const consult = await db.consultation.findUnique({ where: { id }, include: { patient: true } })
    if (!consult) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (consult.signedAt) {
      return NextResponse.json({ error: 'Already signed' }, { status: 400 })
    }

    const updated = await db.consultation.update({
      where: { id },
      data: {
        signedBy,
        signedAt: new Date(),
      },
    })

    await appendAuditLog({
      action: 'update',
      entity: 'consultation',
      entityId: id,
      payload: { action: 'sign', signedBy, patient: consult.patientId },
    })

    await db.timelineEvent.create({
      data: {
        patientId: consult.patientId,
        type: 'consultation',
        title: `Consultation signée`,
        description: `Signée par ${signedBy}`,
        occurredAt: new Date(),
      },
    })

    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
