'use client'

import { useApp } from '@/lib/store'
import { getDict, formatDateTime, type Locale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Activity, Search, Heart, AlertTriangle, Zap, Database,
  Upload, Play, Power,
} from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SkeletonList } from '@/components/common/skeleton'
import { EmptyState } from '@/components/common/empty-state'
import { LiveIndicator } from '@/components/common/live-indicator'

const EVENT_ICONS: Record<string, any> = {
  heartbeat: Heart,
  error: AlertTriangle,
  feature_usage: Zap,
  backup: Database,
  update_check: Upload,
  app_launch: Play,
  app_exit: Power,
}

const EVENT_COLORS: Record<string, string> = {
  heartbeat: 'text-success bg-success/10',
  error: 'text-destructive bg-destructive/10',
  feature_usage: 'text-glass-accent bg-glass-accent/10',
  backup: 'text-info bg-info/10',
  update_check: 'text-glass-warm bg-glass-warm/10',
  app_launch: 'text-primary bg-primary/10',
  app_exit: 'text-muted-foreground bg-muted',
}

async function fetchTelemetry(eventType: string, instanceId?: string) {
  const params = new URLSearchParams()
  if (eventType && eventType !== 'all') params.set('eventType', eventType)
  if (instanceId) params.set('instanceId', instanceId)
  params.set('limit', '200')
  const res = await fetch(`/api/admin/telemetry?${params}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

export function AdminTelemetryView({ locale }: { locale: Locale }) {
  const t = getDict(locale)
  const [eventType, setEventType] = useState('all')
  const [search, setSearch] = useState('')

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['admin-telemetry', eventType],
    queryFn: () => fetchTelemetry(eventType),
    refetchInterval: 30_000,
  })

  const filtered = (data?.items || []).filter((e: any) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      e.instance?.hostname?.toLowerCase().includes(s) ||
      e.instance?.license?.customerName?.toLowerCase().includes(s) ||
      e.eventType.toLowerCase().includes(s)
    )
  })

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24">
      {/* Header with live indicator */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t.admin.telemetry.title}</h2>
          <p className="text-xs text-muted-foreground">{t.admin.telemetry.subtitle}</p>
        </div>
        <LiveIndicator
          isFetching={isFetching}
          lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
          onRefresh={() => refetch()}
          locale={locale}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'fr' ? 'Rechercher (instance, client)...' : 'Search (instance, customer)...'}
            className="pl-10 glass-base border-0 h-11"
          />
        </div>
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger className="w-full md:w-48 glass-base border-0 h-11"><SelectValue /></SelectTrigger>
          <SelectContent className="glass-floating">
            <SelectItem value="all">{t.admin.telemetry.allTypes}</SelectItem>
            {Object.entries(t.admin.telemetry.eventTypes).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Telemetry events table — responsive */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {/* Desktop table header */}
        <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
          <div className="col-span-2">{t.admin.telemetry.eventType}</div>
          <div className="col-span-3">{t.admin.telemetry.instance}</div>
          <div className="col-span-4">{t.admin.telemetry.payload}</div>
          <div className="col-span-3 text-right">{t.admin.telemetry.received}</div>
        </div>
        <ScrollArea className="h-[60vh]">
          {isLoading ? (
            <SkeletonList rows={8} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Activity}
              title={t.admin.telemetry.noEvents}
              description={t.admin.telemetry.noEventsDesc}
            />
          ) : (
            filtered.map((event: any, i: number) => {
              const Icon = EVENT_ICONS[event.eventType] || Activity
              const colorClass = EVENT_COLORS[event.eventType] || 'text-muted-foreground bg-muted'
              let payload: any = {}
              try { payload = JSON.parse(event.payload) } catch {}
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 5 }}
                  className="border-b border-border/20 hover:bg-accent/30 transition-colors"
                >
                  {/* Desktop layout */}
                  <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3">
                    <div className="col-span-2 flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-medium truncate">
                        {t.admin.telemetry.eventTypes[event.eventType as keyof typeof t.admin.telemetry.eventTypes] || event.eventType}
                      </span>
                    </div>
                    <div className="col-span-3 flex items-center min-w-0">
                      <div>
                        <p className="text-xs truncate">{event.instance?.hostname || '—'}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{event.instance?.license?.customerName}</p>
                      </div>
                    </div>
                    <div className="col-span-4 flex items-center">
                      <code className="text-[10px] font-mono text-muted-foreground truncate">
                        {JSON.stringify(payload).slice(0, 80)}
                      </code>
                    </div>
                    <div className="col-span-3 flex items-center justify-end">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {formatDateTime(event.receivedAt, locale)}
                      </span>
                    </div>
                  </div>

                  {/* Mobile card */}
                  <div className="md:hidden p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {t.admin.telemetry.eventTypes[event.eventType as keyof typeof t.admin.telemetry.eventTypes] || event.eventType}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">{event.instance?.hostname}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                        {formatDateTime(event.receivedAt, locale)}
                      </span>
                    </div>
                    <code className="text-[10px] font-mono text-muted-foreground block bg-muted/50 rounded p-2 break-all">
                      {JSON.stringify(payload, null, 2).slice(0, 200)}
                    </code>
                  </div>
                </motion.div>
              )
            })
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
