import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateLicenseKey } from '@/lib/crypto'
import { requireAdmin } from '@/lib/auth-helpers'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const LicenseCreateSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerOrg: z.string().optional(),
  customerCountry: z.string().default('FR'),
  plan: z.enum(['trial', 'essential', 'professional', 'enterprise']).default('professional'),
  modules: z.array(z.string()).default([]),
  maxDevices: z.number().int().min(1).max(100).default(1),
  maxPractitioners: z.number().int().min(1).max(1000).default(10),
  durationDays: z.number().int().min(1).max(3650).default(365),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  // Auth check — superadmin only
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  try {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const plan = url.searchParams.get('plan')
    const search = url.searchParams.get('search')

    const where: any = {}
    if (status && status !== 'all') where.status = status
    if (plan && plan !== 'all') where.plan = plan
    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { customerEmail: { contains: search } },
        { licenseKey: { contains: search } },
      ]
    }

    const [licenses, total] = await Promise.all([
      db.license.findMany({
        where,
        include: {
          _count: { select: { instances: true, leases: true } },
          instances: {
            select: { id: true, lastSeenAt: true, status: true },
            take: 1,
            orderBy: { lastSeenAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.license.count({ where }),
    ])

    return NextResponse.json({ items: licenses, total })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // Auth check — superadmin only
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth
  const session = auth

  try {
    const body = await req.json()
    const parsed = LicenseCreateSchema.parse(body)

    const licenseKey = generateLicenseKey()
    const expiresAt = new Date(Date.now() + parsed.durationDays * 24 * 60 * 60 * 1000)

    const license = await db.license.create({
      data: {
        licenseKey,
        customerName: parsed.customerName,
        customerEmail: parsed.customerEmail,
        customerOrg: parsed.customerOrg || null,
        customerCountry: parsed.customerCountry,
        plan: parsed.plan,
        modules: JSON.stringify(parsed.modules),
        maxDevices: parsed.maxDevices,
        maxPractitioners: parsed.maxPractitioners,
        expiresAt,
        notes: parsed.notes,
        status: 'active',
      },
    })

    // Log admin action
    await db.adminAction.create({
      data: {
        adminEmail: session.user.email,
        action: 'issue_license',
        target: 'license',
        targetId: license.id,
        payload: JSON.stringify({ licenseKey, plan: parsed.plan, customer: parsed.customerName }),
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      },
    })

    return NextResponse.json(license, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
