'use client'

import { useApp } from '@/lib/store'
import { getDict, formatDate, type Locale } from '@/lib/i18n'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Text, Group, Stack, Badge, Button, TextInput, Textarea, Select,
  Modal, ScrollArea, ActionIcon, CopyButton, Tooltip, LoadingOverlay,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  KeyRound, Plus, Search, Copy, Check, Ban, Play, Clock,
  AlertTriangle, Loader2, Eye,
} from 'lucide-react'
import { useState } from 'react'
import { SkeletonList } from '@/components/common/skeleton'
import { EmptyState } from '@/components/common/empty-state'

const PLAN_CONFIG = {
  trial: { color: 'gray', labelKey: 'planTrial' },
  essential: { color: 'blue', labelKey: 'planEssential' },
  professional: { color: 'cyan', labelKey: 'planProfessional' },
  enterprise: { color: 'grape', labelKey: 'planEnterprise' },
  price: 0,
}

const PLAN_PRICES: Record<string, number> = { trial: 0, essential: 49, professional: 99, enterprise: 299 }

const STATUS_CONFIG = {
  active: { color: 'green', labelKey: 'statusActive' },
  revoked: { color: 'red', labelKey: 'statusRevoked' },
  suspended: { color: 'orange', labelKey: 'statusSuspended' },
  expired: { color: 'gray', labelKey: 'statusExpired' },
}

async function fetchLicenses(search: string, status: string, plan: string) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (status && status !== 'all') params.set('status', status)
  if (plan && plan !== 'all') params.set('plan', plan)
  const res = await fetch(`/api/admin/licenses?${params}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

export function AdminLicensesView({ locale }: { locale: Locale }) {
  const t = getDict(locale)
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-licenses', search, statusFilter, planFilter],
    queryFn: () => fetchLicenses(search, statusFilter, planFilter),
    refetchInterval: 30_000,
  })

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24">
      {/* Header */}
      <Group justify="space-between" align="flex-end">
        <Stack gap={0}>
          <Text size="lg" fw={600}>{t.admin.licenses.title}</Text>
          <Text size="xs" c="dimmed">{t.admin.licenses.subtitle}</Text>
        </Stack>
        <Button leftSection={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
          {t.admin.licenses.issue}
        </Button>
      </Group>

      {/* Filters */}
      <Group gap="sm" grow>
        <TextInput
          leftSection={<Search size={16} />}
          placeholder={t.admin.licenses.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          variant="filled"
        />
        <Select
          value={statusFilter}
          onChange={(v) => setStatusFilter(v || 'all')}
          data={[
            { value: 'all', label: t.admin.licenses.allStatus },
            { value: 'active', label: t.admin.licenses.statusActive },
            { value: 'suspended', label: t.admin.licenses.statusSuspended },
            { value: 'revoked', label: t.admin.licenses.statusRevoked },
            { value: 'expired', label: t.admin.licenses.statusExpired },
          ]}
          variant="filled"
          w={{ base: '100%', md: 200 }}
        />
        <Select
          value={planFilter}
          onChange={(v) => setPlanFilter(v || 'all')}
          data={[
            { value: 'all', label: t.admin.licenses.allPlans },
            { value: 'trial', label: t.admin.licenses.planTrial },
            { value: 'essential', label: t.admin.licenses.planEssential },
            { value: 'professional', label: t.admin.licenses.planProfessional },
            { value: 'enterprise', label: t.admin.licenses.planEnterprise },
          ]}
          variant="filled"
          w={{ base: '100%', md: 200 }}
        />
      </Group>

      {/* Licenses table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
          <div className="col-span-3">{t.admin.licenses.key}</div>
          <div className="col-span-3">{t.admin.licenses.customer}</div>
          <div className="col-span-2 hidden md:block">{t.admin.licenses.plan}</div>
          <div className="col-span-2 hidden md:block">{t.admin.licenses.instances}</div>
          <div className="col-span-2 hidden md:block">{t.admin.licenses.expires}</div>
          <div className="col-span-3 md:col-span-1 text-right">{t.admin.licenses.status}</div>
          <div className="col-span-2 md:col-span-1 text-right">{t.admin.licenses.actions}</div>
        </div>
        <ScrollArea h={400}>
          {isLoading ? (
            <SkeletonList rows={6} />
          ) : (data?.items || []).length === 0 ? (
            <EmptyState icon={KeyRound} title={t.admin.licenses.noLicenses} description={t.admin.licenses.noLicensesDesc} />
          ) : (
            <AnimatePresence>
              {(data?.items || []).map((lic: any, i: number) => {
                const planCfg = PLAN_CONFIG[lic.plan as keyof typeof PLAN_CONFIG] || PLAN_CONFIG.trial
                const statusCfg = STATUS_CONFIG[lic.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active
                return (
                  <motion.div
                    key={lic.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 15 }}
                    className="grid grid-cols-12 gap-3 px-4 py-3 hover:bg-accent/30 transition-colors border-b border-border/20"
                  >
                    <div className="col-span-3 flex items-center gap-2 min-w-0">
                      <KeyRound className="w-3.5 h-3.5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <Text size="xs" ff="mono" fw={500} truncate>{lic.licenseKey.slice(0, 20)}...</Text>
                        <CopyButton value={lic.licenseKey} timeout={2000}>
                          {({ copied, copy }) => (
                            <button
                              onClick={copy}
                              className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5"
                            >
                              {copied ? <Check size={10} /> : <Copy size={10} />}
                              {copied ? t.admin.licenses.copied : t.admin.licenses.copy}
                            </button>
                          )}
                        </CopyButton>
                      </div>
                    </div>
                    <div className="col-span-3 min-w-0">
                      <Text size="xs" fw={500} truncate>{lic.customerName}</Text>
                      <Text size="xs" c="dimmed" truncate>{lic.customerEmail}</Text>
                    </div>
                    <div className="col-span-2 hidden md:flex items-center">
                      <Badge color={planCfg.color} variant="light" size="sm">
                        {(t.admin.licenses as any)[planCfg.labelKey]} · {PLAN_PRICES[lic.plan] || 0}€{t.admin.licenses.perMonth}
                      </Badge>
                    </div>
                    <div className="col-span-2 hidden md:flex items-center text-xs">
                      <span className="font-mono">{lic._count?.instances || 0}</span>
                      <span className="text-muted-foreground ml-1">/ {lic.maxDevices}</span>
                    </div>
                    <div className="col-span-2 hidden md:flex items-center text-[11px] text-muted-foreground">
                      {formatDate(lic.expiresAt, locale)}
                    </div>
                    <div className="col-span-3 md:col-span-1 flex items-center justify-end">
                      <Badge color={statusCfg.color} variant="light" size="sm">
                        {(t.admin.licenses as any)[statusCfg.labelKey]}
                      </Badge>
                    </div>
                    <div className="col-span-2 md:col-span-1 flex items-center justify-end">
                      <Tooltip label={t.admin.licenses.details}>
                        <ActionIcon variant="subtle" onClick={() => setDetailId(lic.id)}>
                          <Eye size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </ScrollArea>
      </div>

      <CreateLicenseDialog open={createOpen} onOpenChange={setCreateOpen} locale={locale} onSuccess={() => qc.invalidateQueries({ queryKey: ['admin-licenses'] })} />
      {detailId && <LicenseDetailDialog id={detailId} onClose={() => setDetailId(null)} locale={locale} onChanged={() => qc.invalidateQueries({ queryKey: ['admin-licenses'] })} />}
    </div>
  )
}

function CreateLicenseDialog({ open, onOpenChange, locale, onSuccess }: any) {
  const t = getDict(locale)
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerOrg: '',
    customerCountry: 'FR',
    plan: 'professional',
    durationDays: 365,
    maxDevices: 3,
    maxPractitioners: 15,
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!form.customerName || !form.customerEmail) {
      notifications.show({ title: t.common.error || 'Error', message: t.admin.licenses.customerName + ' + ' + t.admin.licenses.customerEmail, color: 'red' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          modules: ['scheduling', 'ehr', 'billing', 'prescriptions', 'labs', 'documents', 'telemedicine', 'audit', 'inventory', 'triage', 'sustainability', 'ai_scribe'],
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const license = await res.json()
      setCreatedKey(license.licenseKey)
      notifications.show({ title: t.admin.licenses.issued, message: license.licenseKey, color: 'green' })
      onSuccess()
    } catch (e) {
      notifications.show({ title: t.common.error || 'Error', message: (e as Error).message, color: 'red' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal opened={open} onClose={() => { setCreatedKey(null); onOpenChange(false) }} title={
      <Group gap="sm">
        <KeyRound size={20} className="text-primary" />
        <Text fw={600}>{t.admin.licenses.issueTitle}</Text>
      </Group>
    } size="lg">
      {createdKey ? (
        <Stack align="center" py="md">
          <div className="w-16 h-16 rounded-2xl bg-success/15 flex items-center justify-center">
            <Check className="w-8 h-8 text-success" />
          </div>
          <Text fw={600} size="lg">{t.admin.licenses.issued}</Text>
          <Text size="sm" c="dimmed" ta="center">{t.admin.licenses.communicate}</Text>
          <div className="p-3 rounded-lg glass-base font-mono text-sm break-all w-full">{createdKey}</div>
          <CopyButton value={createdKey} timeout={2000}>
            {({ copied, copy }) => (
              <Button onClick={copy} leftSection={copied ? <Check size={16} /> : <Copy size={16} />}>
                {t.admin.licenses.copyKey}
              </Button>
            )}
          </CopyButton>
        </Stack>
      ) : (
        <Stack gap="sm">
          <TextInput
            label={`${t.admin.licenses.customerName} *`}
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            variant="filled"
          />
          <Group grow>
            <TextInput
              label={`${t.admin.licenses.customerEmail} *`}
              type="email"
              value={form.customerEmail}
              onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
              variant="filled"
            />
            <TextInput
              label={t.admin.licenses.customerOrg}
              value={form.customerOrg}
              onChange={(e) => setForm({ ...form, customerOrg: e.target.value })}
              variant="filled"
            />
          </Group>
          <Group grow>
            <Select
              label={t.admin.licenses.plan}
              value={form.plan}
              onChange={(v) => {
                const config = PLAN_CONFIG[v as keyof typeof PLAN_CONFIG]
                setForm({
                  ...form,
                  plan: v || 'professional',
                  maxDevices: v === 'trial' ? 1 : v === 'essential' ? 1 : v === 'professional' ? 3 : 10,
                  maxPractitioners: v === 'trial' ? 3 : v === 'essential' ? 5 : v === 'professional' ? 15 : 100,
                })
              }}
              data={[
                { value: 'trial', label: `${t.admin.licenses.planTrial} (0€)` },
                { value: 'essential', label: `${t.admin.licenses.planEssential} (49€)` },
                { value: 'professional', label: `${t.admin.licenses.planProfessional} (99€)` },
                { value: 'enterprise', label: `${t.admin.licenses.planEnterprise} (299€)` },
              ]}
              variant="filled"
            />
            <TextInput
              label={t.admin.licenses.duration}
              type="number"
              value={form.durationDays}
              onChange={(e) => setForm({ ...form, durationDays: parseInt(e.target.value) })}
              variant="filled"
            />
          </Group>
          <Group grow>
            <TextInput
              label={t.admin.licenses.maxDevices}
              type="number"
              value={form.maxDevices}
              onChange={(e) => setForm({ ...form, maxDevices: parseInt(e.target.value) })}
              variant="filled"
            />
            <TextInput
              label={t.admin.licenses.maxPractitioners}
              type="number"
              value={form.maxPractitioners}
              onChange={(e) => setForm({ ...form, maxPractitioners: parseInt(e.target.value) })}
              variant="filled"
            />
          </Group>
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => onOpenChange(false)}>{t.admin.licenses.cancel}</Button>
            <Button onClick={handleSubmit} loading={submitting}>{t.admin.licenses.issue}</Button>
          </Group>
        </Stack>
      )}
    </Modal>
  )
}

function LicenseDetailDialog({ id, onClose, locale, onChanged }: any) {
  const t = getDict(locale)
  const qc = useQueryClient()
  const [acting, setActing] = useState<string | null>(null)
  const [togglingFlag, setTogglingFlag] = useState<string | null>(null)

  const { data: license, isLoading } = useQuery({
    queryKey: ['admin-license', id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/licenses/${id}`, { cache: 'no-store' })
      return res.json()
    },
  })

  const toggleFeatureFlag = async (flagId: string, enabled: boolean) => {
    setTogglingFlag(flagId)
    try {
      const res = await fetch(`/api/admin/feature-flags/${flagId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      if (!res.ok) throw new Error('Failed')
      notifications.show({
        message: `${enabled ? t.admin.licenses.moduleEnabled : t.admin.licenses.moduleDisabled}`,
        color: 'green',
      })
      qc.invalidateQueries({ queryKey: ['admin-license', id] })
    } catch (e) {
      notifications.show({ message: (e as Error).message, color: 'red' })
    } finally {
      setTogglingFlag(null)
    }
  }

  const doAction = async (action: string, extra?: any) => {
    setActing(action)
    try {
      const res = await fetch(`/api/admin/licenses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      if (!res.ok) throw new Error('Failed')
      notifications.show({ message: action, color: 'green' })
      onChanged()
      qc.invalidateQueries({ queryKey: ['admin-license', id] })
    } catch (e) {
      notifications.show({ message: (e as Error).message, color: 'red' })
    } finally {
      setActing(null)
    }
  }

  return (
    <Modal opened={true} onClose={onClose} size="xl">
      <LoadingOverlay visible={isLoading} />
      {license && (
        <Stack gap="md">
          {/* Header */}
          <Group justify="space-between">
            <Group>
              <KeyRound size={20} className="text-primary" />
              <div>
                <Text fw={600}>{license.customerName}</Text>
                <Text size="xs" ff="mono" c="dimmed">{license.licenseKey}</Text>
              </div>
            </Group>
            <Group gap="xs">
              <Badge color={STATUS_CONFIG[license.status as keyof typeof STATUS_CONFIG]?.color || 'gray'} variant="light">
                {(t.admin.licenses as any)[STATUS_CONFIG[license.status as keyof typeof STATUS_CONFIG]?.labelKey || 'statusActive']}
              </Badge>
              <Badge color={PLAN_CONFIG[license.plan as keyof typeof PLAN_CONFIG]?.color || 'gray'} variant="light">
                {(t.admin.licenses as any)[PLAN_CONFIG[license.plan as keyof typeof PLAN_CONFIG]?.labelKey || 'planProfessional']}
              </Badge>
            </Group>
          </Group>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoBox label={t.admin.licenses.customerEmail} value={license.customerEmail} />
            <InfoBox label={t.admin.licenses.country} value={license.customerCountry} />
            <InfoBox label={t.admin.licenses.maxDevices} value={String(license.maxDevices)} mono />
            <InfoBox label={t.admin.licenses.maxPractitioners} value={String(license.maxPractitioners)} mono />
            <InfoBox label={t.admin.licenses.issuedAt} value={formatDate(license.issuedAt, locale)} />
            <InfoBox label={t.admin.licenses.expires} value={formatDate(license.expiresAt, locale)} />
          </div>

          {/* Instances */}
          {license.instances?.length > 0 && (
            <Stack gap="xs">
              <Text size="xs" fw={600} c="dimmed" tt="uppercase">{t.admin.licenses.instances} ({license.instances.length})</Text>
              {license.instances.map((inst: any) => (
                <Group key={inst.id} gap="sm" className="p-2 rounded-lg glass-base">
                  <div className={`w-2 h-2 rounded-full ${inst.status === 'active' ? 'bg-success' : inst.status === 'blocked' ? 'bg-destructive' : 'bg-muted-foreground'}`} />
                  <Text size="xs" className="flex-1 truncate">{inst.hostname || 'Unknown'}</Text>
                  <Text size="xs" ff="mono" c="dimmed">{inst.appVersion}</Text>
                  <Text size="xs" c="dimmed">{formatDate(inst.lastSeenAt, locale)}</Text>
                </Group>
              ))}
            </Stack>
          )}

          {/* Feature flags */}
          {license.featureFlags?.length > 0 && (
            <Stack gap="xs">
              <Text size="xs" fw={600} c="dimmed" tt="uppercase">{t.admin.licenses.modules}</Text>
              <Group gap="xs">
                {license.featureFlags.map((f: any) => (
                  <button
                    key={f.id}
                    onClick={() => toggleFeatureFlag(f.id, !f.enabled)}
                    disabled={togglingFlag === f.id}
                    className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
                      f.enabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {togglingFlag === f.id ? '...' : f.flagKey}
                  </button>
                ))}
              </Group>
            </Stack>
          )}

          {/* Actions */}
          <Group gap="xs" className="pt-2 border-t border-border/30">
            {license.status === 'active' && (
              <>
                <Button variant="default" size="xs" onClick={() => doAction('extend', { days: 30 })} loading={acting === 'extend'} leftSection={<Clock size={14} />}>
                  {t.admin.licenses.extend}
                </Button>
                <Button variant="default" size="xs" onClick={() => doAction('suspend')} loading={acting === 'suspend'} leftSection={<Ban size={14} />}>
                  {t.admin.licenses.suspend}
                </Button>
                <Button variant="filled" color="red" size="xs" onClick={() => doAction('revoke', { reason: 'Revoked by admin' })} loading={acting === 'revoke'} leftSection={<AlertTriangle size={14} />}>
                  {t.admin.licenses.revoke}
                </Button>
              </>
            )}
            {(license.status === 'suspended' || license.status === 'revoked' || license.status === 'expired') && (
              <Button size="xs" onClick={() => doAction('reactivate')} loading={acting === 'reactivate'} leftSection={<Play size={14} />}>
                {t.admin.licenses.reactivate}
              </Button>
            )}
          </Group>
        </Stack>
      )}
    </Modal>
  )
}

function InfoBox({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="p-3 rounded-lg glass-base">
      <Text size="10px" fw={600} c="dimmed" tt="uppercase">{label}</Text>
      <Text size="sm" ff={mono ? 'mono' : 'sans'} className="truncate">{value}</Text>
    </div>
  )
}
