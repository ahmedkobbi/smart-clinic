'use client'

import { useApp } from '@/lib/store'
import { type Locale, formatDateTime } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Activity, KeyRound, Ban, Play, Clock, Zap, LogIn,
  AlertTriangle, CheckCircle2, Eye,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SkeletonList } from '@/components/common/skeleton'
import { EmptyState } from '@/components/common/empty-state'

const ACTION_ICONS: Record<string, any> = {
  issue_license: KeyRound,
  revoke_license: Ban,
  suspend_license: AlertTriangle,
  reactivate_license: Play,
  extend_license: Clock,
  block_instance: Ban,
  unblock_instance: Play,
  publish_update: Zap,
  admin_login: LogIn,
  lease_issued: CheckCircle2,
}

const ACTION_COLORS: Record<string, string> = {
  issue_license: 'text-success bg-success/10',
  revoke_license: 'text-destructive bg-destructive/10',
  suspend_license: 'text-warning bg-warning/10',
  reactivate_license: 'text-success bg-success/10',
  extend_license: 'text-info bg-info/10',
  block_instance: 'text-destructive bg-destructive/10',
  unblock_instance: 'text-success bg-success/10',
  publish_update: 'text-glass-warm bg-glass-warm/10',
  admin_login: 'text-info bg-info/10',
  lease_issued: 'text-muted-foreground bg-muted',
}

async function fetchActions() {
  const res = await fetch('/api/admin/dashboard', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  const data = await res.json()
  return data.recentActions || []
}

export function AdminActionsView({ locale }: { locale: Locale }) {
  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['admin-actions'],
    queryFn: fetchActions,
    refetchInterval: 30_000,
  })

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24">
      <div>
        <h2 className="text-lg font-semibold">{locale === 'fr' ? 'Journal d\'audit administrateur' : 'Admin audit log'}</h2>
        <p className="text-xs text-muted-foreground">{locale === 'fr' ? 'Toutes les actions administrateur sont journalisées' : 'All admin actions are logged'}</p>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
          <div className="col-span-2">{locale === 'fr' ? 'Action' : 'Action'}</div>
          <div className="col-span-3">{locale === 'fr' ? 'Admin' : 'Admin'}</div>
          <div className="col-span-3 hidden md:block">{locale === 'fr' ? 'Cible' : 'Target'}</div>
          <div className="col-span-2 hidden md:block">IP</div>
          <div className="col-span-2 md:col-span-2 text-right">{locale === 'fr' ? 'Date' : 'Date'}</div>
        </div>
        <ScrollArea className="h-[60vh]">
          {isLoading ? (
            <SkeletonList rows={8} />
          ) : actions.length === 0 ? (
            <EmptyState icon={Activity} title={locale === 'fr' ? 'Aucune action' : 'No actions'} description={locale === 'fr' ? 'Aucune action administrateur enregistrée.' : 'No admin actions recorded.'} />
          ) : (
            actions.map((action: any, i: number) => {
              const Icon = ACTION_ICONS[action.action] || Eye
              const colorClass = ACTION_COLORS[action.action] || 'text-muted-foreground bg-muted'
              return (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 20 }}
                  className="grid grid-cols-12 gap-3 px-4 py-3 hover:bg-accent/30 transition-colors border-b border-border/20"
                >
                  <div className="col-span-2 flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium truncate">{action.action.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="col-span-3 flex items-center">
                    <span className="text-xs truncate">{action.adminEmail}</span>
                  </div>
                  <div className="col-span-3 hidden md:flex items-center gap-2">
                    {action.target && <Badge variant="outline" className="text-[9px]">{action.target}</Badge>}
                    {action.targetId && <code className="text-[10px] font-mono text-muted-foreground truncate">{action.targetId.slice(-8)}</code>}
                  </div>
                  <div className="col-span-2 hidden md:flex items-center">
                    <code className="text-[10px] font-mono text-muted-foreground">{action.ipAddress || '—'}</code>
                  </div>
                  <div className="col-span-2 md:col-span-2 flex items-center justify-end">
                    <span className="text-[10px] text-muted-foreground font-mono">{formatDateTime(action.createdAt, locale)}</span>
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
