'use client'

import { useApp } from '@/lib/store'
import { getDict, formatCurrency, formatDate, type Locale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  KeyRound, Monitor, Activity, DollarSign, TrendingUp,
  AlertTriangle, CheckCircle2, Cpu, Zap, Clock,
} from 'lucide-react'
import { AreaChart, BarChart, DonutChart } from '@mantine/charts'
import { SkeletonCard } from '@/components/common/skeleton'
import { LiveIndicator } from '@/components/common/live-indicator'
import { AnimatedNumber } from '@/components/common/animated-number'

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
  const t = getDict(locale)
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
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
      {/* Header with live indicator */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t.admin.overview.title}</h2>
          <p className="text-xs text-muted-foreground">{t.admin.overview.subtitle}</p>
        </div>
        <LiveIndicator
          isFetching={isFetching}
          lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
          onRefresh={() => refetch()}
          locale={locale}
        />
      </div>

      {/* KPI grid with animated numbers */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <AdminStatCard
          label={t.admin.overview.mrr}
          value={<AnimatedNumber value={stats.mrr} format={(n) => formatCurrency(n, locale)} />}
          icon={DollarSign}
          accent="success"
          delay={0}
          trend="+12% MoM"
        />
        <AdminStatCard
          label={t.admin.overview.activeLicenses}
          value={<AnimatedNumber value={stats.activeLicenses} />}
          icon={KeyRound}
          accent="primary"
          delay={50}
          trend={`${stats.totalLicenses} ${t.admin.overview.total}`}
        />
        <AdminStatCard
          label={t.admin.overview.activeInstances}
          value={<AnimatedNumber value={stats.activeInstances} />}
          icon={Monitor}
          accent="info"
          delay={100}
          trend={`${stats.totalInstances} ${t.admin.overview.total}`}
        />
        <AdminStatCard
          label={t.admin.overview.activeLeases}
          value={<AnimatedNumber value={stats.activeLeases} />}
          icon={Activity}
          accent="warning"
          delay={150}
          trend="30j"
        />
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
              <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">{t.admin.overview.arr}</p>
              <p className="text-3xl font-bold mt-1">
                <AnimatedNumber value={stats.arr} format={(n) => formatCurrency(n, locale)} duration={1.2} />
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t.admin.overview.monthlyMrr}</span>
              <span className="font-mono font-semibold">{formatCurrency(stats.mrr, locale)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t.admin.overview.growth}</span>
              <span className="font-mono font-semibold text-success">+12% MoM</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t.admin.overview.churn}</span>
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
              <h3 className="text-sm font-semibold">{t.admin.overview.dailyActive}</h3>
              <p className="text-xs text-muted-foreground">{t.admin.overview.dailyActiveSub}</p>
            </div>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
          <AreaChart
            h={200}
            data={data.dailyActive}
            dataKey="date"
            series={[{ name: 'count', color: 'var(--primary)' }]}
            xAxisProps={{ tick: { fontSize: 11 }, tickFormatter: (value: any) => formatDate(String(value), locale) }}
            yAxisProps={{ tick: { fontSize: 11 } }}
            gridProps={{ strokeDasharray: '3 3', vertical: false }}
            tooltipProps={{
              content: ({ label, payload }: any) =>
                payload && payload.length > 0 ? (
                  <div
                    style={{
                      background: 'var(--glass-floating-bg)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid var(--glass-floating-border)',
                      borderRadius: 12,
                      fontSize: 12,
                      padding: 8,
                    }}
                  >
                    <p style={{ opacity: 0.7 }}>{formatDate(String(label), locale)}</p>
                    <p style={{ color: 'var(--primary)' }}>{payload[0]?.value}</p>
                  </div>
                ) : null,
            }}
          />
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
          <h3 className="text-sm font-semibold mb-4">{t.admin.overview.byPlan}</h3>
          {planData.length > 0 && (
            <DonutChart
              h={180}
              data={planData}
              thickness={30}
              strokeWidth={1}
            />
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
          <h3 className="text-sm font-semibold mb-4">{t.admin.overview.byStatus}</h3>
          {statusData.length > 0 && (
            <DonutChart
              h={180}
              data={statusData}
              thickness={30}
              strokeWidth={1}
            />
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
          <h3 className="text-sm font-semibold mb-4">{t.admin.overview.telemetry7d}</h3>
          <BarChart
            h={180}
            data={telemetryData}
            dataKey="name"
            series={[{ name: 'count', color: 'var(--glass-accent)' }]}
            orientation="vertical"
            xAxisProps={{ tick: { fontSize: 10 } }}
            yAxisProps={{ tick: { fontSize: 10 }, width: 80 }}
            gridProps={{ strokeDasharray: '3 3', horizontal: false }}
            tooltipProps={{
              content: ({ label, payload }: any) =>
                payload && payload.length > 0 ? (
                  <div
                    style={{
                      background: 'var(--glass-floating-bg)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid var(--glass-floating-border)',
                      borderRadius: 12,
                      fontSize: 12,
                      padding: 8,
                    }}
                  >
                    <p style={{ fontWeight: 500 }}>{label}</p>
                    <p style={{ color: 'var(--glass-accent)' }}>{payload[0]?.value}</p>
                  </div>
                ) : null,
            }}
          />
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
          <h3 className="text-sm font-semibold mb-3">{t.admin.overview.recentInstances}</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto scroll-area-glass">
            {data.recentInstances.map((inst: any) => {
              const isOnline = new Date(inst.lastSeenAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
              return (
                <div key={inst.id} className="flex items-center gap-3 p-2 rounded-lg glass-base">
                  <div className="relative">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-success' : 'bg-muted-foreground'}`} />
                    {isOnline && <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{inst.hostname || 'Unknown'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{inst.license?.customerName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground font-mono">{inst.appVersion}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(inst.lastSeenAt, locale)}</p>
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
          <h3 className="text-sm font-semibold mb-3">{t.admin.overview.recentActions}</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto scroll-area-glass">
            {data.recentActions.map((action: any) => (
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
                  {formatDate(action.createdAt, locale)}
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
            <span className="status-pill text-success">{t.admin.overview.systemStatus}</span>
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3 h-3" />
            {t.admin.overview.uptime}: 99.97%
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Zap className="w-3 h-3" />
            <AnimatedNumber value={stats.telemetryEvents24h} /> {t.admin.overview.events24h}
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
