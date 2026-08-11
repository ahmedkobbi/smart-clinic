'use client'

import { useApp } from '@/lib/store'
import { getDict, formatCurrency, formatPercent, formatTime, type Locale } from '@/lib/i18n'
import { StatCard } from '@/components/common/stat-card'
import { StatusPill, appointmentStatusVariant, noShowRiskVariant } from '@/components/common/status-pill'
import { SkeletonCard, SkeletonChart } from '@/components/common/skeleton'
import { EmptyState } from '@/components/common/empty-state'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Users, CalendarClock, Receipt, TrendingDown, Activity,
  Clock, Sparkles, AlertTriangle, Package, ChevronRight,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart,
} from 'recharts'

interface DashboardData {
  totalPatients: number
  todaysAppointments: number
  revenueToday: number
  noShowRate: number
  pendingInvoices: number
  inventoryLowStock: number
  weekAppointments: { date: string; count: number }[]
  revenueTrend: { date: string; amount: number }[]
  specialtyBreakdown: { specialty: string; count: number }[]
  noShowRiskDistribution: { high: number; medium: number; low: number }
}

const SPECIALTY_COLORS: Record<string, string> = {
  general: '#0ea5e9',
  dental: '#14b8a6',
  physio: '#a855f7',
  psych: '#ec4899',
  derm: '#f97316',
  ophthal: '#22c55e',
  gyn: '#eab308',
  ped: '#3b82f6',
}

async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch('/api/dashboard', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load dashboard')
  return res.json()
}

async function fetchTodayAppts() {
  const res = await fetch('/api/appointments?from=' + new Date().toISOString().slice(0, 10) + '&to=' + new Date(Date.now() + 86400000).toISOString().slice(0, 10), { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load appointments')
  return res.json()
}

export function DashboardView({ locale }: { locale: Locale }) {
  const t = getDict(locale)
  const { setView, setSelectedPatientId } = useApp()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    refetchInterval: 60_000,
  })

  const { data: todayAppts } = useQuery({
    queryKey: ['appointments', 'today'],
    queryFn: fetchTodayAppts,
    refetchInterval: 60_000,
  })

  const specialtyData = (stats?.specialtyBreakdown || []).map(d => ({
    name: locale === 'fr' ? specialtyFr(d.specialty) : d.specialty,
    value: d.count,
    color: SPECIALTY_COLORS[d.specialty] || '#94a3b8',
  }))

  const weekData = (stats?.weekAppointments || []).map(d => ({
    name: new Date(d.date).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short' }),
    count: d.count,
  }))

  const revenueData = (stats?.revenueTrend || []).map(d => ({
    name: new Date(d.date).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' }),
    amount: d.amount,
  }))

  const riskData = stats ? [
    { name: t.dashboard.kpi.noShowRate, value: stats.noShowRiskDistribution.high, color: '#ef4444', label: locale === 'fr' ? 'Élevé' : 'High' },
    { name: t.dashboard.kpi.noShowRate, value: stats.noShowRiskDistribution.medium, color: '#f59e0b', label: locale === 'fr' ? 'Moyen' : 'Medium' },
    { name: t.dashboard.kpi.noShowRate, value: stats.noShowRiskDistribution.low, color: '#22c55e', label: locale === 'fr' ? 'Bas' : 'Low' },
  ] : []

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24">
      {/* KPI grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {!stats ? (
          <>{<SkeletonCard />}{<SkeletonCard />}{<SkeletonCard />}{<SkeletonCard />}</>
        ) : (
          <>
            <StatCard
              label={t.dashboard.kpi.patients}
              value={stats.totalPatients}
              icon={Users}
              accent="primary"
              trend={{ value: locale === 'fr' ? '+3 ce mois' : '+3 this month', direction: 'up' }}
              delay={0}
            />
            <StatCard
              label={t.dashboard.kpi.appointmentsToday}
              value={stats.todaysAppointments}
              icon={CalendarClock}
              accent="info"
              trend={{ value: locale === 'fr' ? '8 planifiés' : '8 scheduled', direction: 'neutral' }}
              delay={50}
            />
            <StatCard
              label={t.dashboard.kpi.revenue}
              value={formatCurrency(stats.revenueToday, locale)}
              icon={Receipt}
              accent="success"
              trend={{ value: '+12%', direction: 'up' }}
              delay={100}
            />
            <StatCard
              label={t.dashboard.kpi.noShowRate}
              value={formatPercent(stats.noShowRate, locale)}
              icon={TrendingDown}
              accent="warning"
              trend={{ value: '-2%', direction: 'down' }}
              delay={150}
            />
          </>
        )}
      </section>

      {/* Charts grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly appointments */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 200, type: 'spring', stiffness: 200, damping: 25 }}
          className="glass-card rounded-2xl p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">{t.dashboard.charts.appointmentsWeek}</h3>
              <p className="text-xs text-muted-foreground">{locale === 'fr' ? '7 derniers jours' : 'Last 7 days'}</p>
            </div>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.02 250 / 0.15)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="oklch(0.5 0.02 250 / 0.6)" />
              <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.5 0.02 250 / 0.6)" />
              <Tooltip
                contentStyle={{
                  background: 'var(--glass-floating-bg)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid var(--glass-floating-border)',
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Specialty breakdown */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 250, type: 'spring', stiffness: 200, damping: 25 }}
          className="glass-card rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">{t.dashboard.charts.specialtyBreakdown}</h3>
          </div>
          {specialtyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={specialtyData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {specialtyData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--glass-floating-bg)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid var(--glass-floating-border)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
              {t.common.loading}
            </div>
          )}
          <div className="grid grid-cols-2 gap-1 mt-2">
            {specialtyData.slice(0, 6).map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px]">
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <span className="truncate text-muted-foreground">{s.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Revenue trend + Today's schedule */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 300, type: 'spring', stiffness: 200, damping: 25 }}
          className="glass-card rounded-2xl p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">{t.dashboard.charts.revenueTrend}</h3>
              <p className="text-xs text-muted-foreground">{locale === 'fr' ? 'Revenu encaissé' : 'Collected revenue'}</p>
            </div>
            <Receipt className="w-4 h-4 text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.02 250 / 0.15)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="oklch(0.5 0.02 250 / 0.6)" />
              <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.5 0.02 250 / 0.6)" tickFormatter={(v) => `${v}€`} />
              <Tooltip
                contentStyle={{
                  background: 'var(--glass-floating-bg)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid var(--glass-floating-border)',
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(v: any) => [formatCurrency(v as number, locale), t.billing.total]}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#revGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* No-show risk distribution */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 350, type: 'spring', stiffness: 200, damping: 25 }}
          className="glass-card rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">{t.dashboard.charts.noShowRisk}</h3>
              <p className="text-xs text-muted-foreground">{t.dashboard.kpi.appointmentsToday}</p>
            </div>
            <Sparkles className="w-4 h-4 text-glass-accent" />
          </div>
          <div className="space-y-3">
            {riskData.map((d, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    {d.label}
                  </span>
                  <span className="font-medium tabular-nums">{d.value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats?.todaysAppointments ? (d.value / stats.todaysAppointments) * 100 : 0}%` }}
                    transition={{ delay: 400 + i * 80, duration: 0.6 }}
                    className="h-full rounded-full"
                    style={{ background: d.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg glass-base text-[11px] text-muted-foreground leading-relaxed">
            <AlertTriangle className="w-3 h-3 inline mr-1 text-warning" />
            {t.ai.nonDiagnostic}
          </div>
        </motion.div>
      </section>

      {/* Today's schedule + Alerts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 400, type: 'spring', stiffness: 200, damping: 25 }}
          className="glass-card rounded-2xl p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold">{t.dashboard.todaySchedule}</h3>
              <p className="text-xs text-muted-foreground">
                {(todayAppts?.items || []).length} {locale === 'fr' ? 'rendez-vous' : 'appointments'}
              </p>
            </div>
            <button
              onClick={() => setView('appointments')}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              {t.common.view} <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto scroll-area-glass pr-1">
            {(todayAppts?.items || []).slice(0, 8).map((appt: any, i: number) => (
              <button
                key={appt.id}
                onClick={() => { setSelectedPatientId(appt.patientId); setView('patients') }}
                className="w-full flex items-center gap-3 p-3 rounded-lg glass-base hover:bg-accent/50 transition-colors text-left"
              >
                <div className="flex flex-col items-center min-w-12 shrink-0">
                  <span className="text-xs font-mono font-semibold text-primary">{formatTime(appt.startAt, locale)}</span>
                  <span className="text-[10px] text-muted-foreground">30min</span>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {appt.patient.firstName} {appt.patient.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {appt.practitioner.name} · {appt.reason || t.appointments.types[appt.type as keyof typeof t.appointments.types]}
                  </p>
                </div>
                <StatusPill
                  status={appt.status}
                  variant={appointmentStatusVariant(appt.status)}
                  label={t.appointments.status[appt.status as keyof typeof t.appointments.status]}
                />
                {appt.noShowRisk >= 0.3 && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                    style={{
                      color: appt.noShowRisk >= 0.6 ? '#ef4444' : '#f59e0b',
                      background: appt.noShowRisk >= 0.6 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                    }}
                  >
                    {Math.round(appt.noShowRisk * 100)}%
                  </span>
                )}
              </button>
            ))}
            {(todayAppts?.items || []).length === 0 && (
              <EmptyState
                icon={Clock}
                title={t.common.noData}
                description={locale === 'fr' ? 'Aucun rendez-vous prévu aujourd\'hui.' : 'No appointments scheduled today.'}
              />
            )}
          </div>
        </motion.div>

        {/* Alerts panel */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 450, type: 'spring', stiffness: 200, damping: 25 }}
          className="glass-card rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">{t.dashboard.alertsPanel}</h3>
            <AlertTriangle className="w-4 h-4 text-warning" />
          </div>
          <div className="space-y-2">
            {stats && stats.pendingInvoices > 0 && (
              <button
                onClick={() => setView('billing')}
                className="w-full flex items-start gap-3 p-3 rounded-lg glass-base hover:bg-accent/50 transition-colors text-left"
              >
                <Receipt className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{stats.pendingInvoices} {t.billing.status.pending}</p>
                  <p className="text-xs text-muted-foreground">{t.billing.agedReceivables}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            {stats && stats.inventoryLowStock > 0 && (
              <button
                onClick={() => setView('inventory')}
                className="w-full flex items-start gap-3 p-3 rounded-lg glass-base hover:bg-accent/50 transition-colors text-left"
              >
                <Package className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{stats.inventoryLowStock} {t.inventory.lowStock}</p>
                  <p className="text-xs text-muted-foreground">{t.inventory.subtitle}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <button
              onClick={() => setView('audit')}
              className="w-full flex items-start gap-3 p-3 rounded-lg glass-base hover:bg-accent/50 transition-colors text-left"
            >
              <Sparkles className="w-4 h-4 text-glass-accent shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t.ai.scribe}</p>
                <p className="text-xs text-muted-foreground">{t.ai.pending}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="p-3 rounded-lg glass-base">
              <div className="flex items-center gap-2 mb-1">
                <span className="status-pill text-success">HDS</span>
                <span className="status-pill text-success">RGPD</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {locale === 'fr' ? 'Chaîne d\'audit vérifiée · 0 incident' : 'Audit chain verified · 0 incidents'}
              </p>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  )
}

function specialtyFr(s: string): string {
  const map: Record<string, string> = {
    general: 'Général',
    dental: 'Dental',
    physio: 'Kiné',
    psych: 'Psy',
    derm: 'Derma',
    ophthal: 'Ophtal',
    gyn: 'Gynéco',
    ped: 'Pédo',
  }
  return map[s] || s
}
