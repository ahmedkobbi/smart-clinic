import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/queries'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const tenantId = await getTenantId()
    const notifications: any[] = []

    // 1. Break-glass accesses (critical)
    const breakGlass = await db.auditLog.findMany({
      where: { tenantId, action: 'break_glass' },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
    for (const log of breakGlass) {
      notifications.push({
        id: log.id,
        type: 'break_glass',
        title: log.user?.name ? `${log.user.name} — Accès de secours` : 'Accès de secours',
        description: log.reason || 'Break-glass access triggered',
        severity: 'critical',
        timestamp: log.createdAt.toISOString(),
      })
    }

    // 2. Low stock items (warning)
    const inventory = await db.inventoryItem.findMany({ where: { tenantId } })
    const lowStock = inventory.filter(i => i.stock <= i.reorderAt)
    for (const item of lowStock) {
      notifications.push({
        id: `stock-${item.id}`,
        type: 'low_stock',
        title: item.name,
        description: `Stock: ${item.stock} ${item.unit} (seuil: ${item.reorderAt})`,
        severity: 'warning',
        timestamp: item.updatedAt.toISOString(),
      })
    }

    // 3. Pending/overdue invoices (warning)
    const pendingInvoices = await db.invoice.findMany({
      where: { tenantId, status: { in: ['pending', 'partial', 'overdue'] } },
      include: { patient: true },
      orderBy: { issueDate: 'desc' },
      take: 5,
    })
    for (const inv of pendingInvoices) {
      notifications.push({
        id: `inv-${inv.id}`,
        type: 'pending_invoice',
        title: `${inv.number} — ${inv.patient.firstName} ${inv.patient.lastName}`,
        description: `${inv.total.toFixed(2)} € — ${inv.status}`,
        severity: inv.status === 'overdue' ? 'critical' : 'warning',
        timestamp: inv.issueDate.toISOString(),
      })
    }

    // 4. Upcoming appointments (info)
    const now = new Date()
    const endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)
    const upcoming = await db.appointment.findMany({
      where: {
        tenantId,
        startAt: { gte: now, lte: endOfDay },
        status: { in: ['scheduled', 'confirmed'] },
      },
      include: { patient: true, practitioner: true },
      orderBy: { startAt: 'asc' },
      take: 3,
    })
    for (const appt of upcoming) {
      notifications.push({
        id: `appt-${appt.id}`,
        type: 'appointment',
        title: `${appt.patient.firstName} ${appt.patient.lastName}`,
        description: `${appt.practitioner.name} à ${appt.startAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
        severity: 'info',
        timestamp: appt.startAt.toISOString(),
      })
    }

    // 5. AI drafts pending validation (info)
    const aiDrafts = await db.consultation.findMany({
      where: { tenantId, aiDrafted: true, signedAt: null },
      include: { patient: true },
      take: 3,
      orderBy: { createdAt: 'desc' },
    })
    for (const c of aiDrafts) {
      notifications.push({
        id: `ai-${c.id}`,
        type: 'ai_draft',
        title: `Brouillon IA — ${c.patient.firstName} ${c.patient.lastName}`,
        description: `Confiance: ${Math.round(c.aiConfidence * 100)}% — validation requise`,
        severity: 'info',
        timestamp: c.createdAt.toISOString(),
      })
    }

    // Sort by severity then timestamp
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    notifications.sort((a, b) => {
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity]
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    return NextResponse.json({ items: notifications })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, items: [] }, { status: 500 })
  }
}
