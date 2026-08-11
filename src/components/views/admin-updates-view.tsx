'use client'

import { useApp } from '@/lib/store'
import { getDict, formatDateTime, type Locale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Text, Group, Stack, Badge, Button, TextInput, Textarea, Select,
  Modal, ScrollArea,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  Upload, Rocket, CheckCircle2, Zap, Shield, AlertTriangle,
} from 'lucide-react'
import { useState } from 'react'
import { SkeletonCard } from '@/components/common/skeleton'

const CHANNEL_CONFIG: Record<string, { icon: any; color: string; labelKey: string }> = {
  stable: { icon: CheckCircle2, color: 'green', labelKey: 'stable' },
  canary: { icon: Zap, color: 'orange', labelKey: 'canary' },
  beta: { icon: Rocket, color: 'blue', labelKey: 'beta' },
}

async function fetchUpdates() {
  const res = await fetch('/api/admin/updates', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

export function AdminUpdatesView({ locale }: { locale: Locale }) {
  const t = getDict(locale)
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
      <Group justify="space-between" align="flex-end">
        <Stack gap={0}>
          <Text size="lg" fw={600}>{t.admin.updates.title}</Text>
          <Text size="xs" c="dimmed">{t.admin.updates.subtitle}</Text>
        </Stack>
        <Button leftSection={<Upload size={16} />} onClick={() => setPublishOpen(true)}>
          {t.admin.updates.publish}
        </Button>
      </Group>

      {/* Channels */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(data?.items || []).map((ch: any, i: number) => {
            const config = CHANNEL_CONFIG[ch.channel] || CHANNEL_CONFIG.stable
            const Icon = config.icon
            return (
              <motion.div
                key={ch.id}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 50 }}
                className="glass-card rounded-2xl p-5"
              >
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${config.color}-500/10`}>
                      <Icon className={`w-5 h-5 text-${config.color}-500`} />
                    </div>
                    <div>
                      <Text size="sm" fw={600}>{(t.admin.updates as any)[config.labelKey]}</Text>
                      <Text size="10px" c="dimmed">{ch.channel}</Text>
                    </div>
                  </Group>
                  <Badge variant="outline" size="sm">{ch.rolloutPercent}%</Badge>
                </Group>

                <Stack gap="xs" mb="md">
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">{t.admin.updates.version}</Text>
                    <Text size="xs" ff="mono" fw={600}>{ch.latestVersion}</Text>
                  </Group>
                  {ch.minVersion && (
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">{t.admin.updates.minVersion}</Text>
                      <Text size="xs" ff="mono" c="red">{ch.minVersion}</Text>
                    </Group>
                  )}
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">{t.admin.updates.published}</Text>
                    <Text size="xs">{formatDateTime(ch.publishedAt, locale)}</Text>
                  </Group>
                </Stack>

                {ch.releaseNotes && (
                  <ScrollArea.Autosize mah={120} className="p-2 rounded-lg glass-base mb-3">
                    <Text size="xs" c="dimmed" className="whitespace-pre-wrap">{ch.releaseNotes}</Text>
                  </ScrollArea.Autosize>
                )}

                <Group gap="xs" className="pt-2 border-t border-border/30">
                  <Shield size={12} className="text-success" />
                  <Text size="10px" c="dimmed" truncate>
                    {ch.bundleSignature ? `${ch.bundleSignature.slice(0, 20)}...` : t.admin.updates.noSignature}
                  </Text>
                </Group>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Info */}
      <div className="glass-base rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
        <Stack gap={2}>
          <Text size="xs" fw={600}>{t.admin.updates.safetyTitle}</Text>
          <Text size="xs" c="dimmed" className="leading-relaxed">{t.admin.updates.safetyDesc}</Text>
        </Stack>
      </div>

      <PublishDialog open={publishOpen} onOpenChange={setPublishOpen} locale={locale} onSuccess={() => qc.invalidateQueries({ queryKey: ['admin-updates'] })} />
    </div>
  )
}

function PublishDialog({ open, onOpenChange, locale, onSuccess }: any) {
  const t = getDict(locale)
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
      notifications.show({ message: t.admin.updates.versionRequired, color: 'red' })
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
        }),
      })
      if (!res.ok) throw new Error('Failed')
      notifications.show({ message: t.admin.updates.publishedToast, color: 'green' })
      onSuccess()
      onOpenChange(false)
    } catch (e) {
      notifications.show({ message: (e as Error).message, color: 'red' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal opened={open} onClose={onOpenChange} title={
      <Group gap="sm">
        <Rocket size={20} className="text-primary" />
        <Text fw={600}>{t.admin.updates.publishTitle}</Text>
      </Group>
    } size="lg">
      <Stack gap="sm">
        <Group grow>
          <Select
            label={t.admin.updates.channel}
            value={form.channel}
            onChange={(v) => setForm({ ...form, channel: v || 'stable' })}
            data={[
              { value: 'stable', label: t.admin.updates.stable },
              { value: 'beta', label: t.admin.updates.beta },
              { value: 'canary', label: t.admin.updates.canary },
            ]}
            variant="filled"
          />
          <TextInput
            label={`${t.admin.updates.version} *`}
            value={form.latestVersion}
            onChange={(e) => setForm({ ...form, latestVersion: e.target.value })}
            variant="filled"
            ff="mono"
          />
        </Group>
        <Group grow>
          <TextInput
            label={t.admin.updates.minVersion}
            value={form.minVersion}
            onChange={(e) => setForm({ ...form, minVersion: e.target.value })}
            variant="filled"
            ff="mono"
          />
          <TextInput
            label={t.admin.updates.rollout}
            type="number"
            min={0}
            max={100}
            value={form.rolloutPercent}
            onChange={(e) => setForm({ ...form, rolloutPercent: parseInt(e.target.value) })}
            variant="filled"
          />
        </Group>
        <Textarea
          label={t.admin.updates.releaseNotes}
          value={form.releaseNotes}
          onChange={(e) => setForm({ ...form, releaseNotes: e.target.value })}
          variant="filled"
          autosize
          minRows={3}
        />
        <TextInput
          label={t.admin.updates.bundleUrl}
          value={form.bundleUrl}
          onChange={(e) => setForm({ ...form, bundleUrl: e.target.value })}
          variant="filled"
        />
        <TextInput
          label={t.admin.updates.signature}
          value={form.bundleSignature}
          onChange={(e) => setForm({ ...form, bundleSignature: e.target.value })}
          variant="filled"
          ff="mono"
        />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onOpenChange}>{t.admin.updates.cancel}</Button>
          <Button onClick={handleSubmit} loading={submitting}>{t.admin.updates.publish}</Button>
        </Group>
      </Stack>
    </Modal>
  )
}
