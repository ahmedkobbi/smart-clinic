import { NextRequest, NextResponse } from 'next/server'
import { getInvoices, getTenantId, appendAuditLog } from '@/lib/queries'
import { db } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const InvoiceCreateSchema = z.object({
  patientId: z.string().min(1),
  items: z.array(z.object({
    description: z.string(),
    code: z.string().optional(),
    codeType: z.string().optional(),
    quantity: z.number().int().default(1),
    unitPrice: z.number(),
  })),
  tiersPayant: z.boolean().default(true),
  paymentMethod: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const search = url.searchParams.get('search') || undefined
    const status = url.searchParams.get('status') || undefined
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const result = await getInvoices({ search, status, limit, offset })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = InvoiceCreateSchema.parse(body)
    const tenantId = await getTenantId()
    const subtotal = parsed.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
    const insuranceCovered = parsed.tiersPayant ? Math.round(subtotal * 0.7 * 100) / 100 : 0
    const patientShare = Math.round((subtotal - insuranceCovered) * 100) / 100

    // Generate invoice number
    const count = await db.invoice.count({ where: { tenantId } })
    const number = `FAC-2026-${String(count + 1).padStart(5, '0')}`

    const invoice = await db.invoice.create({
      data: {
        tenantId,
        patientId: parsed.patientId,
        number,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'issued',
        subtotal,
        taxRate: 0,
        taxAmount: 0,
        total: subtotal,
        paidAmount: 0,
        tiersPayant: parsed.tiersPayant,
        insuranceCovered,
        patientShare,
      },
      include: { patient: true },
    })

    for (const item of parsed.items) {
      await db.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          description: item.description,
          code: item.code || null,
          codeType: item.codeType || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.unitPrice * item.quantity,
        },
      })
    }

    await appendAuditLog({
      action: 'create',
      entity: 'invoice',
      entityId: invoice.id,
      payload: { number, total: subtotal },
    })
    await db.timelineEvent.create({
      data: {
        patientId: parsed.patientId,
        type: 'invoice',
        title: `Facture ${number}`,
        description: `${subtotal.toFixed(2)} € — émise`,
        occurredAt: new Date(),
      },
    })
    return NextResponse.json(invoice, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
