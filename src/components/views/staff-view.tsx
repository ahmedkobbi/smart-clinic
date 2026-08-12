'use client'

import { useApp } from '@/lib/store'
import { getDict, formatDate, type Locale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Users, Award, AlertTriangle, Clock, ShieldCheck, IdCard,
  GraduationCap, Stethoscope, Heart,
} from 'lucide-react'
import { useState } from 'react'
import { Select, ScrollArea } from '@mantine/core'
import { SkeletonList, SkeletonCard } from '@/components/common/skeleton'
import { StatCard } from '@/components/common/stat-card'

async function fetchCredentials() {
  const res = await fetch('/api/credentials', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

async function fetchStaff() {
  const res = await fetch('/api/settings?section=staff', { cache: 'no-store' })
  return res.json()
}

const CRED_TYPE_ICONS = {
  rpps: IdCard,
  adeli: IdCard,
  medical_degree: GraduationCap,
  cpr: Heart,
  specialty_board: Stethoscope,
  insurance: ShieldCheck,
}

const STATUS_CONFIG = {
  valid: { color: 'text-success bg-success/10', label: { fr: 'Valide', en: 'Valid' } },
  expiring_soon: { color: 'text-warning bg-warning/10', label: { fr: 'Expire bientôt', en: 'Expiring soon' } },
  expired: { color: 'text-destructive bg-destructive/10', label: { fr: 'Expiré', en: 'Expired' } },
  revoked: { color: 'text-destructive bg-destructive/10', label: { fr: 'Révoqué', en: 'Revoked' } },
}

const CRED_TYPE_LABELS = {
  rpps: { fr: 'RPPS', en: 'RPPS' },
  adeli: { fr: 'ADELI', en: 'ADELI' },
  medical_degree: { fr: 'Diplôme de médecine', en: 'Medical degree' },
  cpr: { fr: 'Secourisme', en: 'CPR' },
  specialty_board: { fr: 'DESC de spécialité', en: 'Specialty board' },
  insurance: { fr: 'Assurance pro', en: 'Professional insurance' },
}

export function StaffView({ locale }: { locale: Locale }) {
  const t = getDict(locale)
  const [statusFilter, setStatusFilter] = useState('all')

  const { data: credData, isLoading } = useQuery({
    queryKey: ['credentials'],
    queryFn: fetchCredentials,
    refetchInterval: 60_000,
  })
  const { data: staffData } = useQuery({ queryKey: ['staff'], queryFn: fetchStaff })

  const credentials = (credData?.items || []).filter((c: any) => {
    if (statusFilter === 'all') return true
    return c.status === statusFilter
  })

  const stats = (credData?.items || []).reduce((acc: any, c: any) => {
    acc.total++
    if (c.status === 'valid') acc.valid++
    else if (c.status === 'expiring_soon') acc.expiring++
    else if (c.status === 'expired') acc.expired++
    return acc
  }, { total: 0, valid: 0, expiring: 0, expired: 0 })

  const practitioners = staffData?.practitioners || []

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t.settings.practitioners} value={practitioners.length} icon={Users} accent="primary" delay={0} />
        <StatCard label={t.staff.credentials} value={stats.total} icon={Award} accent="info" delay={50} />
        <StatCard label={t.staff.expiringSoon} value={stats.expiring} icon={Clock} accent="warning" delay={100} />
        <StatCard label={t.staff.expired} value={stats.expired} icon={AlertTriangle} accent="warning" delay={150} />
      </div>

      {/* Practitioners grid */}
      <div>
        <h3 className="text-sm font-semibold mb-3">{t.staff.medicalTeam}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {practitioners.map((p: any, i: number) => {
            const practitionerCreds = (credData?.items || []).filter((c: any) => c.practitionerId === p.id)
            const expired = practitionerCreds.filter((c: any) => c.status === 'expired').length
            const expiring = practitionerCreds.filter((c: any) => c.status === 'expiring_soon').length
            return (
              <motion.div
                key={p.id}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 30 }}
                className="glass-card rounded-2xl p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0"
                    style={{ background: `${p.color}30`, color: p.color }}
                  >
                    {p.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">{p.specialty}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {expired > 0 && (
                    <span className="status-pill text-destructive text-[10px]">
                      {expired} {t.staff.expiredPlural}
                    </span>
                  )}
                  {expiring > 0 && (
                    <span className="status-pill text-warning text-[10px]">
                      {expiring} {t.staff.toRenew}
                    </span>
                  )}
                  {expired === 0 && expiring === 0 && (
                    <span className="status-pill text-success text-[10px]">{t.staff.upToDate}</span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Credentials table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">{t.staff.credentialTracking}</h3>
          <Select
            value={statusFilter}
            onChange={(v) => setStatusFilter(v || 'all')}
            data={[
              { value: 'all', label: t.common.all },
              { value: 'valid', label: STATUS_CONFIG.valid.label[locale as 'fr' | 'en'] },
              { value: 'expiring_soon', label: STATUS_CONFIG.expiring_soon.label[locale as 'fr' | 'en'] },
              { value: 'expired', label: STATUS_CONFIG.expired.label[locale as 'fr' | 'en'] },
            ]}
            variant="filled"
            w={160}
          />
        </div>
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
            <div className="col-span-3">{t.appointments.practitioner}</div>
            <div className="col-span-3">{t.common.type}</div>
            <div className="col-span-2 hidden md:block">{t.staff.number}</div>
            <div className="col-span-2 hidden md:block">{t.staff.expires}</div>
            <div className="col-span-3 md:col-span-2 text-right">{t.common.status}</div>
          </div>
          <ScrollArea h="40vh">
            {isLoading ? (
              <SkeletonList rows={6} />
            ) : (
              credentials.map((c: any, i: number) => {
                const Icon = CRED_TYPE_ICONS[c.type as keyof typeof CRED_TYPE_ICONS] || Award
                const config = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.valid
                const daysToExpiry = c.expiresAt ? Math.floor((new Date(c.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 8 }}
                    className={`grid grid-cols-12 gap-3 px-4 py-3 hover:bg-accent/30 transition-colors border-b border-border/20 ${c.status === 'expired' ? 'bg-destructive/5' : c.status === 'expiring_soon' ? 'bg-warning/5' : ''}`}
                  >
                    <div className="col-span-3 flex items-center gap-2 min-w-0">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs truncate">{c.practitioner?.name || '—'}</span>
                    </div>
                    <div className="col-span-3 flex items-center">
                      <span className="text-xs">{CRED_TYPE_LABELS[c.type as keyof typeof CRED_TYPE_LABELS]?.[locale as 'fr' | 'en'] || c.type}</span>
                    </div>
                    <div className="col-span-2 hidden md:flex items-center">
                      <code className="text-[10px] font-mono text-muted-foreground truncate">{c.number || '—'}</code>
                    </div>
                    <div className="col-span-2 hidden md:flex items-center text-xs text-muted-foreground">
                      {c.expiresAt ? (
                        <span className={daysToExpiry !== null && daysToExpiry < 90 ? 'text-warning' : daysToExpiry !== null && daysToExpiry < 0 ? 'text-destructive' : ''}>
                          {formatDate(c.expiresAt, locale)}
                          {daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry < 90 && (
                            <span className="text-[10px] ml-1">({daysToExpiry}j)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[10px]">∞</span>
                      )}
                    </div>
                    <div className="col-span-3 md:col-span-2 flex items-center justify-end">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.color}`}>
                        {config.label[locale as 'fr' | 'en']}
                      </span>
                    </div>
                  </motion.div>
                )
              })
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
