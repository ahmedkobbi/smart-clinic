import { NextRequest, NextResponse } from 'next/server'
import { appendAuditLog } from '@/lib/queries'
import { db } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const InvoicePatchSchema = z.object({
  status: z.enum(['draft', 'issued', 'paid', 'partial', 'overdue', 'cancelled']).optional(),
  paymentMethod: z.enum(['card', 'cash', 'check', 'transfer', 'amex']).optional(),
  paidAmount: z.number().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const parsed = InvoicePatchSchema.parse(body)

    const invoice = await db.invoice.findUnique({ where: { id }, include: { patient: true } })
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updateData: any = {}
    if (parsed.status) updateData.status = parsed.status
    if (parsed.paymentMethod) updateData.paymentMethod = parsed.paymentMethod
    if (parsed.paidAmount !== undefined) updateData.paidAmount = parsed.paidAmount

    if (parsed.status === 'paid') {
      updateData.paidAmount = invoice.total
      updateData.paidAt = new Date()
      updateData.paymentMethod = parsed.paymentMethod || 'card'
    }

    const updated = await db.invoice.update({
      where: { id },
      data: updateData,
      include: { patient: true, items: true },
    })

    await appendAuditLog({
      action: 'update',
      entity: 'invoice',
      entityId: id,
      payload: { from: invoice.status, to: parsed.status || invoice.status, number: invoice.number },
    })

    if (parsed.status === 'paid') {
      await db.timelineEvent.create({
        data: {
          patientId: invoice.patientId,
          type: 'invoice',
          title: `Paiement encaissé — ${invoice.number}`,
          description: `${invoice.total.toFixed(2)} € — ${parsed.paymentMethod || 'card'}`,
          occurredAt: new Date(),
        },
      })
    }

    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
