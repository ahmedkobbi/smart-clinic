'use client'

import { useApp } from '@/lib/store'
import { getDict, type Locale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Leaf, TreePine, Droplet, Car, Smartphone, FileText, Pill, Receipt,
  TrendingDown,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { SkeletonCard } from '@/components/common/skeleton'

async function fetchSustainability() {
  const res = await fetch('/api/sustainability', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

export function SustainabilityView({ locale }: { locale: Locale }) {
  const t = getDict(locale)

  const { data, isLoading } = useQuery({
    queryKey: ['sustainability'],
    queryFn: fetchSustainability,
    refetchInterval: 60_000,
  })

  if (isLoading || !data) {
    return (
      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24">
      {/* Hero */}
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-card rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-success/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-success/15 flex items-center justify-center">
              <Leaf className="w-6 h-6 text-success" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {t.sustainability.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t.sustainability.subtitle}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 max-w-2xl leading-relaxed">
            {t.sustainability.intro}
          </p>
        </div>
      </motion.div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <EcoStat
          label={t.sustainability.sheetsSaved}
          value={data.totalSheetsSaved.toLocaleString(locale)}
          icon={FileText}
          color="success"
          delay={0}
        />
        <EcoStat
          label={t.sustainability.co2Avoided}
          value={`${data.totalCo2KgSaved} kg`}
          icon={TrendingDown}
          color="primary"
          delay={50}
        />
        <EcoStat
          label={t.sustainability.treesSaved}
          value={data.treesSaved.toString()}
          icon={TreePine}
          color="success"
          delay={100}
        />
        <EcoStat
          label={t.sustainability.waterSaved}
          value={`${(data.waterLitersSaved / 1000).toFixed(1)} m³`}
          icon={Droplet}
          color="info"
          delay={150}
        />
      </div>

      {/* Monthly chart */}
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 200 }}
        className="glass-card rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold">
              {t.sustainability.monthlyTrend}
            </h3>
            <p className="text-xs text-muted-foreground">{t.sustainability.sheetsPerMonth}</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.monthlyData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.02 250 / 0.15)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="oklch(0.5 0.02 250 / 0.6)" />
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
            <Bar dataKey="sheets" fill="var(--success)" radius={[6, 6, 0, 0]} name={t.sustainability.sheets} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Breakdown + equivalences */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Breakdown */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 250 }}
          className="glass-card rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold mb-4">{t.sustainability.breakdownBySource}</h3>
          <div className="space-y-3">
            <BreakdownRow
              icon={FileText}
              label={t.sustainability.digitalizedConsultations}
              value={data.breakdown.consultations}
              total={data.totalSheetsSaved}
              color="var(--primary)"
            />
            <BreakdownRow
              icon={Pill}
              label={t.sustainability.electronicPrescriptions}
              value={data.breakdown.prescriptions}
              total={data.totalSheetsSaved}
              color="var(--glass-accent)"
            />
            <BreakdownRow
              icon={Receipt}
              label={t.sustainability.paperlessInvoices}
              value={data.breakdown.invoices}
              total={data.totalSheetsSaved}
              color="var(--success)"
            />
          </div>
        </motion.div>

        {/* Equivalences */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 300 }}
          className="glass-card rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold mb-4">{t.sustainability.equivalences}</h3>
          <div className="space-y-3">
            <EquivalenceRow
              icon={Car}
              label={t.sustainability.kmAvoided}
              value={`${data.equivalences.kmDriven.toLocaleString(locale)} km`}
            />
            <EquivalenceRow
              icon={Smartphone}
              label={t.sustainability.phoneCharges}
              value={data.equivalences.phoneCharges.toLocaleString(locale)}
            />
            <EquivalenceRow
              icon={TreePine}
              label={t.sustainability.treesPlanted}
              value={data.equivalences.treesPlantedEquivalent.toString()}
            />
          </div>
        </motion.div>
      </div>

      {/* ADEME attribution */}
      <div className="glass-base rounded-xl p-3 text-[10px] text-muted-foreground leading-relaxed">
        {t.sustainability.methodology}
      </div>
    </div>
  )
}

function EcoStat({ label, value, icon: Icon, color, delay }: any) {
  const colorMap = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    info: 'text-info bg-info/10',
    warning: 'text-warning bg-warning/10',
  }
  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay }}
      className="glass-card stat-card rounded-2xl p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  )
}

function BreakdownRow({ icon: Icon, label, value, total, color }: any) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          {label}
        </span>
        <span className="font-medium tabular-nums">{value.toLocaleString()} ({pct.toFixed(0)}%)</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  )
}

function EquivalenceRow({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg glass-base">
      <span className="flex items-center gap-2 text-xs">
        <Icon className="w-4 h-4 text-success" />
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  )
}
