'use client'

import { useApp } from '@/lib/store'
import { getDict, formatDate, formatDateTime, type Locale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Plus, Sparkles, ShieldCheck, AlertCircle, Pill, Search,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

async function fetchConsultations() {
  const res = await fetch('/api/consultations?limit=100', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

async function fetchPatients() {
  const res = await fetch('/api/patients?limit=100', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

async function fetchStaff() {
  const res = await fetch('/api/settings?section=staff', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

const CCAM_CODES = [
  { code: 'DQPM003', label: 'Consultation médecin généraliste', price: 25 },
  { code: 'CSCNAA01', label: 'Consultation cardiologie', price: 50 },
  { code: 'JQHP018', label: 'Électrocardiogramme (ECG)', price: 18 },
  { code: 'DDFA001', label: 'Examen dermatologique', price: 46 },
  { code: 'YHFA003', label: 'Séance kinésithérapie', price: 19 },
  { code: 'MQFA008', label: 'Consultation gynécologique', price: 46 },
  { code: 'NQFA002', label: 'Consultation pédiatrique', price: 30 },
  { code: 'DQPX004', label: 'Consultation psychiatrique 30 min', price: 39 },
]

const ICD10_CODES = [
  { code: 'J00', label: 'Rhinite aiguë' },
  { code: 'J06.9', label: 'Infection respiratoire supérieure' },
  { code: 'J20.9', label: 'Bronchite aiguë' },
  { code: 'M54.5', label: 'Lombalgie' },
  { code: 'I10', label: 'Hypertension essentielle' },
  { code: 'E11.9', label: 'Diabète type 2' },
  { code: 'N39.0', label: 'Infection urinaire' },
  { code: 'F41.1', label: 'Trouble anxieux généralisé' },
  { code: 'F32.9', label: 'Épisode dépressif' },
  { code: 'Z00.0', label: 'Examen médical de routine' },
]

export function RecordsView({ locale }: { locale: Locale }) {
  const t = getDict(locale)
  const { setSelectedPatientId, setView } = useApp()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['consultations'],
    queryFn: fetchConsultations,
    refetchInterval: 30_000,
  })

  const { data: patientsData } = useQuery({ queryKey: ['patients-list'], queryFn: fetchPatients })
  const { data: staffData } = useQuery({ queryKey: ['staff'], queryFn: fetchStaff })

  const filtered = (data?.items || []).filter((c: any) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      c.patient?.firstName?.toLowerCase().includes(s) ||
      c.patient?.lastName?.toLowerCase().includes(s) ||
      c.chiefComplaint?.toLowerCase().includes(s) ||
      c.assessment?.toLowerCase().includes(s)
    )
  })

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'fr' ? 'Rechercher une consultation…' : 'Search consultation…'}
            className="pl-10 glass-base border-0"
          />
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4" /> {t.records.new}
        </Button>
      </div>

      {/* AI banner */}
      <div className="glass-base rounded-xl p-3 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-glass-accent mt-0.5 shrink-0" />
        <div className="text-xs">
          <p className="font-medium">{t.ai.scribe}</p>
          <p className="text-muted-foreground mt-0.5">{t.ai.nonDiagnostic}</p>
        </div>
      </div>

      {/* Consultation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {isLoading ? (
          <div className="col-span-2 p-8 text-center text-sm text-muted-foreground">{t.common.loading}</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-2 p-8 text-center text-sm text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            {t.common.noResults}
          </div>
        ) : (
          filtered.map((c: any, i: number) => (
            <motion.button
              key={c.id}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 20 }}
              onClick={() => { setSelectedPatientId(c.patientId); setView('patients') }}
              className="glass-card rounded-2xl p-4 text-left"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {c.patient?.firstName} {c.patient?.lastName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{c.practitioner?.name}</p>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                  {formatDateTime(c.startAt, locale)}
                </span>
              </div>

              {c.chiefComplaint && (
                <p className="text-xs mb-2 font-medium">{c.chiefComplaint}</p>
              )}
              {c.assessment && (
                <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{c.assessment}</p>
              )}

              <div className="flex items-center gap-1.5 flex-wrap">
                {c.diagnosisCodes && (
                  JSON.parse(c.diagnosisCodes).map((dx: any) => (
                    <Badge key={dx.code} variant="secondary" className="text-[10px] font-mono">
                      {dx.code}
                    </Badge>
                  ))
                )}
                {c.procedureCodes && (
                  JSON.parse(c.procedureCodes).map((pc: any) => (
                    <Badge key={pc.code} variant="outline" className="text-[10px] font-mono">
                      {pc.code}
                    </Badge>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                {c.signedAt ? (
                  <span className="status-pill text-success text-[10px]">
                    <ShieldCheck className="w-3 h-3" /> {t.records.signed}
                  </span>
                ) : (
                  <span className="status-pill text-warning text-[10px]">{t.records.unsigned}</span>
                )}
                {c.aiDrafted && (
                  <span className="status-pill text-glass-accent text-[10px]">
                    <Sparkles className="w-3 h-3" /> {t.ai.badge} {Math.round(c.aiConfidence * 100)}%
                  </span>
                )}
              </div>
            </motion.button>
          ))
        )}
      </div>

      <ConsultationForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        locale={locale}
        patients={patientsData?.items || []}
        practitioners={staffData?.practitioners || []}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['consultations'] })}
      />
    </div>
  )
}

function ConsultationForm({ open, onOpenChange, locale, patients, practitioners, onSuccess }: any) {
  const t = getDict(locale)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    patientId: '',
    practitionerId: '',
    chiefComplaint: '',
    history: '',
    examination: '',
    assessment: '',
    plan: '',
    selectedDx: [] as string[],
    selectedCcam: [] as string[],
    aiDrafted: false,
  })

  const handleSubmit = async () => {
    if (!form.patientId || !form.practitionerId) {
      toast.error(locale === 'fr' ? 'Patient et praticien requis' : 'Patient and practitioner required')
      return
    }
    setSubmitting(true)
    try {
      const dx = form.selectedDx.map(code => ICD10_CODES.find(d => d.code === code)).filter(Boolean)
      const ccam = form.selectedCcam.map(code => CCAM_CODES.find(c => c.code === code)).filter(Boolean)
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          diagnosisCodes: dx,
          procedureCodes: ccam,
          aiConfidence: form.aiDrafted ? 0.82 : 0,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(locale === 'fr' ? 'Consultation enregistrée' : 'Consultation saved')
      onSuccess()
      onOpenChange(false)
      setForm({
        patientId: '', practitionerId: '', chiefComplaint: '', history: '',
        examination: '', assessment: '', plan: '', selectedDx: [], selectedCcam: [],
        aiDrafted: false,
      })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-floating max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {t.records.new}
          </DialogTitle>
          <DialogDescription>{t.records.subtitle}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5">
            <Label>{t.appointments.patient} *</Label>
            <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent className="glass-floating max-h-72">
                {patients.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t.appointments.practitioner} *</Label>
            <Select value={form.practitionerId} onValueChange={(v) => setForm({ ...form, practitionerId: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent className="glass-floating max-h-72">
                {practitioners.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 col-span-2">
            <Label>{t.records.chief}</Label>
            <Input value={form.chiefComplaint} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>{t.records.history}</Label>
            <Textarea rows={2} value={form.history} onChange={(e) => setForm({ ...form, history: e.target.value })} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>{t.records.examination}</Label>
            <Textarea rows={2} value={form.examination} onChange={(e) => setForm({ ...form, examination: e.target.value })} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>{t.records.assessment}</Label>
            <Textarea rows={2} value={form.assessment} onChange={(e) => setForm({ ...form, assessment: e.target.value })} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>{t.records.plan}</Label>
            <Textarea rows={2} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} />
          </div>

          <div className="space-y-1.5 col-span-2">
            <Label>{t.records.diagnosisCodes}</Label>
            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg glass-base max-h-32 overflow-y-auto">
              {ICD10_CODES.map(dx => {
                const sel = form.selectedDx.includes(dx.code)
                return (
                  <button
                    key={dx.code}
                    type="button"
                    onClick={() => setForm({
                      ...form,
                      selectedDx: sel ? form.selectedDx.filter(c => c !== dx.code) : [...form.selectedDx, dx.code],
                    })}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${sel ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
                  >
                    {dx.code} · {dx.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5 col-span-2">
            <Label>{t.records.procedureCodes}</Label>
            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg glass-base max-h-32 overflow-y-auto">
              {CCAM_CODES.map(pc => {
                const sel = form.selectedCcam.includes(pc.code)
                return (
                  <button
                    key={pc.code}
                    type="button"
                    onClick={() => setForm({
                      ...form,
                      selectedCcam: sel ? form.selectedCcam.filter(c => c !== pc.code) : [...form.selectedCcam, pc.code],
                    })}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${sel ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
                  >
                    {pc.code} · {pc.label} · {pc.price}€
                  </button>
                )
              })}
            </div>
          </div>

          <div className="col-span-2 flex items-center gap-2 p-2 rounded-lg glass-base">
            <input
              type="checkbox"
              id="aiDrafted"
              checked={form.aiDrafted}
              onChange={(e) => setForm({ ...form, aiDrafted: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="aiDrafted" className="text-xs flex items-center gap-1.5 cursor-pointer">
              <Sparkles className="w-3 h-3 text-glass-accent" />
              {t.records.aiDrafted}
            </Label>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {t.records.signReason}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t.common.save}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
