'use client'

import { getDict, formatDate, type Locale } from '@/lib/i18n'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ShieldCheck, ShieldAlert, Plus, Loader2, Check, X, Clock,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StatusPill } from '@/components/common/status-pill'
import { EmptyState } from '@/components/common/empty-state'
import { SkeletonList } from '@/components/common/skeleton'
import { toast } from 'sonner'

async function fetchConsents() {
  const res = await fetch('/api/consents', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

async function fetchPatients() {
  const res = await fetch('/api/patients?limit=100', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

export function ConsentManager({ locale }: { locale: Locale }) {
  const t = getDict(locale)
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['consents'],
    queryFn: fetchConsents,
    refetchInterval: 30_000,
  })
  const { data: patientsData } = useQuery({ queryKey: ['patients-list'], queryFn: fetchPatients })

  // Group consents by patient
  const byPatient = (data?.items || []).reduce((acc: Map<string, any[]>, c: any) => {
    const key = c.patientId
    if (!acc.has(key)) acc.set(key, [])
    acc.get(key)!.push(c)
    return acc
  }, new Map<string, any[]>())

  // Stats
  const stats = (data?.items || []).reduce((acc: any, c: any) => {
    acc.total++
    if (c.status === 'granted') acc.granted++
    else if (c.status === 'withdrawn') acc.withdrawn++
    else if (c.status === 'pending') acc.pending++
    return acc
  }, { total: 0, granted: 0, withdrawn: 0, pending: 0 })

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label={locale === 'fr' ? 'Total consentements' : 'Total consents'} value={stats.total} icon={ShieldCheck} color="primary" />
        <StatBox label={locale === 'fr' ? 'Accordés' : 'Granted'} value={stats.granted} icon={Check} color="success" />
        <StatBox label={locale === 'fr' ? 'En attente' : 'Pending'} value={stats.pending} icon={Clock} color="warning" />
        <StatBox label={locale === 'fr' ? 'Retirés' : 'Withdrawn'} value={stats.withdrawn} icon={X} color="danger" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{t.audit.consent}</h3>
          <p className="text-xs text-muted-foreground">{locale === 'fr' ? 'Gestion des consentements RGPD par patient' : 'GDPR consent management per patient'}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="bg-primary text-primary-foreground">
          <Plus className="w-3.5 h-3.5" /> {locale === 'fr' ? 'Nouveau' : 'New'}
        </Button>
      </div>

      {/* Consent list grouped by patient */}
      {isLoading ? (
        <SkeletonList rows={5} />
      ) : (data?.items || []).length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={locale === 'fr' ? 'Aucun consentement' : 'No consents'}
          description={locale === 'fr' ? 'Aucun consentement enregistré. Créez le premier.' : 'No consent recorded. Create the first one.'}
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {Array.from(byPatient.entries()).map(([patientId, consents], i) => (
              <motion.div
                key={patientId}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 30 }}
                className="glass-card rounded-2xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {consents[0]?.patient?.firstName} {consents[0]?.patient?.lastName}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {consents.length} {locale === 'fr' ? 'consentements' : 'consents'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {consents.map((c: any) => (
                    <ConsentRow key={c.id} consent={c} locale={locale} t={t} onChanged={() => qc.invalidateQueries({ queryKey: ['consents'] })} />
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <ConsentForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        locale={locale}
        patients={patientsData?.items || []}
        t={t}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['consents'] })}
      />
    </div>
  )
}

function ConsentRow({ consent: c, locale, t, onChanged }: any) {
  const [updating, setUpdating] = useState(false)

  const handleAction = async (newStatus: 'granted' | 'withdrawn') => {
    setUpdating(true)
    try {
      const res = await fetch('/api/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: c.patientId,
          type: c.type,
          status: newStatus,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(locale === 'fr' ? `Consentement ${newStatus === 'granted' ? 'accordé' : 'retiré'}` : `Consent ${newStatus}`)
      onChanged()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="p-2.5 rounded-lg glass-base flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{t.audit.consentTypes[c.type as keyof typeof t.audit.consentTypes]}</p>
        <p className="text-[10px] text-muted-foreground">
          {c.grantedAt ? `${locale === 'fr' ? 'Accordé le' : 'Granted'} ${formatDate(c.grantedAt, locale)}` : locale === 'fr' ? 'En attente' : 'Pending'}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <StatusPill
          status={c.status}
          variant={c.status === 'granted' ? 'success' : c.status === 'withdrawn' ? 'danger' : 'warning'}
        />
        {c.status !== 'granted' && (
          <button
            onClick={() => handleAction('granted')}
            disabled={updating}
            className="p-1 rounded hover:bg-success/20 text-success transition-colors"
            title={locale === 'fr' ? 'Accorder' : 'Grant'}
          >
            {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          </button>
        )}
        {c.status !== 'withdrawn' && (
          <button
            onClick={() => handleAction('withdrawn')}
            disabled={updating}
            className="p-1 rounded hover:bg-destructive/20 text-destructive transition-colors"
            title={locale === 'fr' ? 'Retirer' : 'Withdraw'}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

function ConsentForm({ open, onOpenChange, locale, patients, t, onSuccess }: any) {
  const [patientId, setPatientId] = useState('')
  const [type, setType] = useState('treatment')
  const [status, setStatus] = useState('granted')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!patientId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, type, status, notes }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(locale === 'fr' ? 'Consentement enregistré' : 'Consent saved')
      onSuccess()
      onOpenChange(false)
      setPatientId('')
      setType('treatment')
      setStatus('granted')
      setNotes('')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-floating max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            {locale === 'fr' ? 'Nouveau consentement' : 'New consent'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>{locale === 'fr' ? 'Patient' : 'Patient'}</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent className="glass-floating max-h-72">
                {patients.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{locale === 'fr' ? 'Type de consentement' : 'Consent type'}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="glass-floating">
                {Object.entries(t.audit.consentTypes).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{locale === 'fr' ? 'Statut' : 'Status'}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="glass-floating">
                <SelectItem value="granted">{locale === 'fr' ? 'Accordé' : 'Granted'}</SelectItem>
                <SelectItem value="pending">{locale === 'fr' ? 'En attente' : 'Pending'}</SelectItem>
                <SelectItem value="withdrawn">{locale === 'fr' ? 'Retiré' : 'Withdrawn'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{locale === 'fr' ? 'Notes' : 'Notes'}</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button onClick={submit} disabled={submitting || !patientId}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StatBox({ label, value, icon: Icon, color }: any) {
  const colorClass = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    danger: 'text-destructive bg-destructive/10',
  }[color]
  return (
    <div className="glass-card rounded-xl p-3 flex items-center gap-2">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase font-semibold text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  )
}
