'use client'

import { getDict, type Locale } from '@/lib/i18n'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, CalendarPlus } from 'lucide-react'

async function fetchPatients() {
  const res = await fetch('/api/patients?limit=100', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

async function fetchSettings(section: string) {
  const res = await fetch(`/api/settings?section=${section}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

export function AppointmentForm({ open, onOpenChange, locale }: { open: boolean; onOpenChange: (b: boolean) => void; locale: Locale }) {
  const t = getDict(locale)
  const qc = useQueryClient()
  const { data: patientsData } = useQuery({ queryKey: ['patients-list'], queryFn: fetchPatients })
  const { data: staffData } = useQuery({ queryKey: ['staff'], queryFn: () => fetchSettings('staff') })
  const { data: resData } = useQuery({ queryKey: ['resources'], queryFn: () => fetchSettings('resources') })
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    patientId: '',
    practitionerId: '',
    resourceId: '',
    branchId: '',
    date: new Date().toISOString().slice(0, 10),
    time: '09:00',
    duration: '30',
    type: 'consultation',
    reason: '',
  })

  // Reset form when dialog opens (via key prop on parent or explicit reset)
  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setForm({
        patientId: '',
        practitionerId: '',
        resourceId: '',
        branchId: '',
        date: new Date().toISOString().slice(0, 10),
        time: '09:00',
        duration: '30',
        type: 'consultation',
        reason: '',
      })
    }
    onOpenChange(o)
  }

  const handleSubmit = async () => {
    if (!form.patientId || !form.practitionerId) {
      toast.error(locale === 'fr' ? 'Patient et praticien requis' : 'Patient and practitioner required')
      return
    }
    setSubmitting(true)
    try {
      const startAt = new Date(`${form.date}T${form.time}:00`)
      const endAt = new Date(startAt.getTime() + parseInt(form.duration) * 60000)
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: form.patientId,
          practitionerId: form.practitionerId,
          resourceId: form.resourceId || undefined,
          branchId: form.branchId || undefined,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          type: form.type,
          reason: form.reason,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      const appt = await res.json()
      toast.success(`${locale === 'fr' ? 'Rendez-vous créé' : 'Appointment created'}`)
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onOpenChange(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass-floating max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-primary" />
            {t.appointments.new}
          </DialogTitle>
          <DialogDescription>{t.appointments.subtitle}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5 col-span-2">
            <Label>{t.appointments.patient} *</Label>
            <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })}>
              <SelectTrigger><SelectValue placeholder={locale === 'fr' ? 'Sélectionner' : 'Select'} /></SelectTrigger>
              <SelectContent className="glass-floating max-h-72">
                {(patientsData?.items || []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} {p.birthDate ? `(${new Date(p.birthDate).getFullYear()})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>{t.appointments.practitioner} *</Label>
            <Select value={form.practitionerId} onValueChange={(v) => setForm({ ...form, practitionerId: v })}>
              <SelectTrigger><SelectValue placeholder={locale === 'fr' ? 'Sélectionner' : 'Select'} /></SelectTrigger>
              <SelectContent className="glass-floating max-h-72">
                {(staffData?.practitioners || []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} — {p.specialty}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t.common.date}</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>{t.common.time}</Label>
            <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>{t.common.duration} (min)</Label>
            <Select value={form.duration} onValueChange={(v) => setForm({ ...form, duration: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="glass-floating">
                {[15, 30, 45, 60, 90].map(d => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t.common.type}</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="glass-floating">
                <SelectItem value="consultation">{t.appointments.types.consultation}</SelectItem>
                <SelectItem value="follow_up">{t.appointments.types.follow_up}</SelectItem>
                <SelectItem value="telemedicine">{t.appointments.types.telemedicine}</SelectItem>
                <SelectItem value="procedure">{t.appointments.types.procedure}</SelectItem>
                <SelectItem value="walk_in">{t.appointments.types.walk_in}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>{t.appointments.resource}</Label>
            <Select value={form.resourceId} onValueChange={(v) => setForm({ ...form, resourceId: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent className="glass-floating">
                {(resData?.resources || []).map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>{r.name} ({r.type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="reason">{t.appointments.reason}</Label>
            <Input id="reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t.common.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
