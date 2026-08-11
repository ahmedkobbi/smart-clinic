'use client'

import { useApp } from '@/lib/store'
import { getDict, type Locale } from '@/lib/i18n'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import {
  Stethoscope, Send, Loader2, AlertTriangle, Clock, CheckCircle2,
  Activity, Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/common/empty-state'
import { toast } from 'sonner'

interface TriageResult {
  urgencyLevel: 'emergency' | 'urgent' | 'scheduled' | 'routine'
  recommendedAction: string
  recommendedSpecialty: string
  suggestedTimeframe: string
  redFlags: string[]
  recommendation: string
  disclaimer: string
}

const URGENCY_CONFIG = {
  emergency: {
    color: 'text-destructive bg-destructive/10',
    border: 'border-destructive/30',
    icon: AlertTriangle,
    label: { fr: 'Urgence vitale', en: 'Emergency' },
  },
  urgent: {
    color: 'text-warning bg-warning/10',
    border: 'border-warning/30',
    icon: Clock,
    label: { fr: 'Urgent (24-48h)', en: 'Urgent (24-48h)' },
  },
  scheduled: {
    color: 'text-info bg-info/10',
    border: 'border-info/30',
    icon: Clock,
    label: { fr: 'Planifié', en: 'Scheduled' },
  },
  routine: {
    color: 'text-success bg-success/10',
    border: 'border-success/30',
    icon: CheckCircle2,
    label: { fr: 'Routine', en: 'Routine' },
  },
}

const SUGGESTED_SYMPTOMS = [
  'Ma tête tourne depuis ce matin, légère nausée',
  'Douleur au ventre depuis 2 jours, pas de fièvre',
  'Toux persistante depuis 1 semaine',
  'Fièvre 38.5°C depuis 3 jours, frissons',
  'Douleur thoracique oppressive, difficulté à respirer',
]

export function TriageView({ locale }: { locale: Locale }) {
  const t = getDict(locale)
  const { setView, setNewAppointmentOpen } = useApp()
  const [symptoms, setSymptoms] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TriageResult | null>(null)

  const handleTriage = async () => {
    if (!symptoms.trim()) {
      toast.error(t.triage.describeSymptomsToast)
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms,
          age: age ? parseInt(age) : undefined,
          sex: sex || undefined,
          locale,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      const data = await res.json()
      setResult(data)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24">
      {/* Hero */}
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-card ai-glow rounded-2xl p-5"
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-glass-accent/15 flex items-center justify-center shrink-0">
            <Stethoscope className="w-6 h-6 text-glass-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {t.triage.title}
              <span className="status-pill text-glass-accent text-[10px]">
                <Sparkles className="w-3 h-3" /> {t.ai.badge}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {t.triage.intro}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input form */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 50 }}
          className="glass-card rounded-2xl p-5 space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t.patients.age}</Label>
              <Input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="—"
                className="glass-base border-0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t.patients.sex}</Label>
              <Input
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                placeholder="M / F / —"
                className="glass-base border-0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t.triage.symptoms}</Label>
            <Textarea
              rows={5}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder={t.triage.symptomsPlaceholder}
              className="glass-base border-0 resize-none"
            />
          </div>

          {/* Suggested symptoms */}
          <div>
            <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1.5">
              {t.common.examples}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_SYMPTOMS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSymptoms(s)}
                  className="px-2 py-1 rounded-md text-[10px] glass-base hover:bg-accent/50 transition-colors text-left"
                >
                  {s.length > 40 ? s.slice(0, 40) + '...' : s}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleTriage}
            disabled={loading || !symptoms.trim()}
            className="w-full bg-primary text-primary-foreground hover:opacity-90 h-11"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t.triage.analyzing}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {t.triage.run}
              </>
            )}
          </Button>
        </motion.div>

        {/* Result */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 100 }}
          className="glass-card rounded-2xl p-5"
        >
          {!result && !loading && (
            <EmptyState
              icon={Activity}
              title={t.triage.awaitingTitle}
              description={t.triage.awaitingDesc}
            />
          )}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-xl glass-raised flex items-center justify-center mb-3 animate-pulse-glow">
                <Sparkles className="w-6 h-6 text-glass-accent animate-pulse" />
              </div>
              <p className="text-sm text-muted-foreground">{t.triage.analyzingDesc}</p>
            </div>
          )}
          {result && (
            <TriageResultDisplay result={result} locale={locale} onBookAppointment={() => { setView('appointments'); setNewAppointmentOpen(true) }} />
          )}
        </motion.div>
      </div>
    </div>
  )
}

function TriageResultDisplay({ result, locale, onBookAppointment }: { result: TriageResult; locale: Locale; onBookAppointment: () => void }) {
  const t = getDict(locale)
  const config = URGENCY_CONFIG[result.urgencyLevel]
  const Icon = config.icon

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={result.urgencyLevel}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="space-y-4"
      >
        {/* Urgency badge */}
        <div className={`p-4 rounded-xl border-2 ${config.border} ${config.color} flex items-center gap-3`}>
          <Icon className="w-8 h-8 shrink-0" />
          <div>
            <p className="text-[10px] uppercase font-semibold opacity-70">
              {t.triage.urgencyLevel}
            </p>
            <p className="text-lg font-bold">{config.label[locale as 'fr' | 'en']}</p>
          </div>
        </div>

        {/* Recommended action */}
        <div className="p-3 rounded-lg glass-base">
          <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">
            {t.triage.recommendedAction}
          </p>
          <p className="text-sm">{result.recommendedAction}</p>
        </div>

        {/* Specialty + timeframe */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-lg glass-base">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">
              {t.triage.specialty}
            </p>
            <p className="text-sm font-medium">{result.recommendedSpecialty}</p>
          </div>
          <div className="p-3 rounded-lg glass-base">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">
              {t.triage.timeframe}
            </p>
            <p className="text-sm font-medium">{result.suggestedTimeframe}</p>
          </div>
        </div>

        {/* Recommendation */}
        {result.recommendation && (
          <div className="p-3 rounded-lg glass-base">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">
              {t.triage.recommendation}
            </p>
            <p className="text-xs leading-relaxed">{result.recommendation}</p>
          </div>
        )}

        {/* Red flags */}
        {result.redFlags?.length > 0 && (
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <p className="text-[10px] uppercase font-semibold text-destructive mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {t.triage.redFlags}
            </p>
            <ul className="space-y-1">
              {result.redFlags.map((flag, i) => (
                <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                  <span className="text-destructive mt-0.5">•</span>
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action button */}
        {result.urgencyLevel !== 'emergency' && (
          <Button
            onClick={onBookAppointment}
            className="w-full bg-primary text-primary-foreground hover:opacity-90"
          >
            {t.triage.bookAppointment}
          </Button>
        )}

        {/* Disclaimer */}
        <div className="p-2 rounded-lg bg-muted/50 text-[10px] text-muted-foreground text-center leading-relaxed">
          <Sparkles className="w-3 h-3 inline mr-1 text-glass-accent" />
          {result.disclaimer}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
