'use client'

import { useApp } from '@/lib/store'
import { type Locale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  KeyRound, Monitor, Activity, DollarSign, TrendingUp,
  Users, AlertTriangle, CheckCircle2, Cpu, Zap, Clock,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Area, AreaChart,
} from 'recharts'
import { SkeletonCard } from '@/components/common/skeleton'
import { formatCurrency } from '@/lib/i18n'

async function fetchAdminDashboard() {
  const res = await fetch('/api/admin/dashboard', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

const PLAN_COLORS = {
  trial: '#94a3b8',
  essential: '#3b82f6',
  professional: '#0ea5e9',
  enterprise: '#8b5cf6',
}

const STATUS_COLORS = {
  active: '#22c55e',
  revoked: '#ef4444',
  suspended: '#f59e0b',
  expired: '#64748b',
}

export function AdminDashboardView({ locale }: { locale: Locale }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: fetchAdminDashboard,
    refetchInterval: 30_000,
  })

  if (isLoading || !data) {
    return (
      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    )
  }

  const stats = data.stats
  const planData = data.licensesByPlan.map((p: any) => ({
    name: p.plan,
    value: p.count,
    color: PLAN_COLORS[p.plan as keyof typeof PLAN_COLORS] || '#94a3b8',
  }))
  const statusData = data.licensesByStatus.map((s: any) => ({
    name: s.status,
    value: s.count,
    color: STATUS_COLORS[s.status as keyof typeof STATUS_COLORS] || '#64748b',
  }))
  const telemetryData = data.telemetryByType.map((t: any) => ({
    name: t.type,
    count: t.count,
  }))

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24">
      {/* KPI grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <AdminStatCard label={locale === 'fr' ? 'Revenu mensuel (MRR)' : 'Monthly revenue (MRR)'} value={formatCurrency(stats.mrr, locale)} icon={DollarSign} accent="success" delay={0} trend="+12%" />
        <AdminStatCard label={locale === 'fr' ? 'Licences actives' : 'Active licenses'} value={stats.activeLicenses} icon={KeyRound} accent="primary" delay={50} trend={`${stats.totalLicenses} ${locale === 'fr' ? 'total' : 'total'}`} />
        <AdminStatCard label={locale === 'fr' ? 'Instances actives' : 'Active instances'} value={stats.activeInstances} icon={Monitor} accent="info" delay={100} trend={`${stats.totalInstances} ${locale === 'fr' ? 'total' : 'total'}`} />
        <AdminStatCard label={locale === 'fr' ? 'Baux actifs' : 'Active leases'} value={stats.activeLeases} icon={Activity} accent="warning" delay={150} trend="30j" />
      </section>

      {/* Revenue + charts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue big card */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 200 }}
          className="glass-card stat-card rounded-2xl p-6 lg:col-span-1"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">ARR</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(stats.arr, locale)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{locale === 'fr' ? 'MRR mensuel' : 'Monthly MRR'}</span>
              <span className="font-mono font-semibold">{formatCurrency(stats.mrr, locale)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{locale === 'fr' ? 'Croissance' : 'Growth'}</span>
              <span className="font-mono font-semibold text-success">+12% MoM</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{locale === 'fr' ? 'Churn' : 'Churn'}</span>
              <span className="font-mono font-semibold text-destructive">2.1%</span>
            </div>
          </div>
        </motion.div>

        {/* Daily active instances */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 250 }}
          className="glass-card rounded-2xl p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">{locale === 'fr' ? 'Instances actives (7 jours)' : 'Active instances (7 days)'}</h3>
              <p className="text-xs text-muted-foreground">{locale === 'fr' ? 'Cliniques connectées par jour' : 'Clinics connected per day'}</p>
            </div>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.dailyActive} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.02 250 / 0.15)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="oklch(0.5 0.02 250 / 0.6)" tickFormatter={(d) => new Date(d).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short' })} />
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
              <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} fill="url(#activeGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </section>

      {/* Plans + status + telemetry */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Plans pie */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 300 }}
          className="glass-card rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold mb-4">{locale === 'fr' ? 'Répartition par plan' : 'By plan'}</h3>
          {planData.length > 0 && (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={planData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                  {planData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
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
          )}
          <div className="grid grid-cols-2 gap-1 mt-2">
            {planData.map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px]">
                <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                <span className="capitalize text-muted-foreground">{p.name}</span>
                <span className="font-mono">{p.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Status pie */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 350 }}
          className="glass-card rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold mb-4">{locale === 'fr' ? 'Statut des licences' : 'License status'}</h3>
          {statusData.length > 0 && (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                  {statusData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
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
          )}
          <div className="grid grid-cols-2 gap-1 mt-2">
            {statusData.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px]">
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <span className="capitalize text-muted-foreground">{s.name}</span>
                <span className="font-mono">{s.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Telemetry events */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 400 }}
          className="glass-card rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold mb-4">{locale === 'fr' ? 'Télémétrie (7 jours)' : 'Telemetry (7 days)'}</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={telemetryData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.02 250 / 0.15)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="oklch(0.5 0.02 250 / 0.6)" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="oklch(0.5 0.02 250 / 0.6)" width={80} />
              <Tooltip
                contentStyle={{
                  background: 'var(--glass-floating-bg)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid var(--glass-floating-border)',
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill="var(--glass-accent)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </section>

      {/* Recent instances + admin actions */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent instances */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 450 }}
          className="glass-card rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold mb-3">{locale === 'fr' ? 'Instances récentes' : 'Recent instances'}</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto scroll-area-glass">
            {data.recentInstances.map((inst: any, i: number) => {
              const isOnline = new Date(inst.lastSeenAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
              return (
                <div key={inst.id} className="flex items-center gap-3 p-2 rounded-lg glass-base">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-success' : 'bg-muted-foreground'}`}>
                    {isOnline && <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{inst.hostname || 'Unknown'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{inst.license?.customerName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground font-mono">{inst.appVersion}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(inst.lastSeenAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Admin actions */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 500 }}
          className="glass-card rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold mb-3">{locale === 'fr' ? 'Actions admin' : 'Admin actions'}</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto scroll-area-glass">
            {data.recentActions.map((action: any, i: number) => (
              <div key={action.id} className="flex items-center gap-3 p-2 rounded-lg glass-base">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  action.action.includes('revoke') || action.action.includes('block') ? 'bg-destructive/15 text-destructive' :
                  action.action.includes('issue') || action.action.includes('extend') ? 'bg-success/15 text-success' :
                  action.action.includes('publish') ? 'bg-info/15 text-info' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {action.action.includes('revoke') ? <AlertTriangle className="w-3.5 h-3.5" /> :
                   action.action.includes('issue') ? <KeyRound className="w-3.5 h-3.5" /> :
                   action.action.includes('publish') ? <Zap className="w-3.5 h-3.5" /> :
                   <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{action.action.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{action.adminEmail}</p>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                  {new Date(action.createdAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* System status */}
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 550 }}
        className="glass-base rounded-xl p-4 flex items-center gap-3"
      >
        <Cpu className="w-4 h-4 text-success" />
        <div className="flex-1 flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="status-pill text-success">Licensing Server</span>
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3 h-3" />
            {locale === 'fr' ? 'Uptime: 99.97%' : 'Uptime: 99.97%'}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Zap className="w-3 h-3" />
            {stats.telemetryEvents24h} {locale === 'fr' ? 'événements 24h' : 'events 24h'}
          </span>
        </div>
      </motion.div>
    </div>
  )
}

function AdminStatCard({ label, value, icon: Icon, accent, delay, trend }: any) {
  const accentMap = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    info: 'text-info bg-info/10',
    warning: 'text-warning bg-warning/10',
  }
  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 25 }}
      className="glass-card stat-card rounded-2xl p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
          {trend && <p className="mt-1.5 text-xs text-muted-foreground">{trend}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accentMap[accent]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  )
}
