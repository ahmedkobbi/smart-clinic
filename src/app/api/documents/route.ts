import { NextRequest, NextResponse } from 'next/server'
import { getTenantId, appendAuditLog } from '@/lib/queries'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const url = new URL(req.url)
    const patientId = url.searchParams.get('patientId')
    const category = url.searchParams.get('category')

    const where: any = { tenantId }
    if (patientId) where.patientId = patientId
    if (category && category !== 'all') where.category = category

    const documents = await db.patientDocument.findMany({
      where,
      include: { patient: true },
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json({ items: documents })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const body = await req.json()
    const { patientId, name, category, mimeType, content, sizeBytes, description, uploadedBy } = body

    if (!patientId || !name || !content) {
      return NextResponse.json({ error: 'patientId, name, content required' }, { status: 400 })
    }

    const doc = await db.patientDocument.create({
      data: {
        tenantId,
        patientId,
        name,
        category: category || 'other',
        mimeType: mimeType || 'application/octet-stream',
        sizeBytes: sizeBytes || content.length,
        content,
        description,
        uploadedBy,
      },
      include: { patient: true },
    })

    await appendAuditLog({
      action: 'create',
      entity: 'patient',
      entityId: patientId,
      payload: { action: 'document_upload', name, category },
    })

    await db.timelineEvent.create({
      data: {
        patientId,
        type: 'lab',
        title: `Document ajouté — ${name}`,
        description: category,
        occurredAt: new Date(),
      },
    })

    return NextResponse.json(doc, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
