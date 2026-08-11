'use client'

import { cn } from '@/lib/utils'

interface StatusPillProps {
  status: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  label?: string
  className?: string
}

const variantClasses = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-destructive/15 text-destructive',
  info: 'bg-info/15 text-info',
  neutral: 'bg-muted text-muted-foreground',
}

export function StatusPill({ status, variant = 'neutral', label, className }: StatusPillProps) {
  return (
    <span className={cn('status-pill', variantClasses[variant], className)}>
      {label || status}
    </span>
  )
}

// Status-to-variant mapping helpers
export function appointmentStatusVariant(status: string): StatusPillProps['variant'] {
  switch (status) {
    case 'completed': return 'success'
    case 'in_session':
    case 'checked_in': return 'info'
    case 'cancelled':
    case 'no_show': return 'danger'
    case 'confirmed': return 'success'
    default: return 'neutral'
  }
}

export function invoiceStatusVariant(status: string): StatusPillProps['variant'] {
  switch (status) {
    case 'paid': return 'success'
    case 'partial': return 'warning'
    case 'overdue': return 'danger'
    case 'pending': return 'warning'
    case 'issued': return 'info'
    case 'draft':
    case 'cancelled': return 'neutral'
    default: return 'neutral'
  }
}

export function noShowRiskVariant(risk: number): StatusPillProps['variant'] {
  if (risk >= 0.6) return 'danger'
  if (risk >= 0.3) return 'warning'
  return 'success'
}
