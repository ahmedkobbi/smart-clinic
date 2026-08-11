import { NextRequest, NextResponse } from 'next/server'
import { getPatientById, appendAuditLog } from '@/lib/queries'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const patient = await getPatientById(id)
    if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await appendAuditLog({
      action: 'view',
      entity: 'patient',
      entityId: patient.id,
      payload: { name: `${patient.firstName} ${patient.lastName}` },
    })
    return NextResponse.json(patient)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const updated = await db.patient.update({ where: { id }, data: body })
    await appendAuditLog({
      action: 'update',
      entity: 'patient',
      entityId: id,
      payload: { fields: Object.keys(body) },
    })
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    // Soft delete
    await db.patient.update({ where: { id }, data: { active: false } })
    await appendAuditLog({
      action: 'delete',
      entity: 'patient',
      entityId: id,
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
