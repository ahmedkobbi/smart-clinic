'use client'

import { getDict, type Locale } from '@/lib/i18n'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Loader2, Pill, AlertTriangle, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

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
      toast.error(locale === 'fr' ? 'Praticien et médicament requis' : 'Practitioner and medication required')
      return
    }
    if (hasSevereWarning && !overrideConfirm) {
      toast.error(locale === 'fr' ? 'Confirmation requise pour allergie sévère' : 'Confirmation required for severe allergy')
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
      toast.success(locale === 'fr' ? 'Ordonnance créée' : 'Prescription created')
      if (warnings.length > 0) {
        toast.warning(locale === 'fr' ? 'Ordonnance avec override d\'allergie journalisé' : 'Prescription with allergy override logged')
      }
      onSuccess()
      onOpenChange(false)
      setForm({ practitionerId: '', medication: '', dosage: '', frequency: '', duration: '', quantity: '', instructions: '' })
      setWarnings([])
      setOverrideConfirm(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-floating max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary" />
            {locale === 'fr' ? 'Nouvelle ordonnance' : 'New Prescription'}
          </DialogTitle>
          <DialogDescription>
            {locale === 'fr' ? 'Vérification automatique des allergies' : 'Automatic allergy check'}
          </DialogDescription>
        </DialogHeader>

        {/* Patient allergies display */}
        {patientAllergies.length > 0 && (
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <p className="text-[10px] uppercase font-semibold text-destructive mb-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {locale === 'fr' ? 'Allergies connues du patient' : 'Patient known allergies'}
            </p>
            <div className="flex flex-wrap gap-1.5">
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
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5 col-span-2">
            <Label>{locale === 'fr' ? 'Praticien' : 'Practitioner'} *</Label>
            <select
              value={form.practitionerId}
              onChange={(e) => setForm({ ...form, practitionerId: e.target.value })}
              className="w-full h-10 px-3 rounded-md glass-base border-0 text-sm"
            >
              <option value="">—</option>
              {practitioners.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} — {p.specialty}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 col-span-2">
            <Label>{locale === 'fr' ? 'Médicament' : 'Medication'} *</Label>
            <Input
              value={form.medication}
              onChange={(e) => {
                setForm({ ...form, medication: e.target.value })
                checkInteractions(e.target.value)
              }}
              list="meds-list"
              placeholder={locale === 'fr' ? 'Nom du médicament...' : 'Medication name...'}
              className="glass-base border-0"
            />
            <datalist id="meds-list">
              {COMMON_MEDS.map(m => <option key={m} value={m} />)}
            </datalist>
            {checking && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                {locale === 'fr' ? 'Vérification des allergies...' : 'Checking allergies...'}
              </p>
            )}
          </div>

          {/* Allergy warnings */}
          <AnimatePresence>
            {warnings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="col-span-2 space-y-2"
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
                      <p className="text-xs font-medium">{w.message}</p>
                    </div>
                  </div>
                ))}
                {hasSevereWarning && (
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/30 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="override"
                      checked={overrideConfirm}
                      onChange={(e) => setOverrideConfirm(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="override" className="text-xs flex-1">
                      {locale === 'fr'
                        ? 'Je confirme avoir informé le patient et assume la responsabilité de cette prescription malgré l\'allergie sévère'
                        : 'I confirm I have informed the patient and assume responsibility for this prescription despite the severe allergy'}
                    </label>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5">
            <Label>{locale === 'fr' ? 'Dosage' : 'Dosage'}</Label>
            <Input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="500 mg" className="glass-base border-0" />
          </div>
          <div className="space-y-1.5">
            <Label>{locale === 'fr' ? 'Fréquence' : 'Frequency'}</Label>
            <Input value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} placeholder="3x/jour" className="glass-base border-0" />
          </div>
          <div className="space-y-1.5">
            <Label>{locale === 'fr' ? 'Durée' : 'Duration'}</Label>
            <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="7 jours" className="glass-base border-0" />
          </div>
          <div className="space-y-1.5">
            <Label>{locale === 'fr' ? 'Quantité' : 'Quantity'}</Label>
            <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="21" className="glass-base border-0" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>{locale === 'fr' ? 'Instructions' : 'Instructions'}</Label>
            <Textarea rows={2} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} className="glass-base border-0" />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-glass-accent" />
            {locale === 'fr' ? 'Vérification allergies active' : 'Allergy check active'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || (hasSevereWarning && !overrideConfirm)}
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t.common.save}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
