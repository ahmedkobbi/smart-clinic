'use client'

import { useApp, type ViewKey } from '@/lib/store'
import { getDict, type Locale } from '@/lib/i18n'
import { motion, AnimatePresence } from 'framer-motion'
import { type Session } from 'next-auth/react'
import {
  Search, Command, Bell, Moon, Sun, Globe, Plus,
  ChevronDown, ChevronRight, LogOut, AlertTriangle,
  Receipt, Package, Clock, Sparkles, CheckCircle2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import { useQuery } from '@tanstack/react-query'
import { signOut } from 'next-auth/react'
import { StatusPill } from '@/components/common/status-pill'

interface Notification {
  id: string
  type: 'break_glass' | 'low_stock' | 'pending_invoice' | 'appointment' | 'ai_draft'
  title: string
  description: string
  severity: 'critical' | 'warning' | 'info'
  timestamp: string
}

async function fetchNotifications(): Promise<Notification[]> {
  const res = await fetch('/api/notifications', { cache: 'no-store' })
  if (!res.ok) return []
  const data = await res.json()
  return data.items || []
}

const NOTIF_ICONS = {
  break_glass: AlertTriangle,
  low_stock: Package,
  pending_invoice: Receipt,
  appointment: Clock,
  ai_draft: Sparkles,
}

const NOTIF_COLORS = {
  break_glass: 'text-destructive bg-destructive/10',
  low_stock: 'text-warning bg-warning/10',
  pending_invoice: 'text-warning bg-warning/10',
  appointment: 'text-info bg-info/10',
  ai_draft: 'text-glass-accent bg-glass-accent/10',
}

export function TopBar({ locale, session }: { locale: Locale; session: Session | null }) {
  const { setCommandOpen, setLocale, toggleTheme, theme, setNewPatientOpen, view } = useApp()
  const t = getDict(locale)
  const [now, setNow] = useState(new Date())

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 60_000,
  })

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const titleMap: Record<string, string> = {
    dashboard: t.dashboard.title,
    patients: t.patients.title,
    appointments: t.appointments.title,
    records: t.records.title,
    billing: t.billing.title,
    audit: t.audit.title,
    inventory: t.inventory.title,
    settings: t.settings.title,
    sustainability: t.nav.sustainability,
    triage: t.nav.triage,
  }

  const criticalCount = notifications.filter(n => n.severity === 'critical').length

  return (
    <header className="sticky top-0 z-30 glass-base border-b border-border/40">
      <div className="flex items-center gap-3 px-4 md:px-6 py-3">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <span className="hidden md:inline">{(session?.user as any)?.tenantName || t.app.tenant}</span>
          <ChevronRight className="w-3 h-3 hidden md:inline" />
          <span className="font-medium text-foreground">{titleMap[view] || t.app.name}</span>
        </div>

        {/* Page title */}
        <div className="flex-1 min-w-0 ml-2">
          <h2 className="text-base font-semibold leading-tight truncate hidden md:block">
            {now.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
        </div>

        {/* Command palette trigger */}
        <button
          onClick={() => setCommandOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg glass-button text-sm text-muted-foreground hover:text-foreground min-w-[260px]"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left">{t.command.placeholder}</span>
          <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono rounded bg-muted border border-border">
            <Command className="w-3 h-3" /> K
          </kbd>
        </button>

        {/* Language toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
                className="p-2 rounded-lg glass-button text-foreground/70 hover:text-foreground"
                aria-label="Toggle language"
              >
                <Globe className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{locale === 'fr' ? 'Switch to English' : 'Passer en français'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Theme toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg glass-button text-foreground/70 hover:text-foreground"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>{theme === 'dark' ? t.settings.themeLight : t.settings.themeDark}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative p-2 rounded-lg glass-button text-foreground/70 hover:text-foreground" aria-label="Notifications">
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive">
                  {criticalCount > 0 && (
                    <span className="absolute inset-0 rounded-full bg-destructive animate-ping" />
                  )}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="glass-floating p-0 w-80 max-h-[400px] overflow-hidden" align="end">
            <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{locale === 'fr' ? 'Notifications' : 'Notifications'}</h3>
              <span className="text-[10px] text-muted-foreground">{notifications.length}</span>
            </div>
            <div className="max-h-[320px] overflow-y-auto scroll-area-glass">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-success" />
                  {locale === 'fr' ? 'Aucune notification' : 'No notifications'}
                </div>
              ) : (
                notifications.map((n, i) => {
                  const Icon = NOTIF_ICONS[n.type]
                  const colorClass = NOTIF_COLORS[n.type]
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 30 }}
                      className="px-4 py-3 border-b border-border/20 hover:bg-accent/30 cursor-pointer flex items-start gap-3"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{n.title}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{n.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                          {new Date(n.timestamp).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')}
                        </p>
                      </div>
                      {n.severity === 'critical' && (
                        <span className="status-pill text-destructive text-[9px]">!</span>
                      )}
                    </motion.div>
                  )
                })
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Quick actions */}
        <div className="hidden lg:flex items-center gap-1">
          <button
            onClick={() => setNewPatientOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> {t.patients.new}
          </button>
        </div>

        {/* User chip */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 p-1 pr-2 rounded-lg glass-button">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-glass-accent flex items-center justify-center text-primary-foreground text-xs font-semibold">
                {(session?.user?.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}
              </div>
              <ChevronDown className="w-3 h-3 text-muted-foreground hidden md:block" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="glass-floating p-2 w-56" align="end">
            <div className="px-3 py-2 border-b border-border/40 mb-1">
              <p className="text-sm font-medium">{session?.user?.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{session?.user?.email}</p>
              <span className="status-pill text-info text-[10px] mt-1 inline-flex">
                {(session?.user as any)?.role}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {locale === 'fr' ? 'Déconnexion' : 'Sign out'}
            </button>
          </PopoverContent>
        </Popover>
      </div>

      {/* Mobile search */}
      <div className="md:hidden px-4 pb-3">
        <button
          onClick={() => setCommandOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg glass-button text-sm text-muted-foreground"
        >
          <Search className="w-4 h-4" /> {t.command.placeholder}
        </button>
      </div>
    </header>
  )
}
