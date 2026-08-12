'use client'

import { useApp } from '@/lib/store'
import { getDict, formatCurrency, formatDate, type Locale } from '@/lib/i18n'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Receipt, Plus, Search, Check, Clock, AlertTriangle,
  Building2, Loader2, FileDown,
} from 'lucide-react'
import { useState } from 'react'
import {
  Button, TextInput, Badge, Select, ScrollArea, Modal, Stack,
  Group, Checkbox, Text,
} from '@mantine/core'
import { StatusPill, invoiceStatusVariant } from '@/components/common/status-pill'
import { notifications } from '@mantine/notifications'

interface InvoiceList { items: any[]; total: number }

async function fetchInvoices(search: string, status: string): Promise<InvoiceList> {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (status && status !== 'all') params.set('status', status)
  params.set('limit', '100')
  const res = await fetch(`/api/invoices?${params}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

async function fetchPatients() {
  const res = await fetch('/api/patients?limit=100', { cache: 'no-store' })
  return res.json()
}

const CCAM_CODES = [
  { code: 'DQPM003', label: 'Consultation médecin généraliste', price: 25 },
  { code: 'CSCNAA01', label: 'Consultation cardiologie', price: 50 },
  { code: 'JQHP018', label: 'Électrocardiogramme (ECG)', price: 18 },
  { code: 'DDFA001', label: 'Examen dermatologique', price: 46 },
  { code: 'YHFA003', label: 'Séance kinésithérapie', price: 19 },
  { code: 'MQFA008', label: 'Consultation gynécologique', price: 46 },
  { code: 'NQFA002', label: 'Consultation pédiatrique', price: 30 },
  { code: 'DQPX004', label: 'Consultation psychiatrique', price: 39 },
  { code: 'ZQPK004', label: 'Vaccination', price: 8 },
  { code: 'QQFA006', label: 'Injection IM', price: 6 },
]

export function BillingView({ locale }: { locale: Locale }) {
  const t = getDict(locale)
  const { setSelectedPatientId, setView } = useApp()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', search, statusFilter],
    queryFn: () => fetchInvoices(search, statusFilter),
    refetchInterval: 30_000,
  })

  const { data: patientsData } = useQuery({ queryKey: ['patients-list'], queryFn: fetchPatients })

  // Compute summary stats
  const summary = (data?.items || []).reduce(
    (acc, inv) => {
      acc.total += inv.total
      if (inv.status === 'paid') acc.paid += inv.total
      else if (inv.status === 'pending' || inv.status === 'partial' || inv.status === 'overdue') acc.outstanding += inv.total - inv.paidAmount
      if (inv.status === 'overdue') acc.overdue += 1
      return acc
    },
    { total: 0, paid: 0, outstanding: 0, overdue: 0 }
  )

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label={t.billing.totalBilled} value={formatCurrency(summary.total, locale)} icon={Receipt} variant="primary" />
        <SummaryCard label={t.billing.collected} value={formatCurrency(summary.paid, locale)} icon={Check} variant="success" />
        <SummaryCard label={t.billing.outstanding} value={formatCurrency(summary.outstanding, locale)} icon={Clock} variant="warning" />
        <SummaryCard label={t.billing.overdueLabel} value={String(summary.overdue)} icon={AlertTriangle} variant="danger" />
      </div>

      {/* Filters */}
      <Group gap="sm" align="stretch" className="flex flex-col md:flex-row md:items-center">
        <TextInput
          leftSection={<Search className="w-4 h-4" />}
          placeholder={t.billing.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          variant="filled"
          className="flex-1"
        />
        <Select
          value={statusFilter}
          onChange={(v) => setStatusFilter(v || 'all')}
          data={[
            { value: 'all', label: t.common.allStatuses },
            { value: 'paid', label: t.billing.status.paid },
            { value: 'pending', label: t.billing.status.pending },
            { value: 'partial', label: t.billing.status.partial },
            { value: 'overdue', label: t.billing.status.overdue },
            { value: 'issued', label: t.billing.status.issued },
          ]}
          variant="filled"
          w={{ base: '100%', md: 200 }}
        />
        <Button onClick={() => setDialogOpen(true)} leftSection={<Plus className="w-4 h-4" />}>
          {t.billing.new}
        </Button>
      </Group>

      {/* Invoice list */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
          <div className="col-span-3 md:col-span-2">{t.billing.number}</div>
          <div className="col-span-4 md:col-span-3">{t.billing.patient}</div>
          <div className="col-span-2 hidden md:block">{t.billing.issueDate}</div>
          <div className="col-span-2 hidden md:block">{t.billing.tiersPayant}</div>
          <div className="col-span-3 md:col-span-2 text-right">{t.billing.total}</div>
          <div className="col-span-2 md:col-span-2 text-right">{t.common.status}</div>
          <div className="col-span-2 md:col-span-1 text-right">{t.common.actions}</div>
        </div>
        <ScrollArea h="60vh">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{t.common.loading}</div>
          ) : (data?.items || []).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
              {t.common.noResults}
            </div>
          ) : null}
          {!isLoading && (data?.items || []).length > 0 && (
            <AnimatePresence>
              {(data?.items || []).map((inv: any, i: number) => (
                <InvoiceRow
                  key={inv.id}
                  inv={inv}
                  i={i}
                  locale={locale}
                  t={t}
                  onClick={() => { setSelectedPatientId(inv.patientId); setView('patients') }}
                  onPaid={() => qc.invalidateQueries({ queryKey: ['invoices'] })}
                />
              ))}
            </AnimatePresence>
          )}
        </ScrollArea>
      </div>

      <InvoiceForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        locale={locale}
        patients={patientsData?.items || []}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['invoices'] })}
      />
    </div>
  )
}

function InvoiceRow({ inv, i, locale, t, onClick, onPaid }: any) {
  const [marking, setMarking] = useState(false)

  const handleMarkPaid = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setMarking(true)
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid', paymentMethod: 'card' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      notifications.show({ message: t.billing.invoicePaidToast.replace('{number}', inv.number), color: 'green' })
      onPaid()
    } catch (e) {
      notifications.show({ message: (e as Error).message, color: 'red' })
    } finally {
      setMarking(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: i * 15 }}
      onClick={onClick}
      className="w-full grid grid-cols-12 gap-3 px-4 py-3 hover:bg-accent/40 transition-colors border-b border-border/20 text-left cursor-pointer"
    >
      <div className="col-span-3 md:col-span-2">
        <p className="text-xs font-mono font-semibold">{inv.number}</p>
        <p className="text-[10px] text-muted-foreground">{inv.items?.length || 0} {t.billing.items}</p>
      </div>
      <div className="col-span-4 md:col-span-3 min-w-0">
        <p className="text-xs font-medium truncate">{inv.patient?.firstName} {inv.patient?.lastName}</p>
        <p className="text-[10px] text-muted-foreground truncate">{inv.patient?.mutuelle || '—'}</p>
      </div>
      <div className="col-span-2 hidden md:flex items-center text-xs text-muted-foreground">
        {formatDate(inv.issueDate, locale)}
      </div>
      <div className="col-span-2 hidden md:flex items-center">
        {inv.tiersPayant ? (
          <Badge variant="light" size="sm">CPAM</Badge>
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        )}
      </div>
      <div className="col-span-3 md:col-span-2 text-right">
        <p className="text-xs font-semibold tabular-nums">{formatCurrency(inv.total, locale)}</p>
        {inv.patientShare > 0 && inv.patientShare !== inv.total && (
          <p className="text-[10px] text-muted-foreground tabular-nums">
            {t.billing.patient}: {formatCurrency(inv.patientShare, locale)}
          </p>
        )}
      </div>
      <div className="col-span-3 md:col-span-2 flex items-center justify-end gap-1">
        <StatusPill
          status={inv.status}
          variant={invoiceStatusVariant(inv.status)}
          label={t.billing.status[inv.status as keyof typeof t.billing.status]}
        />
      </div>
      <div className="col-span-2 md:col-span-1 flex items-center justify-end gap-1">
        <a
          href={`/api/invoices/${inv.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded hover:bg-primary/20 text-primary transition-colors"
          title={t.billing.downloadPdf}
        >
          <FileDown className="w-3.5 h-3.5" />
        </a>
        {inv.status === 'paid' ? (
          <Check className="w-3.5 h-3.5 text-success" />
        ) : (
          <button
            onClick={handleMarkPaid}
            disabled={marking}
            className="p-1 rounded hover:bg-success/20 text-success transition-colors"
            title={t.billing.markAsPaid}
          >
            {marking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </motion.div>
  )
}

function SummaryCard({ label, value, icon: Icon, variant }: any) {
  const variantClass = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    danger: 'text-destructive bg-destructive/10',
  }[variant]
  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass-card rounded-xl p-4 flex items-center justify-between gap-3"
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums mt-1">{value}</p>
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${variantClass}`}>
        <Icon className="w-4 h-4" />
      </div>
    </motion.div>
  )
}

function InvoiceForm({ open, onOpenChange, locale, patients, onSuccess }: any) {
  const t = getDict(locale)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    patientId: '',
    items: [] as { description: string; code: string; codeType: string; quantity: number; unitPrice: number }[],
    tiersPayant: true,
    paymentMethod: 'card',
  })
  const [ccamValue, setCcamValue] = useState<string | null>(null)

  const addCcam = (code: string) => {
    const ccam = CCAM_CODES.find(c => c.code === code)
    if (!ccam) return
    setForm({
      ...form,
      items: [...form.items, {
        description: ccam.label,
        code: ccam.code,
        codeType: 'ccam',
        quantity: 1,
        unitPrice: ccam.price,
      }],
    })
    setCcamValue(null)
  }

  const removeItem = (idx: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })
  }

  const total = form.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)

  const handleSubmit = async () => {
    if (!form.patientId || form.items.length === 0) {
      notifications.show({ message: t.billing.patientItemRequiredToast, color: 'red' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed')
      notifications.show({ message: t.billing.createdToast, color: 'green' })
      onSuccess()
      onOpenChange(false)
      setForm({ patientId: '', items: [], tiersPayant: true, paymentMethod: 'card' })
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
          <Receipt className="w-5 h-5 text-primary" />
          <span>{t.billing.new}</span>
        </Group>
      }
    >
      <Stack gap="sm">
        <Text size="xs" c="dimmed">{t.billing.subtitle}</Text>

        <Select
          label={`${t.billing.patient} *`}
          placeholder="—"
          variant="filled"
          value={form.patientId}
          onChange={(v) => setForm({ ...form, patientId: v || '' })}
          data={patients.map((p: any) => ({ value: p.id, label: `${p.firstName} ${p.lastName} — ${p.mutuelle || 'CPAM'}` }))}
          searchable
        />

        <Select
          label={t.billing.ccamCodes}
          placeholder={t.billing.addItem}
          variant="filled"
          value={ccamValue}
          onChange={(v) => { if (v) addCcam(v) }}
          data={CCAM_CODES.map(c => ({ value: c.code, label: `${c.code} · ${c.label} · ${c.price}€` }))}
          searchable
        />

        {/* Items list */}
        <Stack gap={6}>
          {form.items.length === 0 ? (
            <Text size="xs" c="dimmed" className="p-3 rounded glass-base text-center">
              {t.billing.noItems}
            </Text>
          ) : (
            form.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-lg glass-base">
                <Badge variant="outline" size="sm" className="font-mono">{item.code}</Badge>
                <Text size="xs" className="flex-1 truncate">{item.description}</Text>
                <Text size="xs" className="font-mono tabular-nums">{item.unitPrice.toFixed(2)}€</Text>
                <button onClick={() => removeItem(idx)} className="text-destructive hover:text-destructive/80 text-xs">×</button>
              </div>
            ))
          )}
        </Stack>

        <div className="p-3 rounded-lg glass-base">
          <Checkbox
            checked={form.tiersPayant}
            onChange={(e) => setForm({ ...form, tiersPayant: e.currentTarget.checked })}
            label={
              <Group gap={4}>
                <Building2 className="w-3 h-3" />
                <Text size="xs">{t.billing.tiersPayant} (CPAM 70%)</Text>
              </Group>
            }
          />
        </div>

        <div className="p-3 rounded-lg glass-base space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t.billing.subtotal}</span>
            <span className="font-mono tabular-nums">{formatCurrency(total, locale)}</span>
          </div>
          {form.tiersPayant && (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t.billing.insurance} (70%)</span>
                <span className="font-mono tabular-nums text-success">-{formatCurrency(total * 0.7, locale)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t.billing.patientShare} (30%)</span>
                <span className="font-mono tabular-nums">{formatCurrency(total * 0.3, locale)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-sm font-semibold pt-1.5 border-t border-border/40">
            <span>{t.billing.total}</span>
            <span className="font-mono tabular-nums">{formatCurrency(total, locale)}</span>
          </div>
        </div>

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
