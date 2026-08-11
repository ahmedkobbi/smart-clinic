'use client'

import { useApp } from '@/lib/store'
import { getDict, formatDate, formatDateTime, type Locale } from '@/lib/i18n'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Upload, Search, FileImage, FileCheck, Pill, FileSpreadsheet,
  File, Loader2, Download, Trash2, Filter,
} from 'lucide-react'
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EmptyState } from '@/components/common/empty-state'
import { SkeletonList } from '@/components/common/skeleton'
import { toast } from 'sonner'

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
      <div className="flex flex-col md:flex-row gap-3 items-stretch">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.documents.searchPlaceholder}
            className="pl-10 glass-base border-0 h-11"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full md:w-48 glass-base border-0 h-11">
            <Filter className="w-3.5 h-3.5 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass-floating">
            <SelectItem value="all">{t.common.allCategories}</SelectItem>
            {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label[locale as 'fr' | 'en']}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setUploadOpen(true)} className="bg-primary text-primary-foreground h-11">
          <Upload className="w-4 h-4" /> {t.documents.upload}
        </Button>
      </div>

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
                    <Badge variant="outline" className="text-[9px]">{config.label[locale as 'fr' | 'en']}</Badge>
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  const handleUpload = async () => {
    if (!patientId || !file) {
      toast.error(t.documents.patientFileRequiredToast)
      return
    }
    setUploading(true)
    try {
      // Read file as base64
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
        toast.success(t.documents.uploadedToast)
        onSuccess()
        onOpenChange(false)
        setFile(null)
        setDescription('')
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
      reader.readAsDataURL(file)
    } catch (e) {
      toast.error((e as Error).message)
      setUploading(false)
    }
  }

  return (
    <motion.div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${open ? '' : 'hidden'}`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-floating rounded-2xl w-full max-w-md p-6 relative z-10"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          {t.documents.uploadTitle}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t.billing.patient}</label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full mt-1 h-10 px-3 rounded-md glass-base border-0 text-sm"
            >
              <option value="">—</option>
              {patients.map((p: any) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t.documents.category}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full mt-1 h-10 px-3 rounded-md glass-base border-0 text-sm"
            >
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label[locale as 'fr' | 'en']}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t.documents.file}</label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFile}
              className="w-full mt-1 text-sm"
            />
            {file && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t.documents.description}</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="glass-base border-0 mt-1"
              placeholder="..."
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button onClick={handleUpload} disabled={uploading || !file || !patientId}>
            {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t.documents.upload}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
