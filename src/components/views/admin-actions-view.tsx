'use client'

import { useApp } from '@/lib/store'
import { getDict, formatDateTime, type Locale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Text, Group, Badge, ScrollArea,
} from '@mantine/core'
import {
  Activity, KeyRound, Ban, Play, Clock, Zap, LogIn,
  AlertTriangle, CheckCircle2, Eye,
} from 'lucide-react'
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
  issue_license: 'green',
  revoke_license: 'red',
  suspend_license: 'orange',
  reactivate_license: 'green',
  extend_license: 'blue',
  block_instance: 'red',
  unblock_instance: 'green',
  publish_update: 'grape',
  admin_login: 'blue',
  lease_issued: 'gray',
}

async function fetchActions() {
  const res = await fetch('/api/admin/dashboard', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  const data = await res.json()
  return data.recentActions || []
}

export function AdminActionsView({ locale }: { locale: Locale }) {
  const t = getDict(locale)
  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['admin-actions'],
    queryFn: fetchActions,
    refetchInterval: 30_000,
  })

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24">
      {/* Header */}
      <Group justify="space-between" align="flex-end">
        <div>
          <Text size="lg" fw={600}>{t.admin.actions.title}</Text>
          <Text size="xs" c="dimmed">{t.admin.actions.subtitle}</Text>
        </div>
      </Group>

      {/* Actions table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
          <div className="col-span-3">{t.admin.actions.action}</div>
          <div className="col-span-3">{t.admin.actions.admin}</div>
          <div className="col-span-3 hidden md:block">{t.admin.actions.target}</div>
          <div className="col-span-2 hidden md:block">IP</div>
          <div className="col-span-2 md:col-span-1 text-right">{t.admin.actions.date}</div>
        </div>
        <ScrollArea h={500}>
          {isLoading ? (
            <SkeletonList rows={8} />
          ) : actions.length === 0 ? (
            <EmptyState icon={Activity} title={t.admin.actions.noActions} description={t.admin.actions.noActionsDesc} />
          ) : (
            actions.map((action: any, i: number) => {
              const Icon = ACTION_ICONS[action.action] || Eye
              const color = ACTION_COLORS[action.action] || 'gray'
              return (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 20 }}
                  className="grid grid-cols-12 gap-3 px-4 py-3 hover:bg-accent/30 transition-colors border-b border-border/20"
                >
                  <div className="col-span-3 flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-${color}-500/15`}>
                      <Icon className={`w-3.5 h-3.5 text-${color}-500`} />
                    </div>
                    <Text size="xs" fw={500} truncate>{action.action.replace(/_/g, ' ')}</Text>
                  </div>
                  <div className="col-span-3 flex items-center">
                    <Text size="xs" truncate>{action.adminEmail}</Text>
                  </div>
                  <div className="col-span-3 hidden md:flex items-center gap-2">
                    {action.target && <Badge variant="outline" size="sm">{action.target}</Badge>}
                    {action.targetId && <Text size="10px" ff="mono" c="dimmed" truncate>{action.targetId.slice(-8)}</Text>}
                  </div>
                  <div className="col-span-2 hidden md:flex items-center">
                    <Text size="10px" ff="mono" c="dimmed">{action.ipAddress || '—'}</Text>
                  </div>
                  <div className="col-span-2 md:col-span-1 flex items-center justify-end">
                    <Text size="10px" ff="mono" c="dimmed">{formatDateTime(action.createdAt, locale)}</Text>
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
