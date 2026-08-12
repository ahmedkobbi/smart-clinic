'use client'

import { getDict, type Locale } from '@/lib/i18n'
import { Modal, TextInput, Select, Button, Group, Stack } from '@mantine/core'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { notifications } from '@mantine/notifications'
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
      notifications.show({ message: t.common.patientPractitionerRequired, color: 'red' })
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
      await res.json()
      notifications.show({ message: t.appointments.createdToast, color: 'green' })
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onOpenChange(false)
    } catch (e) {
      notifications.show({ message: (e as Error).message, color: 'red' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      opened={open}
      onClose={() => handleOpenChange(false)}
      title={
        <Group gap="sm">
          <CalendarPlus className="w-5 h-5 text-primary" />
          <span>{t.appointments.new}</span>
        </Group>
      }
      size="xl"
    >
      <Stack gap="xs">
        <Select
          label={`${t.appointments.patient} *`}
          placeholder={t.common.select}
          variant="filled"
          value={form.patientId}
          onChange={(v) => setForm({ ...form, patientId: v || '' })}
          data={(patientsData?.items || []).map((p: any) => ({
            value: p.id,
            label: `${p.firstName} ${p.lastName} ${p.birthDate ? `(${new Date(p.birthDate).getFullYear()})` : ''}`,
          }))}
          searchable
        />

        <Select
          label={`${t.appointments.practitioner} *`}
          placeholder={t.common.select}
          variant="filled"
          value={form.practitionerId}
          onChange={(v) => setForm({ ...form, practitionerId: v || '' })}
          data={(staffData?.practitioners || []).map((p: any) => ({
            value: p.id,
            label: `${p.name} — ${p.specialty}`,
          }))}
          searchable
        />

        <Group grow>
          <TextInput
            type="date"
            label={t.common.date}
            variant="filled"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <TextInput
            type="time"
            label={t.common.time}
            variant="filled"
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
          />
        </Group>

        <Group grow>
          <Select
            label={`${t.common.duration} (min)`}
            variant="filled"
            value={form.duration}
            onChange={(v) => setForm({ ...form, duration: v || '30' })}
            data={[15, 30, 45, 60, 90].map(d => ({ value: String(d), label: `${d} min` }))}
          />
          <Select
            label={t.common.type}
            variant="filled"
            value={form.type}
            onChange={(v) => setForm({ ...form, type: v || 'consultation' })}
            data={[
              { value: 'consultation', label: t.appointments.types.consultation },
              { value: 'follow_up', label: t.appointments.types.follow_up },
              { value: 'telemedicine', label: t.appointments.types.telemedicine },
              { value: 'procedure', label: t.appointments.types.procedure },
              { value: 'walk_in', label: t.appointments.types.walk_in },
            ]}
          />
        </Group>

        <Select
          label={t.appointments.resource}
          placeholder="—"
          variant="filled"
          value={form.resourceId}
          onChange={(v) => setForm({ ...form, resourceId: v || '' })}
          data={(resData?.resources || []).map((r: any) => ({
            value: r.id,
            label: `${r.name} (${r.type})`,
          }))}
          clearable
        />

        <TextInput
          label={t.appointments.reason}
          variant="filled"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />

        <Group justify="flex-end" mt="sm">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t.common.cancel}
          </Button>
          <Button onClick={handleSubmit} loading={submitting} leftSection={submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}>
            {t.common.save}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
