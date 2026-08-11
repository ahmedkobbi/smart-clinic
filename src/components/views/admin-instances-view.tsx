'use client'

import { useApp } from '@/lib/store'
import { getDict, formatDateTime, type Locale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Text, Group, Stack, Badge, Button, TextInput, Select,
  ScrollArea, ActionIcon,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  Monitor, Search, Ban, Play, Cpu, Clock, Activity,
} from 'lucide-react'
import { useState } from 'react'
import { SkeletonList } from '@/components/common/skeleton'
import { EmptyState } from '@/components/common/empty-state'

const STATUS_CONFIG: Record<string, { color: string; dot: string }> = {
  active: { color: 'green', dot: 'bg-success' },
  inactive: { color: 'gray', dot: 'bg-muted-foreground' },
  blocked: { color: 'red', dot: 'bg-destructive' },
}

async function fetchInstances(status: string) {
  const params = new URLSearchParams()
  if (status && status !== 'all') params.set('status', status)
  const res = await fetch(`/api/admin/instances?${params}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

export function AdminInstancesView({ locale }: { locale: Locale }) {
  const t = getDict(locale)
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-instances', statusFilter],
    queryFn: () => fetchInstances(statusFilter),
    refetchInterval: 30_000,
  })

  const filtered = (data?.items || []).filter((inst: any) => {
    if (!search) return true
    const s = search.toLowerCase()
    return inst.hostname?.toLowerCase().includes(s) || inst.license?.customerName?.toLowerCase().includes(s)
  })

  const handleAction = async (id: string, action: 'block' | 'unblock') => {
    try {
      const res = await fetch(`/api/admin/instances/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error('Failed')
      notifications.show({
        message: action === 'block' ? t.admin.instances.blocked : t.admin.instances.unblocked,
        color: action === 'block' ? 'red' : 'green',
      })
      qc.invalidateQueries({ queryKey: ['admin-instances'] })
    } catch (e) {
      notifications.show({ message: (e as Error).message, color: 'red' })
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24">
      {/* Header */}
      <Group justify="space-between" align="flex-end">
        <Stack gap={0}>
          <Text size="lg" fw={600}>{t.admin.instances.title}</Text>
          <Text size="xs" c="dimmed">{t.admin.instances.subtitle}</Text>
        </Stack>
      </Group>

      {/* Filters */}
      <Group gap="sm" grow>
        <TextInput
          leftSection={<Search size={16} />}
          placeholder={t.admin.instances.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          variant="filled"
        />
        <Select
          value={statusFilter}
          onChange={(v) => setStatusFilter(v || 'all')}
          data={[
            { value: 'all', label: t.admin.instances.all },
            { value: 'active', label: t.admin.instances.activePlural },
            { value: 'inactive', label: t.admin.instances.inactivePlural },
            { value: 'blocked', label: t.admin.instances.blockedPlural },
          ]}
          variant="filled"
          w={{ base: '100%', md: 200 }}
        />
      </Group>

      {/* Instances grid */}
      {isLoading ? (
        <SkeletonList rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Monitor} title={t.admin.instances.noInstances} description={t.admin.instances.noInstancesDesc} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((inst: any, i: number) => {
            const isOnline = new Date(inst.lastSeenAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
            const statusCfg = STATUS_CONFIG[inst.status] || STATUS_CONFIG.active
            return (
              <motion.div
                key={inst.id}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 20 }}
                className="glass-card rounded-2xl p-4"
              >
                <Group justify="space-between" mb="sm">
                  <Group gap="sm">
                    <div className="relative">
                      <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-success' : 'bg-muted-foreground'}`} />
                      {isOnline && <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" />}
                    </div>
                    <Monitor size={16} className="text-muted-foreground" />
                  </Group>
                  <Badge color={statusCfg.color} variant="light" size="sm">{inst.status}</Badge>
                </Group>

                <Text size="sm" fw={500} truncate mb={2}>{inst.hostname || 'Unknown'}</Text>
                <Text size="xs" c="dimmed" truncate mb="sm">{inst.license?.customerName}</Text>

                <Group gap="md" mb="sm">
                  <Group gap={4}>
                    <Cpu size={12} className="text-muted-foreground" />
                    <Text size="xs" ff="mono" c="dimmed">{inst.appVersion || '—'}</Text>
                  </Group>
                  <Group gap={4}>
                    <Activity size={12} className="text-muted-foreground" />
                    <Text size="xs" c="dimmed">{inst._count?.telemetryEvents || 0} {t.admin.instances.telemetryCount}</Text>
                  </Group>
                </Group>

                <Group gap={4} mb="sm">
                  <Clock size={12} className="text-muted-foreground" />
                  <Text size="xs" c="dimmed">{t.admin.instances.seen}: {formatDateTime(inst.lastSeenAt, locale)}</Text>
                </Group>

                <Group justify="space-between" className="pt-2 border-t border-border/30">
                  <Badge variant="outline" size="sm">{inst.license?.plan}</Badge>
                  {inst.status === 'active' ? (
                    <Button variant="default" size="xs" color="red" onClick={() => handleAction(inst.id, 'block')} leftSection={<Ban size={12} />}>
                      {t.admin.instances.block}
                    </Button>
                  ) : inst.status === 'blocked' ? (
                    <Button variant="default" size="xs" onClick={() => handleAction(inst.id, 'unblock')} leftSection={<Play size={12} />}>
                      {t.admin.instances.unblock}
                    </Button>
                  ) : null}
                </Group>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
