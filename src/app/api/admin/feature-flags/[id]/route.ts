import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

// Toggle a feature flag for a license
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Auth check — superadmin only
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth
  const session = auth

  try {
    const { id } = await params
    const { enabled } = await req.json()

    const flag = await db.featureFlag.update({
      where: { id },
      data: { enabled },
    })

    await db.adminAction.create({
      data: {
        adminEmail: session.user.email,
        action: 'toggle_feature_flag',
        target: 'feature_flag',
        targetId: id,
        payload: JSON.stringify({ flagKey: flag.flagKey, enabled }),
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      },
    })

    return NextResponse.json(flag)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
