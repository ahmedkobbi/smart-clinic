'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' }
  accent?: 'primary' | 'accent' | 'warm' | 'success' | 'warning' | 'info'
  delay?: number
}

const accentMap = {
  primary: 'text-primary bg-primary/10',
  accent: 'text-glass-accent bg-glass-accent/10',
  warm: 'text-glass-warm bg-glass-warm/10',
  success: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/10',
  info: 'text-info bg-info/10',
}

export function StatCard({ label, value, icon: Icon, trend, accent = 'primary', delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 25 }}
      className="glass-card stat-card rounded-2xl p-5 relative overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
          {trend && (
            <p className={cn(
              "mt-1.5 text-xs flex items-center gap-1",
              trend.direction === 'up' && 'text-success',
              trend.direction === 'down' && 'text-destructive',
              trend.direction === 'neutral' && 'text-muted-foreground'
            )}>
              {trend.direction === 'up' && '↑'}
              {trend.direction === 'down' && '↓'}
              {trend.value}
            </p>
          )}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', accentMap[accent])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  )
}
