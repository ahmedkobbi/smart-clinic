'use client'

import { getDict, type Locale } from '@/lib/i18n'
import { Modal, TextInput, Textarea, Select, Autocomplete, Button, Checkbox, Group, Stack, Grid, Text, Box } from '@mantine/core'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Loader2, Pill, AlertTriangle, Sparkles } from 'lucide-react'
import { notifications } from '@mantine/notifications'

const COMMON_MEDS = [
  'Doliprane 1000mg (paracétamol)',
  'Ibuprofène 400mg',
  'Amoxicilline 500mg',
  'Spasfon (phloroglucinol)',
  'Levothyrox 50µg',
  'Kardegic 75mg (AAS)',
  'Inexium 20mg (ésoméprazole)',
  'Metformine 500mg',
  'Ventoline (salbutamol)',
  'Crestor 10mg (rosuvastatine)',
  'Augmentin 1g (amoxicilline+acide clavulanique)',
  'Bactrim (sulfaméthoxazole+triméthoprime)',
]

interface PrescriptionFormProps {
  open: boolean
  onOpenChange: (b: boolean) => void
  patientId: string
  patientAllergies: Array<{ substance: string; severity: string }>
  practitioners: any[]
  locale: Locale
  onSuccess: () => void
}

interface AllergyWarning {
  type: 'allergy_match' | 'interaction'
  severity: 'severe' | 'moderate' | 'mild'
  substance: string
  matchedAllergy: string
  message: string
}

export function PrescriptionForm({
  open, onOpenChange, patientId, patientAllergies, practitioners, locale, onSuccess,
}: PrescriptionFormProps) {
  const t = getDict(locale)
  const [submitting, setSubmitting] = useState(false)
  const [checking, setChecking] = useState(false)
  const [warnings, setWarnings] = useState<AllergyWarning[]>([])
  const [overrideConfirm, setOverrideConfirm] = useState(false)
  const [form, setForm] = useState({
    practitionerId: '',
    medication: '',
    dosage: '',
    frequency: '',
    duration: '',
    quantity: '',
    instructions: '',
  })

  const checkInteractions = async (med: string) => {
    if (!med || med.length < 3) {
      setWarnings([])
      return
    }
    setChecking(true)
    try {
      const res = await fetch('/api/prescriptions/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, medication: med }),
      })
      if (!res.ok) return
      const data = await res.json()
      setWarnings(data.warnings || [])
      setOverrideConfirm(false)
    } catch {
      // silent
    } finally {
      setChecking(false)
    }
  }

  const hasSevereWarning = warnings.some(w => w.severity === 'severe')

  const handleSubmit = async () => {
    if (!form.practitionerId || !form.medication) {
      notifications.show({ message: t.prescriptions.practitionerMedicationRequiredToast, color: 'red' })
      return
    }
    if (hasSevereWarning && !overrideConfirm) {
      notifications.show({ message: t.prescriptions.severeAllergyConfirmToast, color: 'red' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          patientId,
          quantity: form.quantity ? parseInt(form.quantity) : undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      notifications.show({ message: t.prescriptions.createdToast, color: 'green' })
      if (warnings.length > 0) {
        notifications.show({ message: t.prescriptions.allergyOverrideLoggedToast, color: 'yellow' })
      }
      onSuccess()
      onOpenChange(false)
      setForm({ practitionerId: '', medication: '', dosage: '', frequency: '', duration: '', quantity: '', instructions: '' })
      setWarnings([])
      setOverrideConfirm(false)
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
          <Pill className="w-5 h-5 text-primary" />
          <span>{t.prescriptions.new}</span>
        </Group>
      }
    >
      <Stack gap="sm">
        <Text size="xs" c="dimmed">{t.prescriptions.allergyCheck}</Text>

        {/* Patient allergies display */}
        {patientAllergies.length > 0 && (
          <Box p="sm" className="rounded-lg bg-destructive/5 border border-destructive/20">
            <Text size="xs" className="uppercase font-semibold text-destructive mb-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {t.prescriptions.knownAllergies}
            </Text>
            <Group gap={6}>
              {patientAllergies.map((a, i) => (
                <span
                  key={i}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    a.severity === 'severe' ? 'bg-destructive/15 text-destructive' :
                    a.severity === 'moderate' ? 'bg-warning/15 text-warning' :
                    'bg-info/15 text-info'
                  }`}
                >
                  {a.substance} ({a.severity})
                </span>
              ))}
            </Group>
          </Box>
        )}

        <Stack gap="sm">
          <Select
            label={`${t.appointments.practitioner} *`}
            variant="filled"
            value={form.practitionerId}
            onChange={(v) => setForm({ ...form, practitionerId: v || '' })}
            data={practitioners.map((p: any) => ({ value: p.id, label: `${p.name} — ${p.specialty}` }))}
            placeholder="—"
            searchable
          />

          <div>
            <Autocomplete
              label={`${t.prescriptions.medication} *`}
              variant="filled"
              value={form.medication}
              onChange={(v) => {
                setForm({ ...form, medication: v })
                checkInteractions(v)
              }}
              data={COMMON_MEDS}
              placeholder={t.prescriptions.medicationPlaceholder}
            />
            {checking && (
              <Text size="xs" c="dimmed" className="flex items-center gap-1 mt-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                {t.prescriptions.checkingAllergies}
              </Text>
            )}
          </div>

          {/* Allergy warnings */}
          <AnimatePresence>
            {warnings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                {warnings.map((w, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border-2 flex items-start gap-2 ${
                      w.severity === 'severe' ? 'bg-destructive/10 border-destructive/40' :
                      w.severity === 'moderate' ? 'bg-warning/10 border-warning/40' :
                      'bg-info/10 border-info/40'
                    }`}
                  >
                    <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                      w.severity === 'severe' ? 'text-destructive' :
                      w.severity === 'moderate' ? 'text-warning' : 'text-info'
                    }`} />
                    <div className="flex-1">
                      <Text size="xs" fw={500}>{w.message}</Text>
                    </div>
                  </div>
                ))}
                {hasSevereWarning && (
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/30 flex items-center gap-2">
                    <Checkbox
                      checked={overrideConfirm}
                      onChange={(e) => setOverrideConfirm(e.currentTarget.checked)}
                      label={t.prescriptions.overrideConfirm}
                      size="xs"
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <Grid gap="sm">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                label={t.prescriptions.dosage}
                variant="filled"
                value={form.dosage}
                onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                placeholder="500 mg"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                label={t.prescriptions.frequency}
                variant="filled"
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                placeholder="3x/jour"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                label={t.common.duration}
                variant="filled"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                placeholder="7 jours"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                type="number"
                label={t.prescriptions.quantity}
                variant="filled"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="21"
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label={t.prescriptions.instructions}
                variant="filled"
                autosize
                minRows={2}
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              />
            </Grid.Col>
          </Grid>
        </Stack>

        <Group justify="space-between" mt="sm">
          <Text size="xs" c="dimmed" className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-glass-accent" />
            {t.prescriptions.allergyCheckActive}
          </Text>
          <Group gap="sm">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
            <Button
              onClick={handleSubmit}
              loading={submitting}
              disabled={hasSevereWarning && !overrideConfirm}
              leftSection={submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            >
              {t.common.save}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  )
}
