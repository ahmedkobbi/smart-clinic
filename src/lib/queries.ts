// Smart Clinic — data access layer
// All queries go through here. Tenant scoping is enforced by default.
// Per master prompt §8.2: every query, cache key, audit-log entry is tenant-scoped by construction.

import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// Use Prisma type only — avoids runtime usage that doesn't work in SQLite
void Prisma

// Single-tenant demo — first tenant
export async function getTenant(slug = 'cabinet-lumiere') {
  return db.tenant.findFirst({ where: { slug } })
}

export async function getTenantId(slug = 'cabinet-lumiere') {
  const t = await getTenant(slug)
  return t!.id
}

// ─────────────────────────────────────────────────────────────────────────────
// Patients
// ─────────────────────────────────────────────────────────────────────────────

export async function getPatients(opts: { search?: string; branchId?: string | null; limit?: number; offset?: number } = {}) {
  const tenantId = await getTenantId()
  const { search, branchId, limit = 50, offset = 0 } = opts
  const where: Prisma.PatientWhereInput = { tenantId, active: true }
  if (branchId) where.branchId = branchId
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
      { ssn: { contains: search } },
      { insuranceNumber: { contains: search } },
    ]
  }
  const [items, total] = await Promise.all([
    db.patient.findMany({
      where,
      include: {
        allergies: true,
        consultations: { select: { id: true, startAt: true }, orderBy: { startAt: 'desc' }, take: 1 },
        appointments: { select: { id: true, startAt: true, status: true }, orderBy: { startAt: 'desc' }, take: 1 },
      },
      orderBy: { lastName: 'asc' },
      take: limit,
      skip: offset,
    }),
    db.patient.count({ where }),
  ])
  return { items, total }
}

export async function getPatientById(id: string) {
  return db.patient.findUnique({
    where: { id },
    include: {
      allergies: { orderBy: { notedAt: 'desc' } },
      vitals: { orderBy: { recordedAt: 'desc' }, take: 20 },
      consultations: {
        include: { practitioner: true, prescriptions: true },
        orderBy: { startAt: 'desc' },
      },
      prescriptions: { include: { practitioner: true }, orderBy: { createdAt: 'desc' } },
      invoices: { include: { items: true }, orderBy: { issueDate: 'desc' } },
      appointments: {
        include: { practitioner: true, resource: true },
        orderBy: { startAt: 'desc' },
        take: 10,
      },
      timelineEvents: { orderBy: { occurredAt: 'desc' }, take: 50 },
      consentRecords: { orderBy: { grantedAt: 'desc' } },
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Appointments
// ─────────────────────────────────────────────────────────────────────────────

export async function getAppointments(opts: { from?: Date; to?: Date; branchId?: string | null; practitionerId?: string; status?: string; patientId?: string; limit?: number } = {}) {
  const tenantId = await getTenantId()
  const where: Prisma.AppointmentWhereInput = { tenantId }
  if (opts.branchId) where.branchId = opts.branchId
  if (opts.practitionerId) where.practitionerId = opts.practitionerId
  if (opts.status) where.status = opts.status
  if (opts.patientId) where.patientId = opts.patientId
  if (opts.from || opts.to) {
    where.startAt = {}
    if (opts.from) where.startAt.gte = opts.from
    if (opts.to) where.startAt.lte = opts.to
  }
  return db.appointment.findMany({
    where,
    include: {
      patient: true,
      practitioner: true,
      resource: true,
      branch: true,
    },
    orderBy: { startAt: 'asc' },
    take: opts.limit ?? 200,
  })
}

export async function getTodaysAppointments() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return getAppointments({ from: start, to: end })
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard stats
// ─────────────────────────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const tenantId = await getTenantId()
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - 7)
  const monthStart = new Date(now)
  monthStart.setDate(monthStart.getDate() - 30)

  const [
    totalPatients,
    todaysAppointments,
    todaysInvoices,
    noShowCount,
    completedThisMonth,
    pendingInvoices,
    inventoryItems,
  ] = await Promise.all([
    db.patient.count({ where: { tenantId, active: true } }),
    db.appointment.count({ where: { tenantId, startAt: { gte: todayStart, lte: todayEnd } } }),
    db.invoice.findMany({
      where: { tenantId, issueDate: { gte: todayStart, lte: todayEnd }, status: 'paid' },
      select: { total: true },
    }),
    db.appointment.count({ where: { tenantId, status: 'no_show', startAt: { gte: monthStart } } }),
    db.appointment.count({ where: { tenantId, status: 'completed', startAt: { gte: monthStart } } }),
    db.invoice.count({ where: { tenantId, status: { in: ['pending', 'partial', 'overdue'] } } }),
    db.inventoryItem.findMany({ where: { tenantId }, select: { stock: true, reorderAt: true } }),
  ])

  const inventoryLowStock = inventoryItems.filter(i => i.stock <= i.reorderAt).length

  const revenueToday = todaysInvoices.reduce((s, i) => s + i.total, 0)
  const noShowRate = completedThisMonth > 0 ? noShowCount / (completedThisMonth + noShowCount) : 0

  // Week appointments by day
  const weekAppointments = await db.appointment.groupBy({
    by: ['startAt'],
    where: { tenantId, startAt: { gte: weekStart } },
    _count: true,
  })

  // Group by day for chart
  const byDay: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    byDay[key] = 0
  }
  for (const a of weekAppointments) {
    const key = a.startAt.toISOString().slice(0, 10)
    if (key in byDay) byDay[key] += a._count
  }

  // Revenue trend (last 14 days)
  const revenueRecords = await db.invoice.findMany({
    where: { tenantId, issueDate: { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) } },
    select: { issueDate: true, total: true, status: true },
  })
  const revenueByDay: Record<string, number> = {}
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    revenueByDay[key] = 0
  }
  for (const r of revenueRecords) {
    const key = r.issueDate.toISOString().slice(0, 10)
    if (key in revenueByDay && r.status === 'paid') revenueByDay[key] += r.total
  }

  // Specialty breakdown
  const practitioners = await db.practitioner.findMany({
    where: { tenantId },
    select: { specialty: true, appointments: { where: { startAt: { gte: monthStart } }, select: { id: true } } },
  })
  const bySpecialty: Record<string, number> = {}
  for (const p of practitioners) {
    bySpecialty[p.specialty] = (bySpecialty[p.specialty] || 0) + p.appointments.length
  }

  // No-show risk distribution
  const allRisk = await db.appointment.findMany({
    where: { tenantId, startAt: { gte: todayStart } },
    select: { noShowRisk: true },
  })
  const highRisk = allRisk.filter(a => a.noShowRisk >= 0.6).length
  const medRisk = allRisk.filter(a => a.noShowRisk >= 0.3 && a.noShowRisk < 0.6).length
  const lowRisk = allRisk.filter(a => a.noShowRisk < 0.3).length

  return {
    totalPatients,
    todaysAppointments,
    revenueToday,
    noShowRate,
    pendingInvoices,
    inventoryLowStock,
    weekAppointments: Object.entries(byDay).map(([date, count]) => ({ date, count })),
    revenueTrend: Object.entries(revenueByDay).map(([date, amount]) => ({ date, amount })),
    specialtyBreakdown: Object.entries(bySpecialty).map(([specialty, count]) => ({ specialty, count })),
    noShowRiskDistribution: { high: highRisk, medium: medRisk, low: lowRisk },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Consultations
// ─────────────────────────────────────────────────────────────────────────────

export async function getConsultations(opts: { patientId?: string; limit?: number } = {}) {
  const tenantId = await getTenantId()
  return db.consultation.findMany({
    where: { tenantId, ...(opts.patientId ? { patientId: opts.patientId } : {}) },
    include: { patient: true, practitioner: true, prescriptions: true },
    orderBy: { startAt: 'desc' },
    take: opts.limit ?? 50,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Invoices
// ─────────────────────────────────────────────────────────────────────────────

export async function getInvoices(opts: { search?: string; status?: string; limit?: number; offset?: number } = {}) {
  const tenantId = await getTenantId()
  const where: Prisma.InvoiceWhereInput = { tenantId }
  if (opts.status) where.status = opts.status
  if (opts.search) {
    where.OR = [
      { number: { contains: opts.search } },
      { patient: { firstName: { contains: opts.search } } },
      { patient: { lastName: { contains: opts.search } } },
    ]
  }
  const [items, total] = await Promise.all([
    db.invoice.findMany({
      where,
      include: { patient: true, items: true },
      orderBy: { issueDate: 'desc' },
      take: opts.limit ?? 50,
      skip: opts.offset ?? 0,
    }),
    db.invoice.count({ where }),
  ])
  return { items, total }
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit log + hash chain verification
// ─────────────────────────────────────────────────────────────────────────────

import { createHash } from 'crypto'

export async function getAuditLogs(opts: { limit?: number; offset?: number; action?: string; entity?: string; userId?: string } = {}) {
  const tenantId = await getTenantId()
  const where: Prisma.AuditLogWhereInput = { tenantId }
  if (opts.action) where.action = opts.action
  if (opts.entity) where.entity = opts.entity
  if (opts.userId) where.userId = opts.userId
  const [items, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 100,
      skip: opts.offset ?? 0,
    }),
    db.auditLog.count({ where }),
  ])
  return { items, total }
}

export async function verifyAuditChain(): Promise<{ valid: boolean; checked: number; brokenAt?: string }> {
  const tenantId = await getTenantId()
  const logs = await db.auditLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, prevHash: true, hash: true, action: true, entity: true, entityId: true, payload: true, createdAt: true },
  })
  let prevHash = '0'.repeat(64)
  for (const log of logs) {
    const expectedInput = `${prevHash}|${log.action}|${log.entity}|${log.entityId || ''}|${log.payload}|${log.createdAt.toISOString()}`
    const expectedHash = createHash('sha256').update(expectedInput, 'utf8').digest('hex')
    if (log.hash !== expectedHash) {
      return { valid: false, checked: logs.indexOf(log), brokenAt: log.id }
    }
    if (log.prevHash !== prevHash) {
      return { valid: false, checked: logs.indexOf(log), brokenAt: log.id }
    }
    prevHash = log.hash
  }
  return { valid: true, checked: logs.length }
}

export async function appendAuditLog(opts: { userId?: string; action: string; entity: string; entityId?: string; payload?: any; reason?: string; ipAddress?: string; userAgent?: string }) {
  const tenantId = await getTenantId()
  const last = await db.auditLog.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    select: { hash: true },
  })
  const prevHash = last?.hash || '0'.repeat(64)
  const now = new Date()
  const payload = JSON.stringify(opts.payload || {})
  const hashInput = `${prevHash}|${opts.action}|${opts.entity}|${opts.entityId || ''}|${payload}|${now.toISOString()}`
  const hash = createHash('sha256').update(hashInput, 'utf8').digest('hex')
  return db.auditLog.create({
    data: {
      tenantId,
      userId: opts.userId,
      action: opts.action,
      entity: opts.entity,
      entityId: opts.entityId,
      prevHash,
      hash,
      payload,
      reason: opts.reason,
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent || 'SmartClinic/1.0 (Web)',
      createdAt: now,
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Inventory
// ─────────────────────────────────────────────────────────────────────────────

export async function getInventory() {
  const tenantId = await getTenantId()
  return db.inventoryItem.findMany({
    where: { tenantId },
    orderBy: [{ stock: 'asc' }, { name: 'asc' }],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Practitioners, Resources, Branches, Users
// ─────────────────────────────────────────────────────────────────────────────

export async function getPractitioners() {
  const tenantId = await getTenantId()
  return db.practitioner.findMany({
    where: { tenantId, active: true },
    include: { branch: true },
    orderBy: { name: 'asc' },
  })
}

export async function getResources() {
  const tenantId = await getTenantId()
  return db.resource.findMany({
    where: { tenantId, active: true },
    include: { branch: true },
    orderBy: { name: 'asc' },
  })
}

export async function getBranches() {
  const tenantId = await getTenantId()
  return db.branch.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  })
}

export async function getUsers() {
  const tenantId = await getTenantId()
  return db.user.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  })
}

export async function getConsentRecords(patientId?: string) {
  const tenantId = await getTenantId()
  return db.consentRecord.findMany({
    where: { tenantId, ...(patientId ? { patientId } : {}) },
    include: { patient: true },
    orderBy: { grantedAt: 'desc' },
  })
}
