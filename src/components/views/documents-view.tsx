'use client'

import { useApp } from '@/lib/store'
import { getDict, formatDate, type Locale } from '@/lib/i18n'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Upload, Search, FileImage, FileCheck, Pill, FileSpreadsheet,
  File, Loader2, Download, Trash2, Filter,
} from 'lucide-react'
import { useState, useRef } from 'react'
import {
  Button, TextInput, Badge, Select, ScrollArea, Group, Modal,
  Stack, FileInput,
} from '@mantine/core'
import { EmptyState } from '@/components/common/empty-state'
import { SkeletonList } from '@/components/common/skeleton'
import { notifications } from '@mantine/notifications'

const CATEGORY_CONFIG = {
  lab_report: { icon: FileSpreadsheet, color: 'text-info bg-info/10', label: { fr: 'Résultat labo', en: 'Lab report' } },
  imaging: { icon: FileImage, color: 'text-glass-accent bg-glass-accent/10', label: { fr: 'Imagerie', en: 'Imaging' } },
  consent_form: { icon: FileCheck, color: 'text-success bg-success/10', label: { fr: 'Consentement', en: 'Consent' } },
  prescription: { icon: Pill, color: 'text-primary bg-primary/10', label: { fr: 'Ordonnance', en: 'Prescription' } },
  referral: { icon: FileText, color: 'text-warning bg-warning/10', label: { fr: 'Orientation', en: 'Referral' } },
  other: { icon: File, color: 'text-muted-foreground bg-muted', label: { fr: 'Autre', en: 'Other' } },
}

async function fetchDocuments(category: string, patientId?: string) {
  const params = new URLSearchParams()
  if (category && category !== 'all') params.set('category', category)
  if (patientId) params.set('patientId', patientId)
  const res = await fetch(`/api/documents?${params}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

async function fetchPatients() {
  const res = await fetch('/api/patients?limit=100', { cache: 'no-store' })
  return res.json()
}

export function DocumentsView({ locale }: { locale: Locale }) {
  const t = getDict(locale)
  const qc = useQueryClient()
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['documents', category, selectedPatientId],
    queryFn: () => fetchDocuments(category, selectedPatientId || undefined),
    refetchInterval: 30_000,
  })
  const { data: patientsData } = useQuery({ queryKey: ['patients-list'], queryFn: fetchPatients })

  const filtered = (data?.items || []).filter((d: any) => {
    if (!search) return true
    const s = search.toLowerCase()
    return d.name.toLowerCase().includes(s) || d.patient?.firstName?.toLowerCase().includes(s) || d.patient?.lastName?.toLowerCase().includes(s)
  })

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24">
      {/* Filters */}
      <Group gap="sm" align="stretch" className="flex flex-col md:flex-row">
        <TextInput
          leftSection={<Search className="w-4 h-4" />}
          placeholder={t.documents.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          variant="filled"
          className="flex-1"
        />
        <Select
          value={category}
          onChange={(v) => setCategory(v || 'all')}
          data={[
            { value: 'all', label: t.common.allCategories },
            ...Object.entries(CATEGORY_CONFIG).map(([k, v]) => ({ value: k, label: v.label[locale as 'fr' | 'en'] })),
          ]}
          variant="filled"
          w={{ base: '100%', md: 220 }}
          leftSection={<Filter className="w-3.5 h-3.5" />}
        />
        <Button onClick={() => setUploadOpen(true)} leftSection={<Upload className="w-4 h-4" />}>
          {t.documents.upload}
        </Button>
      </Group>

      {/* Document grid */}
      {isLoading ? (
        <SkeletonList rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t.documents.noDocuments}
          description={t.documents.noDocumentsDesc}
          action={{ label: t.documents.upload, onClick: () => setUploadOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {filtered.map((doc: any, i: number) => {
              const config = CATEGORY_CONFIG[doc.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.other
              const Icon = config.icon
              return (
                <motion.div
                  key={doc.id}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 20 }}
                  className="glass-card rounded-2xl p-4"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {doc.patient?.firstName} {doc.patient?.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-3">
                    <Badge variant="outline" size="sm">{config.label[locale as 'fr' | 'en']}</Badge>
                    <span>{formatDate(doc.uploadedAt, locale)}</span>
                  </div>
                  {doc.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">{doc.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {(doc.sizeBytes / 1024).toFixed(0)} KB
                    </span>
                    <div className="flex gap-1">
                      <button className="p-1 rounded hover:bg-accent/50 text-muted-foreground hover:text-primary transition-colors" title="Download">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        locale={locale}
        patients={patientsData?.items || []}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['documents'] })}
      />
    </div>
  )
}

function UploadDialog({ open, onOpenChange, locale, patients, onSuccess }: any) {
  const t = getDict(locale)
  const [patientId, setPatientId] = useState('')
  const [category, setCategory] = useState('lab_report')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async () => {
    if (!patientId || !file) {
      notifications.show({ message: t.documents.patientFileRequiredToast, color: 'red' })
      return
    }
    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1]
        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            name: file.name,
            category,
            mimeType: file.type,
            sizeBytes: file.size,
            content: base64,
            description,
            uploadedBy: 'Current User',
          }),
        })
        if (!res.ok) throw new Error('Upload failed')
        notifications.show({ message: t.documents.uploadedToast, color: 'green' })
        onSuccess()
        onOpenChange(false)
        setFile(null)
        setDescription('')
      }
      reader.readAsDataURL(file)
    } catch (e) {
      notifications.show({ message: (e as Error).message, color: 'red' })
      setUploading(false)
    }
  }

  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={
        <Group gap="sm">
          <Upload className="w-5 h-5 text-primary" />
          <span>{t.documents.uploadTitle}</span>
        </Group>
      }
    >
      <Stack gap="sm">
        <Select
          label={t.billing.patient}
          variant="filled"
          value={patientId}
          onChange={(v) => setPatientId(v || '')}
          data={patients.map((p: any) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` }))}
          placeholder="—"
          searchable
        />
        <Select
          label={t.documents.category}
          variant="filled"
          value={category}
          onChange={(v) => setCategory(v || 'lab_report')}
          data={Object.entries(CATEGORY_CONFIG).map(([k, v]) => ({ value: k, label: v.label[locale as 'fr' | 'en'] }))}
        />
        <FileInput
          label={t.documents.file}
          placeholder={t.documents.file}
          value={file}
          onChange={(f) => setFile(f)}
        />
        <TextInput
          label={t.documents.description}
          variant="filled"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="..."
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button onClick={handleUpload} disabled={uploading || !file || !patientId} loading={uploading}>
            {t.documents.upload}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
