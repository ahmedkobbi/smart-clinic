'use client'

import { useApp } from '@/lib/store'
import { getDict, type Locale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Building2, MapPin, Users, Stethoscope, Boxes, Palette, Globe,
  Moon, Sun, Languages, Check,
} from 'lucide-react'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

async function fetchSettings(section: string) {
  const res = await fetch(`/api/settings?section=${section}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

export function SettingsView({ locale }: { locale: Locale }) {
  const t = getDict(locale)
  const { density, setDensity, theme, setTheme, setLocale } = useApp()

  const { data: tenantData } = useQuery({ queryKey: ['settings', 'tenant'], queryFn: () => fetchSettings('tenant') })
  const { data: staffData } = useQuery({ queryKey: ['settings', 'staff'], queryFn: () => fetchSettings('staff') })
  const { data: resData } = useQuery({ queryKey: ['settings', 'resources'], queryFn: () => fetchSettings('resources') })

  const tenant = tenantData?.tenant
  const branches = tenantData?.branches || []
  const practitioners = staffData?.practitioners || []
  const users = staffData?.users || []
  const resources = resData?.resources || []

  return (
    <div className="p-4 md:p-6 pb-24">
      <Tabs defaultValue="tenant" className="space-y-4">
        <TabsList className="glass-base">
          <TabsTrigger value="tenant">
            <Building2 className="w-3.5 h-3.5 mr-1.5" />
            {t.settings.tenant}
          </TabsTrigger>
          <TabsTrigger value="staff">
            <Users className="w-3.5 h-3.5 mr-1.5" />
            {t.settings.staff}
          </TabsTrigger>
          <TabsTrigger value="resources">
            <Boxes className="w-3.5 h-3.5 mr-1.5" />
            {t.settings.resources}
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="w-3.5 h-3.5 mr-1.5" />
            {t.settings.appearance}
          </TabsTrigger>
        </TabsList>

        {/* Tenant */}
        <TabsContent value="tenant" className="space-y-4">
          <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  {t.settings.tenant}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <InfoRow label={t.settings.legalName} value={tenant?.legalName} />
                <InfoRow label={t.common.name} value={tenant?.displayName} />
                <InfoRow label={t.settings.specialty} value={tenant?.specialty} />
                <InfoRow label={t.settings.siret} value={tenant?.siret} mono />
                <InfoRow label={t.settings.adeli} value={tenant?.adeli} mono />
                <InfoRow label={t.common.email} value={tenant?.email} />
                <InfoRow label={t.common.phone} value={tenant?.phone} />
                <InfoRow label={t.common.address} value={`${tenant?.addressLine}, ${tenant?.postalCode} ${tenant?.city}`} />
                <InfoRow label={t.common.country} value={tenant?.country} />
                <InfoRow label={t.settings.language} value={tenant?.locale?.toUpperCase()} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Branches */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                {t.settings.branches}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {branches.map((b: any) => (
                  <div key={b.id} className="p-3 rounded-lg glass-base">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">{b.name}</p>
                      <Badge variant="secondary" className="text-[10px]">{b.city}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{b.addressLine}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{b.postalCode} {b.city} · {b.phone}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff */}
        <TabsContent value="staff" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-primary" />
                {t.settings.practitioners}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {practitioners.map((p: any) => (
                  <div key={p.id} className="p-3 rounded-lg glass-base flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0"
                      style={{ background: `${p.color}30`, color: p.color }}
                    >
                      {p.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.specialty} · {p.branch?.name}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {t.settings.rpps}: {p.rpps?.slice(-6)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                {t.settings.staff}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {users.map((u: any) => (
                  <div key={u.id} className="p-3 rounded-lg glass-base flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-glass-accent flex items-center justify-center text-xs font-semibold text-primary-foreground shrink-0">
                      {u.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {t.settings.roles[u.role as keyof typeof t.settings.roles] || u.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources */}
        <TabsContent value="resources">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Boxes className="w-4 h-4 text-primary" />
                {t.settings.resources}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {resources.map((r: any) => (
                  <div key={r.id} className="p-3 rounded-lg glass-base">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <Badge variant="outline" className="text-[10px]">{r.type}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {r.branch?.name} · {locale === 'fr' ? 'capacité' : 'capacity'} {r.capacity}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                {t.settings.appearance}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Density */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground">{t.settings.density}</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={() => setDensity('comfortable')}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-colors",
                      density === 'comfortable' ? "border-primary bg-primary/5" : "border-border glass-base"
                    )}
                  >
                    <p className="text-sm font-medium">{t.settings.densityComfortable}</p>
                    <p className="text-[10px] text-muted-foreground">{locale === 'fr' ? 'Plus d\'espacement, idéal tablette' : 'More spacing, tablet-friendly'}</p>
                  </button>
                  <button
                    onClick={() => setDensity('compact')}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-colors",
                      density === 'compact' ? "border-primary bg-primary/5" : "border-border glass-base"
                    )}
                  >
                    <p className="text-sm font-medium">{t.settings.densityCompact}</p>
                    <p className="text-[10px] text-muted-foreground">{locale === 'fr' ? 'Dense, back-office clinicien' : 'Dense, clinician back-office'}</p>
                  </button>
                </div>
              </div>

              <Separator />

              {/* Theme */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground">{t.settings.theme}</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={() => setTheme('light')}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-colors flex items-center gap-2",
                      theme === 'light' ? "border-primary bg-primary/5" : "border-border glass-base"
                    )}
                  >
                    <Sun className="w-4 h-4 text-glass-warm" />
                    <div>
                      <p className="text-sm font-medium">{t.settings.themeLight}</p>
                    </div>
                    {theme === 'light' && <Check className="w-4 h-4 text-primary ml-auto" />}
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-colors flex items-center gap-2",
                      theme === 'dark' ? "border-primary bg-primary/5" : "border-border glass-base"
                    )}
                  >
                    <Moon className="w-4 h-4 text-info" />
                    <div>
                      <p className="text-sm font-medium">{t.settings.themeDark}</p>
                    </div>
                    {theme === 'dark' && <Check className="w-4 h-4 text-primary ml-auto" />}
                  </button>
                </div>
              </div>

              <Separator />

              {/* Language */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground">{t.settings.language}</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={() => setLocale('fr')}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-colors flex items-center gap-2",
                      locale === 'fr' ? "border-primary bg-primary/5" : "border-border glass-base"
                    )}
                  >
                    <span className="text-xl">🇫🇷</span>
                    <div>
                      <p className="text-sm font-medium">Français</p>
                      <p className="text-[10px] text-muted-foreground">FR</p>
                    </div>
                    {locale === 'fr' && <Check className="w-4 h-4 text-primary ml-auto" />}
                  </button>
                  <button
                    onClick={() => setLocale('en')}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-colors flex items-center gap-2",
                      locale === 'en' ? "border-primary bg-primary/5" : "border-border glass-base"
                    )}
                  >
                    <span className="text-xl">🇬🇧</span>
                    <div>
                      <p className="text-sm font-medium">English</p>
                      <p className="text-[10px] text-muted-foreground">EN</p>
                    </div>
                    {locale === 'en' && <Check className="w-4 h-4 text-primary ml-auto" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {locale === 'fr' ? 'AR · ES · NL · DE sur feuille de route' : 'AR · ES · NL · DE on roadmap'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Compliance card */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">{locale === 'fr' ? 'Conformité & Sécurité' : 'Compliance & Security'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {['RGPD', 'HDS v2.0', 'ISO 27001', 'ISO 27018', 'SOC 2', 'WCAG 2.2 AA', 'EU AI Act', 'HL7 FHIR R5', 'WebAuthn'].map((c) => (
                  <div key={c} className="p-2 rounded-lg glass-base flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-success" />
                    <span className="text-[11px] font-medium">{c}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3">
                {locale === 'fr'
                  ? 'Cibles de conformité engineering — certifications à valider avant mise en production.'
                  : 'Engineering compliance targets — certifications to validate before go-live.'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("text-sm mt-0.5", mono && "font-mono")}>{value || '—'}</p>
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={className}>{children}</p>
}
