'use client'

import { useApp } from '@/lib/store'
import { type Locale, formatDate } from '@/lib/i18n'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  KeyRound, Plus, Search, Copy, Check, Ban, Play, Clock,
  AlertTriangle, Loader2, X, Eye, RefreshCw,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SkeletonList } from '@/components/common/skeleton'
import { EmptyState } from '@/components/common/empty-state'
import { toast } from 'sonner'

const PLAN_CONFIG = {
  trial: { color: 'text-muted-foreground bg-muted', label: { fr: 'Essai', en: 'Trial' }, price: 0 },
  essential: { color: 'text-info bg-info/10', label: { fr: 'Essentiel', en: 'Essential' }, price: 49 },
  professional: { color: 'text-primary bg-primary/10', label: { fr: 'Professionnel', en: 'Professional' }, price: 99 },
  enterprise: { color: 'text-glass-warm bg-glass-warm/10', label: { fr: 'Entreprise', en: 'Enterprise' }, price: 299 },
}

const STATUS_CONFIG = {
  active: { color: 'text-success bg-success/10', label: { fr: 'Active', en: 'Active' } },
  revoked: { color: 'text-destructive bg-destructive/10', label: { fr: 'Révoquée', en: 'Revoked' } },
  suspended: { color: 'text-warning bg-warning/10', label: { fr: 'Suspendue', en: 'Suspended' } },
  expired: { color: 'text-muted-foreground bg-muted', label: { fr: 'Expirée', en: 'Expired' } },
}

async function fetchLicenses(search: string, status: string, plan: string) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (status && status !== 'all') params.set('status', status)
  if (plan && plan !== 'all') params.set('plan', plan)
  const res = await fetch(`/api/admin/licenses?${params}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

export function AdminLicensesView({ locale }: { locale: Locale }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-licenses', search, statusFilter, planFilter],
    queryFn: () => fetchLicenses(search, statusFilter, planFilter),
    refetchInterval: 30_000,
  })

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'fr' ? 'Client, email, clé...' : 'Customer, email, key...'}
            className="pl-10 glass-base border-0 h-11"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-40 glass-base border-0 h-11"><SelectValue /></SelectTrigger>
          <SelectContent className="glass-floating">
            <SelectItem value="all">{locale === 'fr' ? 'Tous statuts' : 'All status'}</SelectItem>
            <SelectItem value="active">{STATUS_CONFIG.active.label[locale as 'fr' | 'en']}</SelectItem>
            <SelectItem value="suspended">{STATUS_CONFIG.suspended.label[locale as 'fr' | 'en']}</SelectItem>
            <SelectItem value="revoked">{STATUS_CONFIG.revoked.label[locale as 'fr' | 'en']}</SelectItem>
            <SelectItem value="expired">{STATUS_CONFIG.expired.label[locale as 'fr' | 'en']}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-full md:w-40 glass-base border-0 h-11"><SelectValue /></SelectTrigger>
          <SelectContent className="glass-floating">
            <SelectItem value="all">{locale === 'fr' ? 'Tous plans' : 'All plans'}</SelectItem>
            <SelectItem value="trial">{PLAN_CONFIG.trial.label[locale as 'fr' | 'en']}</SelectItem>
            <SelectItem value="essential">{PLAN_CONFIG.essential.label[locale as 'fr' | 'en']}</SelectItem>
            <SelectItem value="professional">{PLAN_CONFIG.professional.label[locale as 'fr' | 'en']}</SelectItem>
            <SelectItem value="enterprise">{PLAN_CONFIG.enterprise.label[locale as 'fr' | 'en']}</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setCreateOpen(true)} className="bg-primary text-primary-foreground h-11">
          <Plus className="w-4 h-4" /> {locale === 'fr' ? 'Émettre' : 'Issue'}
        </Button>
      </div>

      {/* Licenses table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
          <div className="col-span-3">{locale === 'fr' ? 'Clé' : 'Key'}</div>
          <div className="col-span-3">{locale === 'fr' ? 'Client' : 'Customer'}</div>
          <div className="col-span-2 hidden md:block">{locale === 'fr' ? 'Plan' : 'Plan'}</div>
          <div className="col-span-2 hidden md:block">{locale === 'fr' ? 'Instances' : 'Instances'}</div>
          <div className="col-span-2 hidden md:block">{locale === 'fr' ? 'Expiration' : 'Expires'}</div>
          <div className="col-span-3 md:col-span-1 text-right">{locale === 'fr' ? 'Statut' : 'Status'}</div>
          <div className="col-span-2 md:col-span-1 text-right">{locale === 'fr' ? 'Actions' : 'Actions'}</div>
        </div>
        <ScrollArea className="h-[55vh]">
          {isLoading ? (
            <SkeletonList rows={6} />
          ) : (data?.items || []).length === 0 ? (
            <EmptyState icon={KeyRound} title={locale === 'fr' ? 'Aucune licence' : 'No licenses'} description={locale === 'fr' ? 'Émettez votre première licence.' : 'Issue your first license.'} />
          ) : (
            <AnimatePresence>
              {(data?.items || []).map((lic: any, i: number) => {
                const planCfg = PLAN_CONFIG[lic.plan as keyof typeof PLAN_CONFIG] || PLAN_CONFIG.trial
                const statusCfg = STATUS_CONFIG[lic.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active
                return (
                  <motion.div
                    key={lic.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 15 }}
                    className="grid grid-cols-12 gap-3 px-4 py-3 hover:bg-accent/30 transition-colors border-b border-border/20"
                  >
                    <div className="col-span-3 flex items-center gap-2 min-w-0">
                      <KeyRound className="w-3.5 h-3.5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-medium truncate">{lic.licenseKey.slice(0, 20)}...</p>
                        <button
                          onClick={() => { navigator.clipboard.writeText(lic.licenseKey); toast.success(locale === 'fr' ? 'Clé copiée' : 'Key copied') }}
                          className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5"
                        >
                          <Copy className="w-2.5 h-2.5" /> {locale === 'fr' ? 'Copier' : 'Copy'}
                        </button>
                      </div>
                    </div>
                    <div className="col-span-3 min-w-0">
                      <p className="text-xs font-medium truncate">{lic.customerName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{lic.customerEmail}</p>
                    </div>
                    <div className="col-span-2 hidden md:flex items-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${planCfg.color}`}>
                        {planCfg.label[locale as 'fr' | 'en']}
                      </span>
                    </div>
                    <div className="col-span-2 hidden md:flex items-center text-xs">
                      <span className="font-mono">{lic._count?.instances || 0}</span>
                      <span className="text-muted-foreground ml-1">/ {lic.maxDevices}</span>
                    </div>
                    <div className="col-span-2 hidden md:flex items-center text-[11px] text-muted-foreground">
                      {formatDate(lic.expiresAt, locale)}
                    </div>
                    <div className="col-span-3 md:col-span-1 flex items-center justify-end">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.color}`}>
                        {statusCfg.label[locale as 'fr' | 'en']}
                      </span>
                    </div>
                    <div className="col-span-2 md:col-span-1 flex items-center justify-end gap-1">
                      <button
                        onClick={() => setDetailId(lic.id)}
                        className="p-1 rounded hover:bg-accent/50 text-muted-foreground hover:text-primary transition-colors"
                        title={locale === 'fr' ? 'Détails' : 'Details'}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </ScrollArea>
      </div>

      <CreateLicenseDialog open={createOpen} onOpenChange={setCreateOpen} locale={locale} onSuccess={() => qc.invalidateQueries({ queryKey: ['admin-licenses'] })} />
      {detailId && <LicenseDetailDialog id={detailId} onClose={() => setDetailId(null)} locale={locale} onChanged={() => qc.invalidateQueries({ queryKey: ['admin-licenses'] })} />}
    </div>
  )
}

function CreateLicenseDialog({ open, onOpenChange, locale, onSuccess }: any) {
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerOrg: '',
    customerCountry: 'FR',
    plan: 'professional',
    durationDays: 365,
    maxDevices: 3,
    maxPractitioners: 15,
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!form.customerName || !form.customerEmail) {
      toast.error(locale === 'fr' ? 'Nom et email requis' : 'Name and email required')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          modules: ['scheduling', 'ehr', 'billing', 'prescriptions', 'labs', 'documents', 'telemedicine', 'audit', 'inventory', 'triage', 'sustainability', 'ai_scribe'],
          // adminEmail derived from session on server

        }),
      })
      if (!res.ok) throw new Error('Failed')
      const license = await res.json()
      setCreatedKey(license.licenseKey)
      toast.success(locale === 'fr' ? 'Licence émise' : 'License issued')
      onSuccess()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setCreatedKey(null); onOpenChange(o) }}>
      <DialogContent className="glass-floating max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            {locale === 'fr' ? 'Émettre une licence' : 'Issue a license'}
          </DialogTitle>
          <DialogDescription>{locale === 'fr' ? 'Crée une nouvelle licence de bureau' : 'Creates a new desktop license'}</DialogDescription>
        </DialogHeader>

        {createdKey ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-lg bg-success/10 border border-success/30 text-center">
              <Check className="w-8 h-8 text-success mx-auto mb-2" />
              <p className="text-sm font-medium mb-2">{locale === 'fr' ? 'Licence émise!' : 'License issued!'}</p>
              <p className="text-xs text-muted-foreground mb-3">{locale === 'fr' ? 'Communiquez cette clé au client:' : 'Communicate this key to the customer:'}</p>
              <div className="p-3 rounded-lg glass-base font-mono text-sm break-all">{createdKey}</div>
              <Button
                onClick={() => { navigator.clipboard.writeText(createdKey); toast.success(locale === 'fr' ? 'Copié' : 'Copied') }}
                className="mt-3"
                size="sm"
              >
                <Copy className="w-3.5 h-3.5" /> {locale === 'fr' ? 'Copier la clé' : 'Copy key'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5 col-span-2">
              <Label>{locale === 'fr' ? 'Nom du client' : 'Customer name'} *</Label>
              <Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="glass-base border-0" placeholder="Cabinet Médical..." />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} className="glass-base border-0" placeholder="contact@cabinet.fr" />
            </div>
            <div className="space-y-1.5">
              <Label>{locale === 'fr' ? 'Organisation' : 'Organization'}</Label>
              <Input value={form.customerOrg} onChange={(e) => setForm({ ...form, customerOrg: e.target.value })} className="glass-base border-0" />
            </div>
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={form.plan} onValueChange={(v) => {
                const config = PLAN_CONFIG[v as keyof typeof PLAN_CONFIG]
                setForm({
                  ...form,
                  plan: v,
                  maxDevices: v === 'trial' ? 1 : v === 'essential' ? 1 : v === 'professional' ? 3 : 10,
                  maxPractitioners: v === 'trial' ? 3 : v === 'essential' ? 5 : v === 'professional' ? 15 : 100,
                })
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="glass-floating">
                  {Object.entries(PLAN_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label[locale as 'fr' | 'en']} ({v.price}€/mois)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{locale === 'fr' ? 'Durée (jours)' : 'Duration (days)'}</Label>
              <Input type="number" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: parseInt(e.target.value) })} className="glass-base border-0" />
            </div>
            <div className="space-y-1.5">
              <Label>{locale === 'fr' ? 'Postes max' : 'Max devices'}</Label>
              <Input type="number" value={form.maxDevices} onChange={(e) => setForm({ ...form, maxDevices: parseInt(e.target.value) })} className="glass-base border-0" />
            </div>
            <div className="space-y-1.5">
              <Label>{locale === 'fr' ? 'Praticiens max' : 'Max practitioners'}</Label>
              <Input type="number" value={form.maxPractitioners} onChange={(e) => setForm({ ...form, maxPractitioners: parseInt(e.target.value) })} className="glass-base border-0" />
            </div>
          </div>
        )}

        <DialogFooter>
          {!createdKey && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>{locale === 'fr' ? 'Annuler' : 'Cancel'}</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {locale === 'fr' ? 'Émettre' : 'Issue'}
              </Button>
            </>
          )}
          {createdKey && <Button onClick={() => { onOpenChange(false); setCreatedKey(null) }}>{locale === 'fr' ? 'Fermer' : 'Close'}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LicenseDetailDialog({ id, onClose, locale, onChanged }: any) {
  const qc = useQueryClient()
  const [acting, setActing] = useState<string | null>(null)

  const { data: license, isLoading } = useQuery({
    queryKey: ['admin-license', id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/licenses/${id}`, { cache: 'no-store' })
      return res.json()
    },
  })

  const [togglingFlag, setTogglingFlag] = useState<string | null>(null)

  const toggleFeatureFlag = async (flagId: string, enabled: boolean) => {
    setTogglingFlag(flagId)
    try {
      const res = await fetch(`/api/admin/feature-flags/${flagId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(locale === 'fr' ? `Module ${enabled ? 'activé' : 'désactivé'}` : `Module ${enabled ? 'enabled' : 'disabled'}`)
      qc.invalidateQueries({ queryKey: ['admin-license', id] })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setTogglingFlag(null)
    }
  }

  const doAction = async (action: string, extra?: any) => {
    setActing(action)
    try {
      const res = await fetch(`/api/admin/licenses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(locale === 'fr' ? `Action: ${action}` : `Action: ${action}`)
      onChanged()
      qc.invalidateQueries({ queryKey: ['admin-license', id] })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setActing(null)
    }
  }

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-floating max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            {license?.customerName || '...'}
          </DialogTitle>
          <DialogDescription className="font-mono">{license?.licenseKey}</DialogDescription>
        </DialogHeader>

        {isLoading || !license ? (
          <div className="py-8 text-center text-sm text-muted-foreground">{locale === 'fr' ? 'Chargement…' : 'Loading...'}</div>
        ) : (
          <div className="space-y-4">
            {/* Status + plan */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium ${STATUS_CONFIG[license.status as keyof typeof STATUS_CONFIG]?.color}`}>
                {STATUS_CONFIG[license.status as keyof typeof STATUS_CONFIG]?.label[locale as 'fr' | 'en']}
              </span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium ${PLAN_CONFIG[license.plan as keyof typeof PLAN_CONFIG]?.color}`}>
                {PLAN_CONFIG[license.plan as keyof typeof PLAN_CONFIG]?.label[locale as 'fr' | 'en']} · {PLAN_CONFIG[license.plan as keyof typeof PLAN_CONFIG]?.price}€/mois
              </span>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg glass-base">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Email</p>
                <p className="truncate">{license.customerEmail}</p>
              </div>
              <div className="p-3 rounded-lg glass-base">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">{locale === 'fr' ? 'Pays' : 'Country'}</p>
                <p>{license.customerCountry}</p>
              </div>
              <div className="p-3 rounded-lg glass-base">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">{locale === 'fr' ? 'Postes max' : 'Max devices'}</p>
                <p className="font-mono">{license.maxDevices}</p>
              </div>
              <div className="p-3 rounded-lg glass-base">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">{locale === 'fr' ? 'Praticiens max' : 'Max practitioners'}</p>
                <p className="font-mono">{license.maxPractitioners}</p>
              </div>
              <div className="p-3 rounded-lg glass-base">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">{locale === 'fr' ? 'Émise le' : 'Issued'}</p>
                <p>{formatDate(license.issuedAt, locale)}</p>
              </div>
              <div className="p-3 rounded-lg glass-base">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">{locale === 'fr' ? 'Expire le' : 'Expires'}</p>
                <p>{formatDate(license.expiresAt, locale)}</p>
              </div>
            </div>

            {/* Instances */}
            {license.instances?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-2">{locale === 'fr' ? 'Instances' : 'Instances'} ({license.instances.length})</p>
                <div className="space-y-1.5">
                  {license.instances.map((inst: any) => (
                    <div key={inst.id} className="flex items-center gap-2 p-2 rounded-lg glass-base text-xs">
                      <div className={`w-2 h-2 rounded-full ${inst.status === 'active' ? 'bg-success' : inst.status === 'blocked' ? 'bg-destructive' : 'bg-muted-foreground'}`} />
                      <span className="flex-1 truncate">{inst.hostname || 'Unknown'}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{inst.appVersion}</span>
                      <span className="text-[10px] text-muted-foreground">{formatDate(inst.lastSeenAt, locale)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feature flags — toggleable */}
            {license.featureFlags?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-2">
                  {locale === 'fr' ? 'Modules (cliquer pour activer/désactiver)' : 'Modules (click to toggle)'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {license.featureFlags.map((f: any) => (
                    <button
                      key={f.id}
                      onClick={() => toggleFeatureFlag(f.id, !f.enabled)}
                      disabled={togglingFlag === f.id}
                      className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
                        f.enabled
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {togglingFlag === f.id ? '...' : f.flagKey}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
              {license.status === 'active' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => doAction('extend', { days: 30 })} disabled={acting === 'extend'}>
                    {acting === 'extend' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                    {locale === 'fr' ? 'Prolonger +30j' : 'Extend +30d'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => doAction('suspend')} disabled={acting === 'suspend'}>
                    <Ban className="w-3.5 h-3.5" /> {locale === 'fr' ? 'Suspendre' : 'Suspend'}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => doAction('revoke', { reason: 'Revoked by admin' })} disabled={acting === 'revoke'}>
                    <AlertTriangle className="w-3.5 h-3.5" /> {locale === 'fr' ? 'Révoquer' : 'Revoke'}
                  </Button>
                </>
              )}
              {(license.status === 'suspended' || license.status === 'revoked' || license.status === 'expired') && (
                <Button size="sm" onClick={() => doAction('reactivate')} disabled={acting === 'reactivate'}>
                  {acting === 'reactivate' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  {locale === 'fr' ? 'Réactiver' : 'Reactivate'}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
