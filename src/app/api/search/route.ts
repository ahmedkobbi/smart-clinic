import { NextRequest, NextResponse } from 'next/server'
import { getTenantId } from '@/lib/queries'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const q = url.searchParams.get('q') || ''
    if (q.length < 2) return NextResponse.json({ patients: [], invoices: [], appointments: [] })

    const tenantId = await getTenantId()
    const [patients, invoices, appointments] = await Promise.all([
      db.patient.findMany({
        where: {
          tenantId,
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
            { ssn: { contains: q } },
          ],
        },
        take: 5,
        select: { id: true, firstName: true, lastName: true, birthDate: true, email: true },
      }),
      db.invoice.findMany({
        where: {
          tenantId,
          OR: [
            { number: { contains: q } },
            { patient: { firstName: { contains: q } } },
            { patient: { lastName: { contains: q } } },
          ],
        },
        take: 5,
        include: { patient: true },
      }),
      db.appointment.findMany({
        where: {
          tenantId,
          OR: [
            { reason: { contains: q } },
            { patient: { firstName: { contains: q } } },
            { patient: { lastName: { contains: q } } },
          ],
        },
        take: 5,
        include: { patient: true, practitioner: true },
        orderBy: { startAt: 'desc' },
      }),
    ])

    return NextResponse.json({ patients, invoices, appointments })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
