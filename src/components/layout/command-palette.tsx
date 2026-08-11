'use client'

import { useApp } from '@/lib/store'
import { getDict, type Locale } from '@/lib/i18n'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useEffect, useState, useMemo } from 'react'
import {
  LayoutDashboard, Users, CalendarClock, FileText, Receipt,
  ShieldCheck, Package, Settings, UserPlus, CalendarPlus,
  FilePlus, Receipt as ReceiptPlus, Moon, Sun, Globe, CornerDownRight, Search,
} from 'lucide-react'
import { motion } from 'framer-motion'

interface CommandItem {
  id: string
  label: string
  group: string
  icon: any
  action: () => void
  keywords?: string[]
}

export function CommandPalette({ locale }: { locale: Locale }) {
  const {
    commandOpen, setCommandOpen,
    setView, setLocale, toggleTheme, theme,
    setNewPatientOpen, setNewAppointmentOpen,
  } = useApp()
  const t = getDict(locale)
  const [query, setQuery] = useState('')

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(!commandOpen)
      }
      if (e.key === 'Escape' && commandOpen) {
        setCommandOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [commandOpen, setCommandOpen])

  // Reset query when dialog closes (via onOpenChange callback below)

  const items: CommandItem[] = useMemo(() => {
    const navItems = [
      { id: 'nav-dashboard', label: t.nav.dashboard, group: t.command.groups.navigation, icon: LayoutDashboard, action: () => setView('dashboard') },
      { id: 'nav-patients', label: t.nav.patients, group: t.command.groups.navigation, icon: Users, action: () => setView('patients') },
      { id: 'nav-appointments', label: t.nav.appointments, group: t.command.groups.navigation, icon: CalendarClock, action: () => setView('appointments') },
      { id: 'nav-records', label: t.nav.records, group: t.command.groups.navigation, icon: FileText, action: () => setView('records') },
      { id: 'nav-billing', label: t.nav.billing, group: t.command.groups.navigation, icon: Receipt, action: () => setView('billing') },
      { id: 'nav-audit', label: t.nav.audit, group: t.command.groups.navigation, icon: ShieldCheck, action: () => setView('audit') },
      { id: 'nav-inventory', label: t.nav.inventory, group: t.command.groups.navigation, icon: Package, action: () => setView('inventory') },
      { id: 'nav-settings', label: t.nav.settings, group: t.command.groups.navigation, icon: Settings, action: () => setView('settings') },
    ]
    const actionItems = [
      { id: 'act-new-patient', label: t.command.actions.newPatient, group: t.command.groups.actions, icon: UserPlus, action: () => { setNewPatientOpen(true); setCommandOpen(false) } },
      { id: 'act-new-appt', label: t.command.actions.newAppointment, group: t.command.groups.actions, icon: CalendarPlus, action: () => { setNewAppointmentOpen(true); setCommandOpen(false) } },
      { id: 'act-new-consult', label: t.command.actions.newConsultation, group: t.command.groups.actions, icon: FilePlus, action: () => { setView('records'); setCommandOpen(false) } },
      { id: 'act-new-invoice', label: t.command.actions.newInvoice, group: t.command.groups.actions, icon: ReceiptPlus, action: () => { setView('billing'); setCommandOpen(false) } },
    ]
    const settingItems = [
      { id: 'set-theme', label: t.command.actions.toggleTheme, group: t.command.groups.settings, icon: theme === 'dark' ? Sun : Moon, action: () => { toggleTheme(); setCommandOpen(false) } },
      { id: 'set-lang', label: t.command.actions.toggleLanguage, group: t.command.groups.settings, icon: Globe, action: () => { setLocale(locale === 'fr' ? 'en' : 'fr'); setCommandOpen(false) } },
      { id: 'set-open', label: t.command.actions.openSettings, group: t.command.groups.settings, icon: Settings, action: () => { setView('settings'); setCommandOpen(false) } },
    ]
    return [...navItems, ...actionItems, ...settingItems]
  }, [locale, t, theme, setView, setLocale, toggleTheme, setNewPatientOpen, setNewAppointmentOpen, setCommandOpen])

  const filtered = useMemo(() => {
    if (!query.trim()) return items
    const q = query.toLowerCase()
    return items.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q) ||
      (item.keywords || []).some(k => k.toLowerCase().includes(q))
    )
  }, [items, query])

  // Group items
  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>()
    for (const item of filtered) {
      if (!map.has(item.group)) map.set(item.group, [])
      map.get(item.group)!.push(item)
    }
    return Array.from(map.entries())
  }, [filtered])

  const handleRun = (item: CommandItem) => {
    item.action()
    setCommandOpen(false)
  }

  return (
    <Dialog open={commandOpen} onOpenChange={(o) => { setCommandOpen(o); if (!o) setQuery('') }}>
      <DialogContent className="glass-floating p-0 max-w-2xl gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{t.nav.command}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.command.placeholder}
            className="border-0 bg-transparent px-0 py-0 h-auto focus-visible:ring-0 text-base shadow-none"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border">ESC</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto scroll-area-glass p-2">
          {grouped.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              {t.common.noResults}
            </div>
          ) : (
            grouped.map(([group, groupItems]) => (
              <div key={group} className="mb-2">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </p>
                {groupItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleRun(item)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm hover:bg-accent/50 transition-colors group"
                    >
                      <span className="w-7 h-7 rounded-md glass-base flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-foreground/70 group-hover:text-primary transition-colors" />
                      </span>
                      <span className="flex-1 text-left">{item.label}</span>
                      <CornerDownRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-border/40 text-[10px] text-muted-foreground flex items-center justify-between">
          <span>{t.command.hint}</span>
          <span className="font-mono">↵ {t.common.confirm}</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
