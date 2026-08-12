'use client'

import { useApp } from '@/lib/store'
import { getDict, type Locale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Building2, MapPin, Users, Stethoscope, Boxes, Palette,
  Moon, Sun, Check,
} from 'lucide-react'
import { Tabs, Badge, Text, Divider, Group, Stack, Box } from '@mantine/core'
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
        <Tabs.List className="glass-base">
          <Tabs.Tab value="tenant">
            <Group gap={6}>
              <Building2 className="w-3.5 h-3.5" />
              <span>{t.settings.tenant}</span>
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="staff">
            <Group gap={6}>
              <Users className="w-3.5 h-3.5" />
              <span>{t.settings.staff}</span>
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="resources">
            <Group gap={6}>
              <Boxes className="w-3.5 h-3.5" />
              <span>{t.settings.resources}</span>
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="appearance">
            <Group gap={6}>
              <Palette className="w-3.5 h-3.5" />
              <span>{t.settings.appearance}</span>
            </Group>
          </Tabs.Tab>
        </Tabs.List>

        {/* Tenant */}
        <Tabs.Panel value="tenant" className="space-y-4">
          <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <div className="glass-card rounded-2xl p-5">
              <Group gap="sm" mb="md">
                <Building2 className="w-4 h-4 text-primary" />
                <Text fw={600} size="base">{t.settings.tenant}</Text>
              </Group>
              <div className="grid grid-cols-2 gap-4">
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
              </div>
            </div>
          </motion.div>

          {/* Branches */}
          <div className="glass-card rounded-2xl p-5">
            <Group gap="sm" mb="md">
              <MapPin className="w-4 h-4 text-primary" />
              <Text fw={600} size="base">{t.settings.branches}</Text>
            </Group>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {branches.map((b: any) => (
                <div key={b.id} className="p-3 rounded-lg glass-base">
                  <div className="flex items-center justify-between mb-1">
                    <Text size="sm" fw={500}>{b.name}</Text>
                    <Badge variant="light" size="sm">{b.city}</Badge>
                  </div>
                  <Text size="xs" c="dimmed">{b.addressLine}</Text>
                  <Text size="xs" c="dimmed" mt={4}>{b.postalCode} {b.city} · {b.phone}</Text>
                </div>
              ))}
            </div>
          </div>
        </Tabs.Panel>

        {/* Staff */}
        <Tabs.Panel value="staff" className="space-y-4">
          <div className="glass-card rounded-2xl p-5">
            <Group gap="sm" mb="md">
              <Stethoscope className="w-4 h-4 text-primary" />
              <Text fw={600} size="base">{t.settings.practitioners}</Text>
            </Group>
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
                    <Text size="sm" fw={500} truncate>{p.name}</Text>
                    <Text size="xs" c="dimmed">{p.specialty} · {p.branch?.name}</Text>
                  </div>
                  <Badge variant="outline" size="sm" className="font-mono">
                    {t.settings.rpps}: {p.rpps?.slice(-6)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <Group gap="sm" mb="md">
              <Users className="w-4 h-4 text-primary" />
              <Text fw={600} size="base">{t.settings.staff}</Text>
            </Group>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {users.map((u: any) => (
                <div key={u.id} className="p-3 rounded-lg glass-base flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-glass-accent flex items-center justify-center text-xs font-semibold text-primary-foreground shrink-0">
                    {u.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Text size="sm" fw={500} truncate>{u.name}</Text>
                    <Text size="xs" c="dimmed" truncate>{u.email}</Text>
                  </div>
                  <Badge variant="light" size="sm">
                    {t.settings.roles[u.role as keyof typeof t.settings.roles] || u.role}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </Tabs.Panel>

        {/* Resources */}
        <Tabs.Panel value="resources">
          <div className="glass-card rounded-2xl p-5">
            <Group gap="sm" mb="md">
              <Boxes className="w-4 h-4 text-primary" />
              <Text fw={600} size="base">{t.settings.resources}</Text>
            </Group>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {resources.map((r: any) => (
                <div key={r.id} className="p-3 rounded-lg glass-base">
                  <div className="flex items-center justify-between mb-1">
                    <Text size="sm" fw={500} truncate>{r.name}</Text>
                    <Badge variant="outline" size="sm">{r.type}</Badge>
                  </div>
                  <Text size="xs" c="dimmed">
                    {r.branch?.name} · {t.settings.capacity} {r.capacity}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        </Tabs.Panel>

        {/* Appearance */}
        <Tabs.Panel value="appearance" className="space-y-4">
          <div className="glass-card rounded-2xl p-5">
            <Group gap="sm" mb="md">
              <Palette className="w-4 h-4 text-primary" />
              <Text fw={600} size="base">{t.settings.appearance}</Text>
            </Group>
            <Stack gap="md">
              {/* Density */}
              <div>
                <Text size="xs" className="font-medium text-muted-foreground">{t.settings.density}</Text>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={() => setDensity('comfortable')}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-colors",
                      density === 'comfortable' ? "border-primary bg-primary/5" : "border-border glass-base"
                    )}
                  >
                    <Text size="sm" fw={500}>{t.settings.densityComfortable}</Text>
                    <Text size="xs" c="dimmed">{t.settings.densityComfortableDesc}</Text>
                  </button>
                  <button
                    onClick={() => setDensity('compact')}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-colors",
                      density === 'compact' ? "border-primary bg-primary/5" : "border-border glass-base"
                    )}
                  >
                    <Text size="sm" fw={500}>{t.settings.densityCompact}</Text>
                    <Text size="xs" c="dimmed">{t.settings.densityCompactDesc}</Text>
                  </button>
                </div>
              </div>

              <Divider />

              {/* Theme */}
              <div>
                <Text size="xs" className="font-medium text-muted-foreground">{t.settings.theme}</Text>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={() => setTheme('light')}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-colors flex items-center gap-2",
                      theme === 'light' ? "border-primary bg-primary/5" : "border-border glass-base"
                    )}
                  >
                    <Sun className="w-4 h-4 text-glass-warm" />
                    <Text size="sm" fw={500}>{t.settings.themeLight}</Text>
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
                    <Text size="sm" fw={500}>{t.settings.themeDark}</Text>
                    {theme === 'dark' && <Check className="w-4 h-4 text-primary ml-auto" />}
                  </button>
                </div>
              </div>

              <Divider />

              {/* Language */}
              <div>
                <Text size="xs" className="font-medium text-muted-foreground">{t.settings.language}</Text>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={() => setLocale('fr')}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-colors flex items-center gap-2",
                      locale !== 'en' ? "border-primary bg-primary/5" : "border-border glass-base"
                    )}
                  >
                    <span className="text-xl">🇫🇷</span>
                    <div>
                      <Text size="sm" fw={500}>Français</Text>
                      <Text size="xs" c="dimmed">FR</Text>
                    </div>
                    {locale !== 'en' && <Check className="w-4 h-4 text-primary ml-auto" />}
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
                      <Text size="sm" fw={500}>English</Text>
                      <Text size="xs" c="dimmed">EN</Text>
                    </div>
                    {locale === 'en' && <Check className="w-4 h-4 text-primary ml-auto" />}
                  </button>
                </div>
                <Text size="xs" c="dimmed" mt="sm">{t.settings.languagesRoadmap}</Text>
              </div>
            </Stack>
          </div>

          {/* Compliance card */}
          <div className="glass-card rounded-2xl p-5">
            <Group gap="sm" mb="md">
              <Text fw={600} size="base">{t.settings.complianceTitle}</Text>
            </Group>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {['RGPD', 'HDS v2.0', 'ISO 27001', 'ISO 27018', 'SOC 2', 'WCAG 2.2 AA', 'EU AI Act', 'HL7 FHIR R5', 'WebAuthn'].map((c) => (
                <Box key={c} className="p-2 rounded-lg glass-base flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-success" />
                  <Text size="xs" fw={500}>{c}</Text>
                </Box>
              ))}
            </div>
            <Text size="xs" c="dimmed" mt="sm">{t.settings.complianceDesc}</Text>
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div>
      <Text size="xs" className="font-semibold uppercase tracking-wider text-muted-foreground">{label}</Text>
      <Text size="sm" mt={4} className={cn(mono && 'font-mono')}>{value || '—'}</Text>
    </div>
  )
}
