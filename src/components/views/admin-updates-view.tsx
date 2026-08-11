'use client'

import { useApp } from '@/lib/store'
import { type Locale, formatDateTime } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Upload, Rocket, FlaskConical, CheckCircle2, Loader2, Zap,
  Shield, AlertTriangle,
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
import { SkeletonCard } from '@/components/common/skeleton'
import { toast } from 'sonner'

const CHANNEL_CONFIG = {
  stable: { icon: CheckCircle2, color: 'text-success bg-success/10', label: { fr: 'Stable', en: 'Stable' } },
  canary: { icon: Zap, color: 'text-glass-warm bg-glass-warm/10', label: { fr: 'Canari', en: 'Canary' } },
  beta: { icon: FlaskConical, color: 'text-info bg-info/10', label: { fr: 'Bêta', en: 'Beta' } },
}

async function fetchUpdates() {
  const res = await fetch('/api/admin/updates', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

export function AdminUpdatesView({ locale }: { locale: Locale }) {
  const qc = useQueryClient()
  const [publishOpen, setPublishOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-updates'],
    queryFn: fetchUpdates,
    refetchInterval: 30_000,
  })

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{locale === 'fr' ? 'Canaux de mise à jour' : 'Update channels'}</h2>
          <p className="text-xs text-muted-foreground">{locale === 'fr' ? 'Contrôle du rollout des versions bureau' : 'Control desktop version rollout'}</p>
        </div>
        <Button onClick={() => setPublishOpen(true)} className="bg-primary text-primary-foreground">
          <Upload className="w-4 h-4" /> {locale === 'fr' ? 'Publier' : 'Publish'}
        </Button>
      </div>

      {/* Channels */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(data?.items || []).map((ch: any, i: number) => {
            const config = CHANNEL_CONFIG[ch.channel as keyof typeof CHANNEL_CONFIG] || CHANNEL_CONFIG.stable
            const Icon = config.icon
            return (
              <motion.div
                key={ch.id}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 50 }}
                className="glass-card rounded-2xl p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{config.label[locale as 'fr' | 'en']}</p>
                      <p className="text-[10px] text-muted-foreground">{ch.channel}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{ch.rolloutPercent}%</Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{locale === 'fr' ? 'Version' : 'Version'}</span>
                    <span className="font-mono font-semibold">{ch.latestVersion}</span>
                  </div>
                  {ch.minVersion && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{locale === 'fr' ? 'Min requis' : 'Min required'}</span>
                      <span className="font-mono text-destructive">{ch.minVersion}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{locale === 'fr' ? 'Publié' : 'Published'}</span>
                    <span>{formatDateTime(ch.publishedAt, locale)}</span>
                  </div>
                </div>

                {ch.releaseNotes && (
                  <div className="p-2 rounded-lg glass-base text-[11px] text-muted-foreground mb-3 max-h-32 overflow-y-auto scroll-area-glass whitespace-pre-wrap">
                    {ch.releaseNotes}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                  <Shield className="w-3 h-3 text-success" />
                  <span className="text-[10px] text-muted-foreground truncate">
                    {ch.bundleSignature ? `Signature: ${ch.bundleSignature.slice(0, 20)}...` : 'No signature'}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Info */}
      <div className="glass-base rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <p className="font-medium text-foreground mb-1">{locale === 'fr' ? 'Sécurité des mises à jour' : 'Update safety'}</p>
          {locale === 'fr'
            ? 'Les bundles sont signés avec Ed25519. Le client de bureau vérifie la signature avant installation. Un rollback automatique se déclenche si l\'app échoue dans les 5 minutes après le démarrage. Les mises à jour ne s\'appliquent jamais pendant les heures d\'ouverture (02:00-05:00 par défaut).'
            : 'Bundles are signed with Ed25519. Desktop client verifies signature before installing. Automatic rollback triggers if app fails within 5 minutes of startup. Updates never apply during clinic hours (02:00-05:00 default).'}
        </div>
      </div>

      <PublishDialog open={publishOpen} onOpenChange={setPublishOpen} locale={locale} onSuccess={() => qc.invalidateQueries({ queryKey: ['admin-updates'] })} />
    </div>
  )
}

function PublishDialog({ open, onOpenChange, locale, onSuccess }: any) {
  const [form, setForm] = useState({
    channel: 'stable',
    latestVersion: '1.2.1',
    minVersion: '',
    rolloutPercent: 100,
    releaseNotes: '',
    bundleUrl: '',
    bundleSignature: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!form.latestVersion) {
      toast.error(locale === 'fr' ? 'Version requise' : 'Version required')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          minVersion: form.minVersion || undefined,
          bundleUrl: form.bundleUrl || undefined,
          bundleSignature: form.bundleSignature || undefined,
          adminEmail: 'admin@smartclinic.app',
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(locale === 'fr' ? 'Mise à jour publiée' : 'Update published')
      onSuccess()
      onOpenChange(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-floating max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            {locale === 'fr' ? 'Publier une mise à jour' : 'Publish update'}
          </DialogTitle>
          <DialogDescription>{locale === 'fr' ? 'Déploie une nouvelle version sur un canal' : 'Deploy a new version to a channel'}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5">
            <Label>{locale === 'fr' ? 'Canal' : 'Channel'}</Label>
            <select
              value={form.channel}
              onChange={(e) => setForm({ ...form, channel: e.target.value })}
              className="w-full h-10 px-3 rounded-md glass-base border-0 text-sm"
            >
              <option value="stable">{locale === 'fr' ? 'Stable' : 'Stable'}</option>
              <option value="beta">Beta</option>
              <option value="canary">{locale === 'fr' ? 'Canari' : 'Canary'}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{locale === 'fr' ? 'Version' : 'Version'} *</Label>
            <Input value={form.latestVersion} onChange={(e) => setForm({ ...form, latestVersion: e.target.value })} className="glass-base border-0 font-mono" placeholder="1.2.1" />
          </div>
          <div className="space-y-1.5">
            <Label>{locale === 'fr' ? 'Version min (force)' : 'Min version (force)'}</Label>
            <Input value={form.minVersion} onChange={(e) => setForm({ ...form, minVersion: e.target.value })} className="glass-base border-0 font-mono" placeholder="1.0.0" />
          </div>
          <div className="space-y-1.5">
            <Label>{locale === 'fr' ? 'Rollout %' : 'Rollout %'}</Label>
            <Input type="number" min="0" max="100" value={form.rolloutPercent} onChange={(e) => setForm({ ...form, rolloutPercent: parseInt(e.target.value) })} className="glass-base border-0" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>{locale === 'fr' ? 'Notes de version' : 'Release notes'}</Label>
            <Textarea rows={4} value={form.releaseNotes} onChange={(e) => setForm({ ...form, releaseNotes: e.target.value })} className="glass-base border-0" placeholder="## Changes..." />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Bundle URL</Label>
            <Input value={form.bundleUrl} onChange={(e) => setForm({ ...form, bundleUrl: e.target.value })} className="glass-base border-0" placeholder="https://releases.smartclinic.app/..." />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>{locale === 'fr' ? 'Signature Ed25519' : 'Ed25519 signature'}</Label>
            <Input value={form.bundleSignature} onChange={(e) => setForm({ ...form, bundleSignature: e.target.value })} className="glass-base border-0 font-mono" placeholder="ed25519:..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{locale === 'fr' ? 'Annuler' : 'Cancel'}</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {locale === 'fr' ? 'Publier' : 'Publish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
