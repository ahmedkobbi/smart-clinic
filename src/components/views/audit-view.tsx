'use client'

import { useApp } from '@/lib/store'
import { getDict, formatDateTime, type Locale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ShieldCheck, ShieldAlert, Link2, Search, Fingerprint,
  Eye, FilePlus, FileEdit, FileX, Download, LogIn, AlertTriangle,
  CheckCircle2, XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'

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
        toast.success(locale === 'fr' ? `Chaîne valide — ${result.checked} entrées vérifiées` : `Chain valid — ${result.checked} entries checked`)
      } else {
        toast.error(locale === 'fr' ? `Chaîne corrompue à l'entrée ${result.checked}` : `Chain broken at entry ${result.checked}`)
      }
    } catch (e) {
      toast.error((e as Error).message)
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
                <Badge variant="outline" className="text-[10px] font-mono">
                  SHA-256
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {verifyResult === null
                  ? (locale === 'fr' ? 'Chaîne infalsifiable — cliquez pour vérifier' : 'Tamper-evident chain — click to verify')
                  : verifyResult.valid
                    ? `${t.audit.chainValid} · ${verifyResult.checked} ${t.audit.entries}`
                    : `${t.audit.chainInvalid} · ${locale === 'fr' ? 'à l\'entrée' : 'at entry'} ${verifyResult.checked}`}
              </p>
            </div>
          </div>
          <Button onClick={handleVerify} disabled={verifying} className="bg-primary text-primary-foreground">
            <ShieldCheck className="w-4 h-4" /> {verifying ? t.common.loading : t.audit.verifyChain}
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
              {locale === 'fr'
                ? 'Chaque entrée contient le hash de la précédente — toute modification trahit la rupture de la chaîne.'
                : 'Each entry contains the hash of the previous one — any modification betrays the chain break.'}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'fr' ? 'Rechercher utilisateur, action, hash…' : 'Search user, action, hash…'}
            className="pl-10 glass-base border-0"
          />
        </div>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-full md:w-44 glass-base border-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass-floating">
            <SelectItem value="all">{locale === 'fr' ? 'Toutes actions' : 'All actions'}</SelectItem>
            {Object.entries(t.audit.actions).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger className="w-full md:w-44 glass-base border-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass-floating">
            <SelectItem value="all">{locale === 'fr' ? 'Toutes entités' : 'All entities'}</SelectItem>
            {Object.entries(t.audit.entities).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Audit log entries */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
          <div className="col-span-3 md:col-span-2">{t.common.time}</div>
          <div className="col-span-2 hidden md:block">{t.common.by}</div>
          <div className="col-span-3 md:col-span-2">{t.common.actions}</div>
          <div className="col-span-4 md:col-span-3">{t.audit.entities[entity === 'all' ? 'patient' : (entity as keyof typeof t.audit.entities)] || t.common.type}</div>
          <div className="col-span-2 hidden md:block">Hash</div>
          <div className="col-span-2 md:col-span-1 text-right">IP</div>
        </div>
        <ScrollArea className="h-[55vh]">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{t.common.loading}</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
              {t.common.noResults}
            </div>
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
                      <Badge variant="outline" className="text-[9px] font-mono truncate max-w-32">
                        {log.entityId.slice(-8)}
                      </Badge>
                    )}
                    {log.reason && (
                      <Badge variant="destructive" className="text-[9px]">
                        {locale === 'fr' ? 'Urgence' : 'Break-glass'}
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
        {locale === 'fr'
          ? 'Le journal d\'audit est infalsifiable: chaque entrée est liée à la précédente par un hash SHA-256. Toute modification d\'une entrée trahit la rupture de la chaîne lors de la vérification.'
          : 'The audit log is tamper-evident: each entry is linked to the previous one via SHA-256 hash. Any modification of an entry betrays the chain break upon verification.'}
      </div>
    </div>
  )
}
