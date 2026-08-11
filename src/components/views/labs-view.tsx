'use client'

import { useApp } from '@/lib/store'
import { getDict, formatDate, type Locale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  FlaskConical, Search, AlertTriangle, TrendingUp, TrendingDown,
  ArrowUp, ArrowDown, Activity,
} from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EmptyState } from '@/components/common/empty-state'
import { SkeletonList } from '@/components/common/skeleton'
import { StatCard } from '@/components/common/stat-card'

async function fetchLabs(category: string, abnormalOnly: boolean) {
  const params = new URLSearchParams()
  if (category && category !== 'all') params.set('category', category)
  if (abnormalOnly) params.set('abnormal', 'true')
  const res = await fetch(`/api/labs?${params}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

const FLAG_CONFIG = {
  normal: { color: 'text-success bg-success/10', border: 'border-success/30', icon: null, label: { fr: 'Normal', en: 'Normal' } },
  low: { color: 'text-info bg-info/10', border: 'border-info/30', icon: ArrowDown, label: { fr: 'Bas', en: 'Low' } },
  high: { color: 'text-warning bg-warning/10', border: 'border-warning/30', icon: ArrowUp, label: { fr: 'Élevé', en: 'High' } },
  critical: { color: 'text-destructive bg-destructive/10', border: 'border-destructive/40', icon: AlertTriangle, label: { fr: 'Critique', en: 'Critical' } },
}

const CATEGORY_LABELS = {
  hematology: { fr: 'Hématologie', en: 'Hematology' },
  biochemistry: { fr: 'Biochimie', en: 'Biochemistry' },
  microbiology: { fr: 'Microbiologie', en: 'Microbiology' },
  endocrinology: { fr: 'Endocrinologie', en: 'Endocrinology' },
  general: { fr: 'Général', en: 'General' },
}

export function LabsView({ locale }: { locale: Locale }) {
  const t = getDict(locale)
  const { setSelectedPatientId, setView } = useApp()
  const [category, setCategory] = useState('all')
  const [abnormalOnly, setAbnormalOnly] = useState(false)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['labs', category, abnormalOnly],
    queryFn: () => fetchLabs(category, abnormalOnly),
    refetchInterval: 30_000,
  })

  const filtered = (data?.items || []).filter((r: any) => {
    if (!search) return true
    const s = search.toLowerCase()
    return r.testName.toLowerCase().includes(s) || r.patient?.firstName?.toLowerCase().includes(s) || r.patient?.lastName?.toLowerCase().includes(s)
  })

  const stats = (data?.items || []).reduce((acc: any, r: any) => {
    acc.total++
    if (r.flag === 'normal') acc.normal++
    else if (r.flag === 'critical') acc.critical++
    else acc.abnormal++
    return acc
  }, { total: 0, normal: 0, abnormal: 0, critical: 0 })

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t.labs.totalResults} value={stats.total} icon={FlaskConical} accent="primary" delay={0} />
        <StatCard label={t.labs.normal} value={stats.normal} icon={Activity} accent="success" delay={50} />
        <StatCard label={t.labs.abnormal} value={stats.abnormal} icon={TrendingUp} accent="warning" delay={100} />
        <StatCard label={t.labs.critical} value={stats.critical} icon={AlertTriangle} accent="warning" delay={150} />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.labs.searchPlaceholder}
            className="pl-10 glass-base border-0 h-11"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full md:w-48 glass-base border-0 h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass-floating">
            <SelectItem value="all">{t.common.allCategories}</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v[locale as 'fr' | 'en']}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          onClick={() => setAbnormalOnly(!abnormalOnly)}
          className={`px-4 h-11 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${abnormalOnly ? 'bg-destructive text-destructive-foreground' : 'glass-base'}`}
        >
          <AlertTriangle className="w-4 h-4" />
          {t.labs.abnormalOnly}
        </button>
      </div>

      {/* Lab results table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
          <div className="col-span-3">{t.labs.test}</div>
          <div className="col-span-2">{t.billing.patient}</div>
          <div className="col-span-2 text-right">{t.common.value}</div>
          <div className="col-span-2 hidden md:block">{t.labs.reference}</div>
          <div className="col-span-2 hidden md:block">{t.common.date}</div>
          <div className="col-span-3 md:col-span-1 text-right">{t.labs.flag}</div>
        </div>
        <ScrollArea className="h-[55vh]">
          {isLoading ? (
            <SkeletonList rows={8} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title={t.labs.noResultsTitle}
              description={t.labs.noResultsDesc}
            />
          ) : (
            filtered.map((r: any, i: number) => {
              const config = FLAG_CONFIG[r.flag as keyof typeof FLAG_CONFIG] || FLAG_CONFIG.normal
              const Icon = config.icon
              const isAbnormal = r.flag !== 'normal'
              return (
                <motion.button
                  key={r.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 8 }}
                  onClick={() => { setSelectedPatientId(r.patientId); setView('patients') }}
                  className={`w-full grid grid-cols-12 gap-3 px-4 py-3 hover:bg-accent/30 transition-colors border-b border-border/20 text-left ${r.flag === 'critical' ? 'bg-destructive/5' : ''}`}
                >
                  <div className="col-span-3">
                    <p className="text-xs font-medium truncate">{r.testName}</p>
                    <p className="text-[10px] text-muted-foreground">{CATEGORY_LABELS[r.category as keyof typeof CATEGORY_LABELS]?.[locale as 'fr' | 'en'] || r.category}</p>
                  </div>
                  <div className="col-span-2 min-w-0">
                    <p className="text-xs truncate">{r.patient?.firstName} {r.patient?.lastName}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className={`text-sm font-mono font-semibold tabular-nums ${isAbnormal ? config.color.split(' ')[0] : ''}`}>
                      {r.value}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{r.unit}</p>
                  </div>
                  <div className="col-span-2 hidden md:flex items-center text-[11px] text-muted-foreground font-mono">
                    {r.refRangeLow != null && r.refRangeHigh != null
                      ? `${r.refRangeLow} - ${r.refRangeHigh}`
                      : '—'}
                  </div>
                  <div className="col-span-2 hidden md:flex items-center text-[11px] text-muted-foreground">
                    {formatDate(r.collectedAt, locale)}
                  </div>
                  <div className="col-span-3 md:col-span-1 flex items-center justify-end">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.color}`}>
                      {Icon && <Icon className="w-3 h-3" />}
                      {config.label[locale as 'fr' | 'en']}
                    </span>
                  </div>
                </motion.button>
              )
            })
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
