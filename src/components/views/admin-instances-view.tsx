'use client'

import { useApp } from '@/lib/store'
import { type Locale, formatDateTime } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Monitor, Search, Ban, Play, Cpu, Clock, Activity, Loader2,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SkeletonList } from '@/components/common/skeleton'
import { EmptyState } from '@/components/common/empty-state'
import { toast } from 'sonner'

const STATUS_CONFIG = {
  active: { color: 'text-success bg-success/10', dot: 'bg-success' },
  inactive: { color: 'text-muted-foreground bg-muted', dot: 'bg-muted-foreground' },
  blocked: { color: 'text-destructive bg-destructive/10', dot: 'bg-destructive' },
}

async function fetchInstances(status: string) {
  const params = new URLSearchParams()
  if (status && status !== 'all') params.set('status', status)
  const res = await fetch(`/api/admin/instances?${params}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

export function AdminInstancesView({ locale }: { locale: Locale }) {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-instances', statusFilter],
    queryFn: () => fetchInstances(statusFilter),
    refetchInterval: 30_000,
  })

  const handleAction = async (id: string, action: 'block' | 'unblock') => {
    try {
      const res = await fetch(`/api/admin/instances/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminEmail: 'admin@smartclinic.app' }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(locale === 'fr' ? `Instance ${action === 'block' ? 'bloquée' : 'débloquée'}` : `Instance ${action}`)
      qc.invalidateQueries({ queryKey: ['admin-instances'] })
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={locale === 'fr' ? 'Rechercher (hostname, client)...' : 'Search (hostname, customer)...'}
            className="pl-10 glass-base border-0 h-11"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 glass-base border-0 h-11"><SelectValue /></SelectTrigger>
          <SelectContent className="glass-floating">
            <SelectItem value="all">{locale === 'fr' ? 'Tous' : 'All'}</SelectItem>
            <SelectItem value="active">{locale === 'fr' ? 'Actives' : 'Active'}</SelectItem>
            <SelectItem value="inactive">{locale === 'fr' ? 'Inactives' : 'Inactive'}</SelectItem>
            <SelectItem value="blocked">{locale === 'fr' ? 'Bloquées' : 'Blocked'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Instances grid */}
      {isLoading ? (
        <SkeletonList rows={6} />
      ) : (data?.items || []).length === 0 ? (
        <EmptyState icon={Monitor} title={locale === 'fr' ? 'Aucune instance' : 'No instances'} description={locale === 'fr' ? 'Aucune instance de bureau enregistrée.' : 'No desktop instances registered.'} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(data?.items || []).map((inst: any, i: number) => {
            const isOnline = new Date(inst.lastSeenAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
            const statusCfg = STATUS_CONFIG[inst.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active
            return (
              <motion.div
                key={inst.id}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 20 }}
                className="glass-card rounded-2xl p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-success' : 'bg-muted-foreground'}`} />
                      {isOnline && <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" />}
                    </div>
                    <Monitor className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.color}`}>
                    {inst.status}
                  </span>
                </div>

                <p className="text-sm font-medium truncate mb-1">{inst.hostname || 'Unknown'}</p>
                <p className="text-[11px] text-muted-foreground truncate mb-3">{inst.license?.customerName}</p>

                <div className="grid grid-cols-2 gap-2 text-[10px] mb-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Cpu className="w-3 h-3" />
                    <span className="truncate font-mono">{inst.appVersion || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Activity className="w-3 h-3" />
                    <span className="font-mono">{inst._count?.telemetryEvents || 0}</span>
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground mb-3 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {locale === 'fr' ? 'Vu: ' : 'Seen: '}{formatDateTime(inst.lastSeenAt, locale)}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <Badge variant="outline" className="text-[9px]">{inst.license?.plan}</Badge>
                  {inst.status === 'active' ? (
                    <Button size="sm" variant="outline" onClick={() => handleAction(inst.id, 'block')} className="h-7 text-[11px] text-destructive border-destructive/30 hover:bg-destructive/10">
                      <Ban className="w-3 h-3" /> {locale === 'fr' ? 'Bloquer' : 'Block'}
                    </Button>
                  ) : inst.status === 'blocked' ? (
                    <Button size="sm" variant="outline" onClick={() => handleAction(inst.id, 'unblock')} className="h-7 text-[11px]">
                      <Play className="w-3 h-3" /> {locale === 'fr' ? 'Débloquer' : 'Unblock'}
                    </Button>
                  ) : null}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
