'use client'

import { useApp } from '@/lib/store'
import { getDict, formatDateTime, type Locale } from '@/lib/i18n'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Plus, Sparkles, ShieldCheck, AlertCircle, Search,
  Loader2, Wand2,
} from 'lucide-react'
import { useState } from 'react'
import {
  Button, TextInput, Textarea, Badge, Modal, Select,
  Group, Stack, Grid,
} from '@mantine/core'
import { EmptyState } from '@/components/common/empty-state'
import { SkeletonCard } from '@/components/common/skeleton'
import { notifications } from '@mantine/notifications'

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
      <Group gap="sm" align="stretch">
        <TextInput
          leftSection={<Search className="w-4 h-4" />}
          placeholder={t.records.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          variant="filled"
          className="flex-1"
        />
        <Button onClick={() => setDialogOpen(true)} leftSection={<Plus className="w-4 h-4" />}>
          {t.records.new}
        </Button>
      </Group>

      {/* AI banner — non-diagnostic, human-in-the-loop */}
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-card ai-glow rounded-2xl p-4 flex items-start gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-glass-accent/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-glass-accent" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold">{t.ai.scribe}</p>
            <Badge variant="outline" size="sm" className="animate-pulse-glow">{t.ai.badge}</Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{t.ai.nonDiagnostic}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDialogOpen(true)}
          className="shrink-0"
          leftSection={<Wand2 className="w-3.5 h-3.5" />}
        >
          {t.records.generateDraft}
        </Button>
      </motion.div>

      {/* Consultation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : filtered.length === 0 ? (
          <div className="col-span-2">
            <EmptyState
              icon={FileText}
              title={t.records.noConsultations}
              description={t.records.noConsultationsDesc}
              action={{ label: t.records.new, onClick: () => setDialogOpen(true) }}
            />
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((c: any, i: number) => (
              <ConsultationCard
                key={c.id}
                consultation={c}
                locale={locale}
                index={i}
                onPatientClick={() => { setSelectedPatientId(c.patientId); setView('patients') }}
                onSigned={() => qc.invalidateQueries({ queryKey: ['consultations'] })}
              />
            ))}
          </AnimatePresence>
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

function ConsultationCard({ consultation: c, locale, index, onPatientClick, onSigned }: any) {
  const t = getDict(locale)
  const [signing, setSigning] = useState(false)

  const handleSign = async () => {
    setSigning(true)
    try {
      const res = await fetch(`/api/consultations/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sign', signedBy: c.practitioner?.name || 'Dr. Current' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      notifications.show({ message: t.records.signedToast, color: 'green' })
      onSigned()
    } catch (e) {
      notifications.show({ message: (e as Error).message, color: 'red' })
    } finally {
      setSigning(false)
    }
  }

  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 20 }}
      className="glass-card rounded-2xl p-4"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <button onClick={onPatientClick} className="min-w-0 text-left">
          <p className="text-sm font-medium truncate hover:text-primary transition-colors">
            {c.patient?.firstName} {c.patient?.lastName}
          </p>
          <p className="text-[11px] text-muted-foreground">{c.practitioner?.name}</p>
        </button>
        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
          {formatDateTime(c.startAt, locale)}
        </span>
      </div>

      {c.chiefComplaint && (
        <p className="text-xs mb-2 font-medium">{c.chiefComplaint}</p>
      )}
      {c.assessment && (
        <p className="text-[11px] text-muted-foreground line-clamp-3 mb-2 leading-relaxed">{c.assessment}</p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {c.diagnosisCodes && JSON.parse(c.diagnosisCodes).map((dx: any) => (
          <Badge key={dx.code} variant="light" size="sm" className="font-mono">{dx.code}</Badge>
        ))}
        {c.procedureCodes && JSON.parse(c.procedureCodes).map((pc: any) => (
          <Badge key={pc.code} variant="outline" size="sm" className="font-mono">{pc.code}</Badge>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/30">
        <div className="flex items-center gap-2">
          {c.signedAt ? (
            <span className="status-pill text-success text-[10px]">
              <ShieldCheck className="w-3 h-3" /> {t.records.signed}
            </span>
          ) : (
            <span className="status-pill text-warning text-[10px]">{t.records.unsigned}</span>
          )}
          {c.aiDrafted && (
            <span className="status-pill text-glass-accent text-[10px]">
              <Sparkles className="w-3 h-3" /> {Math.round(c.aiConfidence * 100)}%
            </span>
          )}
        </div>
        {!c.signedAt && (
          <Button
            size="xs"
            variant="outline"
            onClick={handleSign}
            disabled={signing}
            loading={signing}
            leftSection={signing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
          >
            {t.records.signConsultation}
          </Button>
        )}
      </div>
    </motion.div>
  )
}

function ConsultationForm({ open, onOpenChange, locale, patients, practitioners, onSuccess }: any) {
  const t = getDict(locale)
  const [submitting, setSubmitting] = useState(false)
  const [generating, setGenerating] = useState(false)
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
    aiConfidence: 0,
  })

  const handleGenerate = async () => {
    if (!form.chiefComplaint.trim()) {
      notifications.show({ message: t.records.chiefRequiredToast, color: 'red' })
      return
    }
    setGenerating(true)
    try {
      const patient = patients.find((p: any) => p.id === form.patientId)
      const res = await fetch('/api/ai/scribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chiefComplaint: form.chiefComplaint,
          patientContext: {
            age: patient?.birthDate ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear() : undefined,
            sex: patient?.sex,
            allergies: [],
          },
          locale,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'AI generation failed')
      }
      const draft = await res.json()
      setForm({
        ...form,
        history: draft.history || form.history,
        examination: draft.examination || form.examination,
        assessment: draft.assessment || form.assessment,
        plan: draft.plan || form.plan,
        selectedDx: draft.differentialDiagnoses || [],
        aiDrafted: true,
        aiConfidence: draft.confidence || 0.7,
      })
      notifications.show({ message: t.records.aiDraftGeneratedToast.replace('{percent}', String(Math.round((draft.confidence || 0.7) * 100))), color: 'green' })
      notifications.show({ message: t.records.aiDraftValidationToast, color: 'yellow', autoClose: 5000 })
    } catch (e) {
      notifications.show({ message: (e as Error).message, color: 'red' })
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = async () => {
    if (!form.patientId || !form.practitionerId) {
      notifications.show({ message: t.common.patientPractitionerRequired, color: 'red' })
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
          aiConfidence: form.aiDrafted ? form.aiConfidence : 0,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      notifications.show({ message: t.records.consultationSavedToast, color: 'green' })
      onSuccess()
      onOpenChange(false)
      setForm({
        patientId: '', practitionerId: '', chiefComplaint: '', history: '',
        examination: '', assessment: '', plan: '', selectedDx: [], selectedCcam: [],
        aiDrafted: false, aiConfidence: 0,
      })
    } catch (e) {
      notifications.show({ message: (e as Error).message, color: 'red' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      size="xl"
      title={
        <Group gap="sm">
          <FileText className="w-5 h-5 text-primary" />
          <span>{t.records.new}</span>
        </Group>
      }
    >
      <Stack gap="sm">
        <p className="text-xs text-muted-foreground">{t.records.subtitle}</p>

        <Grid gap="sm">
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Select
              label={`${t.appointments.patient} *`}
              placeholder="—"
              variant="filled"
              value={form.patientId}
              onChange={(v) => setForm({ ...form, patientId: v || '' })}
              data={patients.map((p: any) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` }))}
              searchable
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Select
              label={`${t.appointments.practitioner} *`}
              placeholder="—"
              variant="filled"
              value={form.practitionerId}
              onChange={(v) => setForm({ ...form, practitionerId: v || '' })}
              data={practitioners.map((p: any) => ({ value: p.id, label: p.name }))}
              searchable
            />
          </Grid.Col>

          <Grid.Col span={12}>
            <Group justify="space-between" align="flex-end">
              <TextInput
                label={t.records.chief}
                variant="filled"
                value={form.chiefComplaint}
                onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
                placeholder={t.records.chiefPlaceholder}
                className="flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerate}
                disabled={generating || !form.chiefComplaint.trim()}
                loading={generating}
                leftSection={generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                className="ai-glow border-glass-accent/30 text-glass-accent hover:bg-glass-accent/10 ml-2"
              >
                {t.ai.scribe}
              </Button>
            </Group>
          </Grid.Col>

          {form.aiDrafted && (
            <Grid.Col span={12}>
              <div className="p-2 rounded-lg bg-glass-accent/10 border border-glass-accent/30 flex items-center gap-2 text-[11px] text-glass-accent">
                <Sparkles className="w-3.5 h-3.5 animate-pulse-glow" />
                <span>{t.records.aiDraftConfidence}: {Math.round(form.aiConfidence * 100)}%</span>
                <span className="text-muted-foreground">·</span>
                <span>{t.records.editBeforeSign}</span>
              </div>
            </Grid.Col>
          )}

          <Grid.Col span={12}>
            <Textarea
              label={t.records.history}
              variant="filled"
              autosize
              minRows={2}
              value={form.history}
              onChange={(e) => setForm({ ...form, history: e.target.value })}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Textarea
              label={t.records.examination}
              variant="filled"
              autosize
              minRows={2}
              value={form.examination}
              onChange={(e) => setForm({ ...form, examination: e.target.value })}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Textarea
              label={t.records.assessment}
              variant="filled"
              autosize
              minRows={2}
              value={form.assessment}
              onChange={(e) => setForm({ ...form, assessment: e.target.value })}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Textarea
              label={t.records.plan}
              variant="filled"
              autosize
              minRows={2}
              value={form.plan}
              onChange={(e) => setForm({ ...form, plan: e.target.value })}
            />
          </Grid.Col>

          <Grid.Col span={12}>
            <p className="text-xs font-medium text-muted-foreground">{t.records.diagnosisCodes}</p>
            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg glass-base max-h-32 overflow-y-auto scroll-area-glass mt-1">
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
          </Grid.Col>

          <Grid.Col span={12}>
            <p className="text-xs font-medium text-muted-foreground">{t.records.procedureCodes}</p>
            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg glass-base max-h-32 overflow-y-auto scroll-area-glass mt-1">
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
          </Grid.Col>
        </Grid>

        <Group justify="space-between" mt="sm">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {t.records.signReason}
          </p>
          <Group gap="sm">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleSubmit} loading={submitting} leftSection={submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}>
              {t.common.save}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  )
}
