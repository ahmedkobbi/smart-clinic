'use client'

import { useApp } from '@/lib/store'
import { getDict, formatDateTime, type Locale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ShieldCheck, ShieldAlert, Link2, Search, Fingerprint,
  Eye, FilePlus, FileEdit, FileX, Download, LogIn, AlertTriangle,
  CheckCircle2, XCircle, Loader2,
} from 'lucide-react'
import { useState } from 'react'
import { TextInput, Button, Badge, Select, Tabs, ScrollArea, Group } from '@mantine/core'
import { EmptyState } from '@/components/common/empty-state'
import { SkeletonList } from '@/components/common/skeleton'
import { ConsentManager } from './consent-manager'
import { notifications } from '@mantine/notifications'

interface AuditResponse { items: any[]; total: number }
interface ChainVerify { valid: boolean; checked: number; brokenAt?: string }

async function fetchAudit(action: string, entity: string): Promise<AuditResponse> {
  const params = new URLSearchParams()
  if (action && action !== 'all') params.set('action', action)
  if (entity && entity !== 'all') params.set('entity', entity)
  params.set('limit', '200')
  const res = await fetch(`/api/audit?${params}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

async function verifyChain(): Promise<ChainVerify> {
  const res = await fetch('/api/audit', { method: 'POST', cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

const ACTION_ICONS: Record<string, any> = {
  view: Eye,
  create: FilePlus,
  update: FileEdit,
  delete: FileX,
  export: Download,
  login: LogIn,
  break_glass: AlertTriangle,
}

const ACTION_COLORS: Record<string, string> = {
  view: 'text-info',
  create: 'text-success',
  update: 'text-warning',
  delete: 'text-destructive',
  export: 'text-glass-accent',
  login: 'text-info',
  break_glass: 'text-destructive',
}

export function AuditView({ locale }: { locale: Locale }) {
  const t = getDict(locale)
  const qc = useQueryClient()
  const [action, setAction] = useState('all')
  const [entity, setEntity] = useState('all')
  const [search, setSearch] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<ChainVerify | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['audit', action, entity],
    queryFn: () => fetchAudit(action, entity),
    refetchInterval: 30_000,
  })

  const handleVerify = async () => {
    setVerifying(true)
    try {
      const result = await verifyChain()
      setVerifyResult(result)
      if (result.valid) {
      notifications.show({ message: t.audit.chainValidToast.replace('{n}', String(result.checked)), color: 'green' })
      } else {
        notifications.show({ message: t.audit.chainBrokenToast.replace('{n}', String(result.checked)), color: 'red' })
      }
    } catch (e) {
      notifications.show({ message: (e as Error).message, color: 'red' })
    } finally {
      setVerifying(false)
    }
  }

  const filtered = (data?.items || []).filter((log: any) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      log.user?.name?.toLowerCase().includes(s) ||
      log.action?.toLowerCase().includes(s) ||
      log.entity?.toLowerCase().includes(s) ||
      log.entityId?.toLowerCase().includes(s) ||
      log.hash?.toLowerCase().includes(s)
    )
  })

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24">
      <Tabs defaultValue="log">
        <Tabs.List className="glass-base">
          <Tabs.Tab value="log">
            <Group gap={6}>
              <Link2 className="w-3.5 h-3.5" />
              <span>{t.audit.log}</span>
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="consent">
            <Group gap={6}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t.audit.consent}</span>
            </Group>
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="log" className="space-y-4 mt-4">
          {/* Hash chain status banner */}
          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="glass-card rounded-2xl p-5"
          >
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${verifyResult === null ? 'bg-primary/10 text-primary' : verifyResult.valid ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                  {verifyResult === null ? <Link2 className="w-6 h-6" /> : verifyResult.valid ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    {t.audit.hashChain}
                    <Badge variant="outline" size="sm" className="font-mono">SHA-256</Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {verifyResult === null
                      ? t.audit.chainVerifyHint
                      : verifyResult.valid
                        ? `${t.audit.chainValid} · ${verifyResult.checked} ${t.audit.entries}`
                        : `${t.audit.chainInvalid} · ${t.audit.chainBrokenAt} ${verifyResult.checked}`}
                  </p>
                </div>
              </div>
              <Button onClick={handleVerify} disabled={verifying} loading={verifying} leftSection={verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}>
                {verifying ? t.common.loading : t.audit.verifyChain}
              </Button>
            </div>

            {/* Chain visualization */}
            {verifyResult && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-4 pt-4 border-t border-border/30 overflow-hidden"
              >
                <div className="flex items-center gap-1 overflow-x-auto scroll-area-glass pb-2">
                  {Array.from({ length: Math.min(20, verifyResult.checked) }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 30 }}
                      className="flex items-center gap-1 shrink-0"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${verifyResult.valid || i < verifyResult.checked ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                        <Fingerprint className="w-4 h-4" />
                      </div>
                      {i < Math.min(20, verifyResult.checked) - 1 && (
                        <div className={`w-3 h-px ${verifyResult.valid || i < verifyResult.checked - 1 ? 'bg-success' : 'bg-destructive'}`} />
                      )}
                    </motion.div>
                  ))}
                  {verifyResult.checked > 20 && (
                    <span className="text-xs text-muted-foreground ml-2 shrink-0">+{verifyResult.checked - 20}</span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t.audit.chainDesc}
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Filters */}
          <Group gap="sm" align="stretch" className="flex flex-col md:flex-row">
            <TextInput
              leftSection={<Search className="w-4 h-4" />}
              placeholder={t.audit.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              variant="filled"
              className="flex-1"
            />
            <Select
              value={action}
              onChange={(v) => setAction(v || 'all')}
              data={[
                { value: 'all', label: t.common.allActions },
                ...Object.entries(t.audit.actions).map(([k, v]) => ({ value: k, label: v as string })),
              ]}
              variant="filled"
              w={{ base: '100%', md: 180 }}
            />
            <Select
              value={entity}
              onChange={(v) => setEntity(v || 'all')}
              data={[
                { value: 'all', label: t.common.allEntities },
                ...Object.entries(t.audit.entities).map(([k, v]) => ({ value: k, label: v as string })),
              ]}
              variant="filled"
              w={{ base: '100%', md: 180 }}
            />
          </Group>

          {/* Audit log entries */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
              <div className="col-span-3 md:col-span-2">{t.common.time}</div>
              <div className="col-span-2 hidden md:block">{t.common.by}</div>
              <div className="col-span-3 md:col-span-2">{t.common.actions}</div>
              <div className="col-span-4 md:col-span-3">{t.common.type}</div>
              <div className="col-span-2 hidden md:block">Hash</div>
              <div className="col-span-2 md:col-span-1 text-right">IP</div>
            </div>
            <ScrollArea h="55vh">
              {isLoading ? (
                <SkeletonList rows={8} />
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={ShieldCheck}
                  title={t.audit.noEntries}
                  description={t.audit.noEntriesDesc}
                />
              ) : (
                filtered.map((log: any, i: number) => {
                  const Icon = ACTION_ICONS[log.action] || Eye
                  const colorClass = ACTION_COLORS[log.action] || 'text-muted-foreground'
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 8 }}
                      className={`grid grid-cols-12 gap-3 px-4 py-3 hover:bg-accent/30 transition-colors border-b border-border/20 ${log.action === 'break_glass' ? 'bg-destructive/5' : ''}`}
                    >
                      <div className="col-span-3 md:col-span-2">
                        <p className="text-[11px] font-mono">{formatDateTime(log.createdAt, locale)}</p>
                      </div>
                      <div className="col-span-2 hidden md:flex items-center text-xs">
                        <span className="truncate">{log.user?.name || '—'}</span>
                      </div>
                      <div className="col-span-3 md:col-span-2 flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 ${colorClass}`} />
                        <span className="text-xs">{t.audit.actions[log.action as keyof typeof t.audit.actions] || log.action}</span>
                      </div>
                      <div className="col-span-4 md:col-span-3 flex items-center gap-1.5">
                        <span className="text-xs">{t.audit.entities[log.entity as keyof typeof t.audit.entities] || log.entity}</span>
                        {log.entityId && (
                          <Badge variant="outline" size="sm" className="font-mono truncate max-w-32">
                            {log.entityId.slice(-8)}
                          </Badge>
                        )}
                        {log.reason && (
                          <Badge color="red" variant="filled" size="sm">
                            {t.audit.breakGlassBadge}
                          </Badge>
                        )}
                      </div>
                      <div className="col-span-2 hidden md:flex items-center">
                        <code className="text-[10px] font-mono text-muted-foreground truncate">
                          {log.hash.slice(0, 12)}…
                        </code>
                      </div>
                      <div className="col-span-2 md:col-span-1 text-right">
                        {log.ipAddress ? (
                          <code className="text-[10px] font-mono text-muted-foreground">{log.ipAddress}</code>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </div>
                    </motion.div>
                  )
                })
              )}
            </ScrollArea>
          </div>

          {/* Footer info */}
          <div className="glass-base rounded-xl p-3 text-[11px] text-muted-foreground leading-relaxed">
            <ShieldAlert className="w-3.5 h-3.5 inline mr-1.5 text-warning" />
            {t.audit.tamperEvidentDesc}
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="consent" className="mt-4">
          <ConsentManager locale={locale} />
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
