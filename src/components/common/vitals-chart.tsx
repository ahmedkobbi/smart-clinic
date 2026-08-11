'use client'

import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Legend,
} from 'recharts'
import type { Locale } from '@/lib/i18n'
import { getDict, formatDate } from '@/lib/i18n'
import { Activity, Heart, Thermometer, Droplet } from 'lucide-react'

interface VitalsChartProps {
  vitals: any[]
  locale: Locale
}

export function VitalsChart({ vitals, locale }: VitalsChartProps) {
  const t = getDict(locale)

  // Group vitals by type
  const byType = vitals.reduce((acc: Record<string, any[]>, v) => {
    if (!acc[v.type]) acc[v.type] = []
    acc[v.type].push(v)
    return acc
  }, {})

  // Build chart data — merge all types by date
  const allDates = new Set<string>()
  for (const v of vitals) {
    allDates.add(new Date(v.recordedAt).toISOString().slice(0, 10))
  }
  const sortedDates = Array.from(allDates).sort()

  const chartData = sortedDates.map(date => {
    const entry: any = { date }
    for (const [type, records] of Object.entries(byType)) {
      const rec = (records as any[]).find(r => new Date(r.recordedAt).toISOString().slice(0, 10) === date)
      if (rec) {
        if (type === 'blood_pressure') {
          const [sys, dia] = rec.value.split('/').map((n: string) => parseInt(n))
          entry.bp_sys = sys
          entry.bp_dia = dia
        } else if (type === 'heart_rate') {
          entry.hr = parseInt(rec.value)
        } else if (type === 'temperature') {
          entry.temp = parseFloat(rec.value)
        } else if (type === 'spo2') {
          entry.spo2 = parseFloat(rec.value)
        }
      }
    }
    return entry
  })

  const hasBP = byType.blood_pressure?.length > 0
  const hasHR = byType.heart_rate?.length > 0
  const hasTemp = byType.temperature?.length > 0

  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass-card rounded-2xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.patients.vitalsTrend}
          </h4>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          {hasBP && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-chart-1" />TA</span>}
          {hasHR && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-chart-4" />FC</span>}
          {hasTemp && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-chart-3" />T°</span>}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.02 250 / 0.12)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            stroke="oklch(0.5 0.02 250 / 0.5)"
            tickFormatter={(d) => formatDate(d, locale)}
          />
          <YAxis tick={{ fontSize: 10 }} stroke="oklch(0.5 0.02 250 / 0.5)" />
          <Tooltip
            contentStyle={{
              background: 'var(--glass-floating-bg)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--glass-floating-border)',
              borderRadius: 12,
              fontSize: 11,
            }}
            labelFormatter={(d) => formatDate(d as string, locale)}
          />
          {hasBP && (
            <>
              <Line type="monotone" dataKey="bp_sys" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} name="TA Sys" />
              <Line type="monotone" dataKey="bp_dia" stroke="var(--chart-1)" strokeWidth={1.5} dot={false} strokeDasharray="4 4" name="TA Dia" />
            </>
          )}
          {hasHR && (
            <Line type="monotone" dataKey="hr" stroke="var(--chart-4)" strokeWidth={2} dot={{ r: 3 }} name="FC (bpm)" />
          )}
          {hasTemp && (
            <Line type="monotone" dataKey="temp" stroke="var(--chart-3)" strokeWidth={2} dot={{ r: 3 }} name="T° (°C)" />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Latest values summary */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {hasBP && (
          <div className="p-2 rounded-lg glass-base">
            <div className="flex items-center gap-1 mb-0.5">
              <Droplet className="w-3 h-3 text-chart-1" />
              <span className="text-[9px] uppercase text-muted-foreground font-semibold">TA</span>
            </div>
            <p className="text-xs font-mono font-medium">
              {byType.blood_pressure[0]?.value} <span className="text-[9px] text-muted-foreground">mmHg</span>
            </p>
          </div>
        )}
        {hasHR && (
          <div className="p-2 rounded-lg glass-base">
            <div className="flex items-center gap-1 mb-0.5">
              <Heart className="w-3 h-3 text-chart-4" />
              <span className="text-[9px] uppercase text-muted-foreground font-semibold">FC</span>
            </div>
            <p className="text-xs font-mono font-medium">
              {byType.heart_rate[0]?.value} <span className="text-[9px] text-muted-foreground">bpm</span>
            </p>
          </div>
        )}
        {hasTemp && (
          <div className="p-2 rounded-lg glass-base">
            <div className="flex items-center gap-1 mb-0.5">
              <Thermometer className="w-3 h-3 text-chart-3" />
              <span className="text-[9px] uppercase text-muted-foreground font-semibold">T°</span>
            </div>
            <p className="text-xs font-mono font-medium">
              {byType.temperature[0]?.value} <span className="text-[9px] text-muted-foreground">°C</span>
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
