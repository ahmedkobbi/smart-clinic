'use client'

import { useApp } from '@/lib/store'
import { getDict, type Locale } from '@/lib/i18n'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Command, Bell, Moon, Sun, Globe, Plus,
  CalendarPlus, FilePlus, ReceiptPlus, ChevronDown,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

export function TopBar({ locale }: { locale: Locale }) {
  const { setCommandOpen, setLocale, toggleTheme, theme, setNewPatientOpen, setNewAppointmentOpen, view } = useApp()
  const t = getDict(locale)
  const [now, setNow] = useState(new Date())

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
  }

  return (
    <header className="sticky top-0 z-30 glass-base border-b border-border/40">
      <div className="flex items-center gap-3 px-4 md:px-6 py-3">
        {/* Page title */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold leading-tight truncate">{titleMap[view] || t.app.name}</h2>
          <p className="text-xs text-muted-foreground leading-tight truncate">
            {now.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Command palette trigger */}
        <button
          onClick={() => setCommandOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg glass-button text-sm text-muted-foreground hover:text-foreground min-w-[280px]"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left">{t.command.placeholder}</span>
          <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono rounded bg-muted border border-border">
            <Command className="w-3 h-3" /> K
          </kbd>
        </button>

        {/* Language toggle */}
        <button
          onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
          className="p-2 rounded-lg glass-button text-foreground/70 hover:text-foreground"
          aria-label="Toggle language"
        >
          <Globe className="w-4 h-4" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg glass-button text-foreground/70 hover:text-foreground"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg glass-button text-foreground/70 hover:text-foreground" aria-label="Notifications">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
        </button>

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
        <button className="flex items-center gap-2 p-1 pr-2 rounded-lg glass-button">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-glass-accent flex items-center justify-center text-primary-foreground text-xs font-semibold">
            CF
          </div>
          <ChevronDown className="w-3 h-3 text-muted-foreground hidden md:block" />
        </button>
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
