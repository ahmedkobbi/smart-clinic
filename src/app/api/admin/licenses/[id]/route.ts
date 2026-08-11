import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const license = await db.license.findUnique({
      where: { id },
      include: {
        instances: {
          include: { _count: { select: { telemetryEvents: true } } },
          orderBy: { lastSeenAt: 'desc' },
        },
        leases: { orderBy: { issuedAt: 'desc' }, take: 10 },
        featureFlags: true,
      },
    })

    if (!license) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(license)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { action, adminEmail, ...updates } = body

    if (action === 'revoke') {
      const license = await db.license.update({
        where: { id },
        data: {
          status: 'revoked',
          revokedAt: new Date(),
          revocationReason: body.reason || 'Revoked by admin',
        },
      })
      // Revoke all active leases
      await db.lease.updateMany({
        where: { licenseId: id, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'License revoked' },
      })
      // Block all instances
      await db.instance.updateMany({
        where: { licenseId: id },
        data: { status: 'blocked' },
      })
      await db.adminAction.create({
        data: {
          adminEmail,
          action: 'revoke_license',
          target: 'license',
          targetId: id,
          payload: JSON.stringify({ reason: body.reason }),
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        },
      })
      return NextResponse.json(license)
    }

    if (action === 'suspend') {
      const license = await db.license.update({
        where: { id },
        data: { status: 'suspended' },
      })
      await db.adminAction.create({
        data: {
          adminEmail,
          action: 'suspend_license',
          target: 'license',
          targetId: id,
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        },
      })
      return NextResponse.json(license)
    }

    if (action === 'reactivate') {
      const license = await db.license.update({
        where: { id },
        data: { status: 'active', revokedAt: null, revocationReason: null },
      })
      await db.instance.updateMany({
        where: { licenseId: id },
        data: { status: 'active' },
      })
      await db.adminAction.create({
        data: {
          adminEmail,
          action: 'reactivate_license',
          target: 'license',
          targetId: id,
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        },
      })
      return NextResponse.json(license)
    }

    if (action === 'extend') {
      const license = await db.license.findUnique({ where: { id } })
      if (!license) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      const newExpiry = new Date(license.expiresAt)
      newExpiry.setDate(newExpiry.getDate() + (body.days || 30))
      const updated = await db.license.update({
        where: { id },
        data: { expiresAt: newExpiry, status: 'active' },
      })
      await db.adminAction.create({
        data: {
          adminEmail,
          action: 'extend_license',
          target: 'license',
          targetId: id,
          payload: JSON.stringify({ days: body.days, newExpiry }),
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        },
      })
      return NextResponse.json(updated)
    }

    // Generic update
    const updated = await db.license.update({
      where: { id },
      data: updates,
    })
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.license.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
