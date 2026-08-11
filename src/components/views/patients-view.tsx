'use client'

import { useApp } from '@/lib/store'
import { getDict, formatDate, formatDateTime, calculateAge, calculateBmi, type Locale } from '@/lib/i18n'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Search, Plus, Phone, Mail, MapPin, Droplet, Activity, Calendar,
  Pill, Receipt, FileText, AlertTriangle, ShieldCheck, ChevronRight, X,
  Heart, Weight, Ruler, Thermometer, Clock,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { StatusPill, invoiceStatusVariant } from '@/components/common/status-pill'
import { PatientForm } from './patient-form'

interface PatientList {
  items: any[]
  total: number
}

async function fetchPatients(search: string): Promise<PatientList> {
  const res = await fetch(`/api/patients?search=${encodeURIComponent(search)}&limit=100`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

async function fetchPatient(id: string) {
  const res = await fetch(`/api/patients/${id}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

export function PatientsView({ locale }: { locale: Locale }) {
  const t = getDict(locale)
  const { selectedPatientId, setSelectedPatientId, setNewPatientOpen, newPatientOpen } = useApp()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['patients', search],
    queryFn: () => fetchPatients(search),
    refetchInterval: 30_000,
  })

  const { data: selectedPatient, isLoading: loadingDetail } = useQuery({
    queryKey: ['patient', selectedPatientId],
    queryFn: () => selectedPatientId ? fetchPatient(selectedPatientId) : null,
    enabled: !!selectedPatientId,
  })

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24">
      {/* Search bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.patients.search}
            className="pl-10 glass-base border-0"
          />
        </div>
        <Button onClick={() => setNewPatientOpen(true)} className="bg-primary text-primary-foreground hover:opacity-90">
          <Plus className="w-4 h-4" /> {t.patients.new}
        </Button>
      </div>

      {/* Patient list */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
          <div className="col-span-5 md:col-span-4">{t.common.name}</div>
          <div className="col-span-3 hidden md:block">{t.patients.age}</div>
          <div className="col-span-3 hidden md:block">{t.patients.lastVisit}</div>
          <div className="col-span-4 md:col-span-3">{t.patients.tags}</div>
          <div className="col-span-3 hidden md:block">{t.common.status}</div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto scroll-area-glass">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{t.common.loading}</div>
          ) : (data?.items || []).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              {t.common.noResults}
            </div>
          ) : (
            <AnimatePresence>
              {(data?.items || []).map((p: any, i: number) => (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 15 }}
                  onClick={() => setSelectedPatientId(p.id)}
                  className="w-full grid grid-cols-12 gap-3 px-4 py-3 text-sm hover:bg-accent/50 transition-colors border-b border-border/20 text-left"
                >
                  <div className="col-span-5 md:col-span-4 flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${stringToColor(p.firstName + p.lastName)}40, ${stringToColor(p.firstName + p.lastName)}20)`,
                        color: stringToColor(p.firstName + p.lastName),
                      }}
                    >
                      {(p.firstName[0] + p.lastName[0]).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.firstName} {p.lastName}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{p.email || '—'}</p>
                    </div>
                  </div>
                  <div className="col-span-3 hidden md:flex items-center text-muted-foreground">
                    {p.birthDate ? `${calculateAge(p.birthDate)} ans` : '—'}
                  </div>
                  <div className="col-span-3 hidden md:flex items-center text-muted-foreground text-xs">
                    {p.consultations?.[0]?.startAt ? formatDate(p.consultations[0].startAt, locale) : '—'}
                  </div>
                  <div className="col-span-4 md:col-span-3 flex items-center gap-1 flex-wrap">
                    {p.tags ? (
                      JSON.parse(p.tags).map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                  <div className="col-span-3 hidden md:flex items-center">
                    {p.allergies?.length > 0 ? (
                      <span className="status-pill text-destructive">
                        {p.allergies.length} {t.patients.allergies.toLowerCase()}
                      </span>
                    ) : (
                      <span className="status-pill text-success">OK</span>
                    )}
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      <Sheet open={!!selectedPatientId} onOpenChange={(o) => !o && setSelectedPatientId(null)}>
        <SheetContent side="right" className="glass-base w-full sm:max-w-2xl p-0 overflow-y-auto">
          {loadingDetail || !selectedPatient ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{t.common.loading}</div>
          ) : (
            <PatientDetail patient={selectedPatient} locale={locale} />
          )}
        </SheetContent>
      </Sheet>

      {/* New patient form */}
      <PatientForm open={newPatientOpen} onOpenChange={(o) => useApp.getState().setNewPatientOpen(o)} locale={locale} />
    </div>
  )
}

function PatientDetail({ patient, locale }: { patient: any; locale: Locale }) {
  const t = getDict(locale)
  const age = patient.birthDate ? calculateAge(patient.birthDate) : null
  const bmi = calculateBmi(patient.weightKg, patient.heightCm)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/40 glass-base">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-semibold shrink-0"
              style={{
                background: `linear-gradient(135deg, ${stringToColor(patient.firstName + patient.lastName)}40, ${stringToColor(patient.firstName + patient.lastName)}20)`,
                color: stringToColor(patient.firstName + patient.lastName),
              }}
            >
              {(patient.firstName[0] + patient.lastName[0]).toUpperCase()}
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-xl">{patient.firstName} {patient.lastName}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 flex-wrap mt-1">
                {age && <span>{age} {locale === 'fr' ? 'ans' : 'yrs'}</span>}
                {patient.sex && <span>· {patient.sex}</span>}
                {patient.bloodType && (
                  <span className="flex items-center gap-1">
                    · <Droplet className="w-3 h-3" /> {patient.bloodType}
                  </span>
                )}
              </SheetDescription>
            </div>
          </div>
        </div>
        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="p-2 rounded-lg glass-base text-center">
            <Ruler className="w-3 h-3 mx-auto text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground mt-1">{t.patients.height}</p>
            <p className="text-xs font-medium">{patient.heightCm ? `${patient.heightCm} cm` : '—'}</p>
          </div>
          <div className="p-2 rounded-lg glass-base text-center">
            <Weight className="w-3 h-3 mx-auto text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground mt-1">{t.patients.weight}</p>
            <p className="text-xs font-medium">{patient.weightKg ? `${patient.weightKg} kg` : '—'}</p>
          </div>
          <div className="p-2 rounded-lg glass-base text-center">
            <Activity className="w-3 h-3 mx-auto text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground mt-1">{t.patients.bmi}</p>
            <p className="text-xs font-medium">{bmi || '—'}</p>
          </div>
          <div className="p-2 rounded-lg glass-base text-center">
            <Droplet className="w-3 h-3 mx-auto text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground mt-1">{t.patients.bloodType}</p>
            <p className="text-xs font-medium">{patient.bloodType || '—'}</p>
          </div>
        </div>
      </SheetHeader>

      <ScrollArea className="flex-1 px-5 py-4">
        <div className="space-y-5">
          {/* Contact */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.patients.demographics}</h3>
            <div className="grid grid-cols-2 gap-2">
              {patient.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="truncate">{patient.phone}</span>
                </div>
              )}
              {patient.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="truncate">{patient.email}</span>
                </div>
              )}
              {patient.addressLine && (
                <div className="flex items-center gap-2 text-sm col-span-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="truncate">{patient.addressLine}, {patient.postalCode} {patient.city}</span>
                </div>
              )}
              {patient.ssn && (
                <div className="flex items-center gap-2 text-sm col-span-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-mono text-xs">{patient.ssn}</span>
                </div>
              )}
              {patient.mutuelle && (
                <div className="flex items-center gap-2 text-sm col-span-2">
                  <Heart className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="truncate">{patient.mutuelle}</span>
                </div>
              )}
            </div>
          </section>

          {/* Allergies */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.patients.allergies}</h3>
            {patient.allergies?.length > 0 ? (
              <div className="space-y-1.5">
                {patient.allergies.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded-lg glass-base">
                    <span className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                      {a.substance}
                    </span>
                    <StatusPill
                      status={a.severity}
                      variant={a.severity === 'severe' ? 'danger' : a.severity === 'moderate' ? 'warning' : 'neutral'}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t.patients.noAllergies}</p>
            )}
          </section>

          {/* Vitals */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.patients.vitals}</h3>
            {patient.vitals?.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {patient.vitals.slice(0, 6).map((v: any) => (
                  <div key={v.id} className="p-2 rounded-lg glass-base">
                    <p className="text-[10px] text-muted-foreground uppercase">
                      {vitalLabel(v.type, t)}
                    </p>
                    <p className="text-sm font-medium font-mono">{v.value} <span className="text-[10px] text-muted-foreground">{v.unit}</span></p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(v.recordedAt, locale)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t.patients.noVitals}</p>
            )}
          </section>

          {/* Patient Timeline — signature feature per master prompt §13 */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t.patients.timeline}</h3>
            {patient.timelineEvents?.length > 0 ? (
              <div className="relative pl-4">
                <div className="absolute left-1 top-1 bottom-1 w-px bg-border" />
                <div className="space-y-3">
                  {patient.timelineEvents.slice(0, 15).map((ev: any) => (
                    <div key={ev.id} className="relative">
                      <div
                        className="absolute -left-3 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-background"
                        style={{ background: timelineColor(ev.type) }}
                      />
                      <div className="ml-3 p-2 rounded-lg glass-base">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-xs font-medium flex items-center gap-1.5">
                            {timelineIcon(ev.type)}
                            {ev.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                            {formatDateTime(ev.occurredAt, locale)}
                          </span>
                        </div>
                        {ev.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2">{ev.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t.patients.timelineEmpty}</p>
            )}
          </section>

          {/* Recent consultations */}
          {patient.consultations?.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.patients.consultations}</h3>
              <div className="space-y-2">
                {patient.consultations.slice(0, 3).map((c: any) => (
                  <div key={c.id} className="p-3 rounded-lg glass-base">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium">{c.practitioner.name}</p>
                      <span className="text-[10px] text-muted-foreground">{formatDate(c.startAt, locale)}</span>
                    </div>
                    {c.chiefComplaint && <p className="text-sm">{c.chiefComplaint}</p>}
                    {c.assessment && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{c.assessment}</p>}
                    {c.aiDrafted && (
                      <span className="status-pill text-glass-accent mt-1.5 inline-flex text-[10px]">
                        {t.ai.badge} · {Math.round(c.aiConfidence * 100)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Active prescriptions */}
          {patient.prescriptions?.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.patients.prescriptions}</h3>
              <div className="space-y-1.5">
                {patient.prescriptions.slice(0, 4).map((p: any) => (
                  <div key={p.id} className="p-2 rounded-lg glass-base flex items-start gap-2">
                    <Pill className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{p.medication}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {p.dosage} · {p.frequency} · {p.duration}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Invoices */}
          {patient.invoices?.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.patients.invoices}</h3>
              <div className="space-y-1.5">
                {patient.invoices.slice(0, 4).map((inv: any) => (
                  <div key={inv.id} className="p-2 rounded-lg glass-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-mono">{inv.number}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(inv.issueDate, locale)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">{inv.total.toFixed(2)} €</p>
                      <StatusPill
                        status={inv.status}
                        variant={invoiceStatusVariant(inv.status)}
                        label={t.billing.status[inv.status as keyof typeof t.billing.status]}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Consents */}
          {patient.consentRecords?.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.patients.consents}</h3>
              <div className="space-y-1.5">
                {patient.consentRecords.map((c: any) => (
                  <div key={c.id} className="p-2 rounded-lg glass-base flex items-center justify-between">
                    <span className="text-xs">{t.audit.consentTypes[c.type as keyof typeof t.audit.consentTypes]}</span>
                    <StatusPill
                      status={c.status}
                      variant={c.status === 'granted' ? 'success' : c.status === 'withdrawn' ? 'danger' : 'warning'}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function vitalLabel(type: string, t: any): string {
  const map: Record<string, string> = {
    blood_pressure: t.patients.bloodPressure,
    heart_rate: t.patients.heartRate,
    temperature: t.patients.temperature,
    spo2: t.patients.spo2,
    weight: t.common.weight || 'Weight',
    height: t.common.height || 'Height',
  }
  return map[type] || type
}

function timelineColor(type: string): string {
  const map: Record<string, string> = {
    consultation: '#0ea5e9',
    prescription: '#a855f7',
    invoice: '#22c55e',
    appointment: '#06b6d4',
    lab: '#f59e0b',
    imaging: '#ec4899',
    message: '#3b82f6',
    note: '#64748b',
  }
  return map[type] || '#64748b'
}

function timelineIcon(type: string) {
  const map: Record<string, any> = {
    consultation: FileText,
    prescription: Pill,
    invoice: Receipt,
    appointment: Calendar,
    lab: Activity,
    imaging: Activity,
    message: Mail,
    note: FileText,
  }
  const Icon = map[type] || FileText
  return <Icon className="w-3 h-3" />
}

function stringToColor(s: string): string {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 65%, 45%)`
}
