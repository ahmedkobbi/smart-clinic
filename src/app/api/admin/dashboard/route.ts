import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Auth check — superadmin only
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  try {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalLicenses,
      activeLicenses,
      revokedLicenses,
      expiredLicenses,
      totalInstances,
      activeInstances,
      totalLeases,
      recentActions,
      licensesByPlan,
      licensesByStatus,
      recentInstances,
      telemetryLast24h,
    ] = await Promise.all([
      db.license.count(),
      db.license.count({ where: { status: 'active' } }),
      db.license.count({ where: { status: 'revoked' } }),
      db.license.count({ where: { status: 'expired' } }),
      db.instance.count(),
      db.instance.count({ where: { status: 'active' } }),
      db.lease.count({ where: { revokedAt: null } }),
      db.adminAction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      db.license.groupBy({ by: ['plan'], _count: true }),
      db.license.groupBy({ by: ['status'], _count: true }),
      db.instance.findMany({
        include: { license: true },
        orderBy: { lastSeenAt: 'desc' },
        take: 10,
      }),
      db.telemetryEvent.count({
        where: { receivedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
      }),
    ])

    // Revenue estimate (plan → monthly price)
    const PLAN_PRICES: Record<string, number> = {
      trial: 0,
      essential: 49,
      professional: 99,
      enterprise: 299,
    }
    const monthlyRevenue = licensesByStatus
      .filter(s => s.status === 'active')
      .reduce((sum, s) => {
        const planLicenses = licensesByPlan.filter(p => p._count > 0)
        return sum
      }, 0)

    // Simpler: sum over active licenses
    const activeLicensesByPlan = await db.license.groupBy({
      by: ['plan'],
      where: { status: 'active' },
      _count: true,
    })
    const mrr = activeLicensesByPlan.reduce((sum, p) => sum + (PLAN_PRICES[p.plan] || 0) * p._count, 0)

    // Telemetry event types distribution (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const telemetryByType = await db.telemetryEvent.groupBy({
      by: ['eventType'],
      where: { receivedAt: { gte: sevenDaysAgo } },
      _count: true,
    })

    // Daily active instances (last 7 days)
    const dailyActive: { date: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now)
      day.setDate(day.getDate() - i)
      const dayStart = new Date(day.setHours(0, 0, 0, 0))
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)
      const count = await db.instance.count({
        where: { lastSeenAt: { gte: dayStart, lt: dayEnd } },
      })
      dailyActive.push({ date: dayStart.toISOString().slice(0, 10), count })
    }

    return NextResponse.json({
      stats: {
        totalLicenses,
        activeLicenses,
        revokedLicenses,
        expiredLicenses,
        totalInstances,
        activeInstances,
        activeLeases: totalLeases,
        telemetryEvents24h: telemetryLast24h,
        mrr,
        arr: mrr * 12,
      },
      licensesByPlan: activeLicensesByPlan.map(p => ({ plan: p.plan, count: p._count })),
      licensesByStatus: licensesByStatus.map(s => ({ status: s.status, count: s._count })),
      recentActions,
      recentInstances,
      telemetryByType: telemetryByType.map(t => ({ type: t.eventType, count: t._count })),
      dailyActive,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
