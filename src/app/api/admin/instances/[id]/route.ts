import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Auth check — superadmin only
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth
  const session = auth

  try {
    const { id } = await params
    const body = await req.json()
    const { action } = body
    const adminEmail = session.user.email

    if (action === 'block') {
      const instance = await db.instance.update({
        where: { id },
        data: { status: 'blocked' },
      })
      // Revoke active leases
      await db.lease.updateMany({
        where: { instanceId: id, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'Instance blocked by admin' },
      })
      await db.adminAction.create({
        data: {
          adminEmail,
          action: 'block_instance',
          target: 'instance',
          targetId: id,
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        },
      })
      return NextResponse.json(instance)
    }

    if (action === 'unblock') {
      const instance = await db.instance.update({
        where: { id },
        data: { status: 'active' },
      })
      await db.adminAction.create({
        data: {
          adminEmail,
          action: 'unblock_instance',
          target: 'instance',
          targetId: id,
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        },
      })
      return NextResponse.json(instance)
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
