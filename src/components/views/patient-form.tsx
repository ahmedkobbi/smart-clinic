'use client'

import { getDict, type Locale } from '@/lib/i18n'
import { Modal, TextInput, Select, Button, Group, Stack, Grid } from '@mantine/core'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { notifications } from '@mantine/notifications'
import { Loader2, UserPlus } from 'lucide-react'

async function fetchBranches() {
  const res = await fetch('/api/settings?section=tenant', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

export function PatientForm({ open, onOpenChange, locale }: { open: boolean; onOpenChange: (b: boolean) => void; locale: Locale }) {
  const t = getDict(locale)
  const qc = useQueryClient()
  const { data: branchesData } = useQuery({ queryKey: ['branches'], queryFn: fetchBranches })
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    sex: 'unknown' as 'male' | 'female' | 'other' | 'unknown',
    phone: '',
    email: '',
    addressLine: '',
    postalCode: '',
    city: '',
    ssn: '',
    mutuelle: '',
    bloodType: '',
    heightCm: '',
    weightKg: '',
    branchId: '',
  })

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName) {
      notifications.show({ message: t.patients.nameRequiredToast, color: 'red' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          birthDate: form.birthDate || undefined,
          heightCm: form.heightCm ? parseInt(form.heightCm) : undefined,
          weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
          email: form.email || undefined,
          branchId: form.branchId || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      const patient = await res.json()
      notifications.show({ message: `${t.patients.createdToast}: ${patient.firstName} ${patient.lastName}`, color: 'green' })
      qc.invalidateQueries({ queryKey: ['patients'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onOpenChange(false)
      // Reset form
      setForm({
        firstName: '', lastName: '', birthDate: '', sex: 'unknown',
        phone: '', email: '', addressLine: '', postalCode: '', city: '',
        ssn: '', mutuelle: '', bloodType: '', heightCm: '', weightKg: '', branchId: '',
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
      size="lg"
      title={
        <Group gap="sm">
          <UserPlus className="w-5 h-5 text-primary" />
          <span>{t.patients.new}</span>
        </Group>
      }
    >
      <Stack gap="sm">
        <Grid gap="sm">
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label={`${t.common.name} *`}
              variant="filled"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label={`${t.patients.lastName} *`}
              variant="filled"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              type="date"
              label={t.patients.birthDate}
              variant="filled"
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Select
              label={t.patients.sex}
              variant="filled"
              value={form.sex}
              onChange={(v) => setForm({ ...form, sex: (v as any) || 'unknown' })}
              data={[
                { value: 'male', label: t.patients.sexes.male },
                { value: 'female', label: t.patients.sexes.female },
                { value: 'other', label: t.patients.sexes.other },
                { value: 'unknown', label: t.patients.sexes.unknown },
              ]}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label={t.common.phone}
              variant="filled"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              type="email"
              label={t.common.email}
              variant="filled"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <TextInput
              label={t.common.address}
              variant="filled"
              value={form.addressLine}
              onChange={(e) => setForm({ ...form, addressLine: e.target.value })}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label={t.common.postalCode}
              variant="filled"
              value={form.postalCode}
              onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label={t.common.city}
              variant="filled"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label={t.patients.ssn}
              variant="filled"
              value={form.ssn}
              onChange={(e) => setForm({ ...form, ssn: e.target.value })}
              classNames={{ input: 'font-mono' }}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label={t.patients.mutuelle}
              variant="filled"
              value={form.mutuelle}
              onChange={(e) => setForm({ ...form, mutuelle: e.target.value })}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Select
              label={t.patients.bloodType}
              placeholder="—"
              variant="filled"
              value={form.bloodType}
              onChange={(v) => setForm({ ...form, bloodType: v || '' })}
              data={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => ({ value: b, label: b }))}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              type="number"
              label={`${t.patients.height} (cm)`}
              variant="filled"
              value={form.heightCm}
              onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              type="number"
              step="0.1"
              label={`${t.patients.weight} (kg)`}
              variant="filled"
              value={form.weightKg}
              onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Select
              label={t.patients.branch}
              placeholder={t.common.select}
              variant="filled"
              value={form.branchId}
              onChange={(v) => setForm({ ...form, branchId: v || '' })}
              data={(branchesData?.branches || []).map((b: any) => ({ value: b.id, label: b.name }))}
              clearable
            />
          </Grid.Col>
        </Grid>

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
