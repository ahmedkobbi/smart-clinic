'use client'

import { useApp } from '@/lib/store'
import { getDict, otherLocale, type Locale } from '@/lib/i18n'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useEffect, useState, useMemo } from 'react'
import {
  LayoutDashboard, Users, CalendarClock, FileText, Receipt,
  ShieldCheck, Package, Settings, UserPlus, CalendarPlus,
  FilePlus, Receipt as ReceiptPlus, Moon, Sun, Globe, CornerDownRight, Search,
  Hash, Calendar, Sparkles, Loader2, FolderOpen, FlaskConical, Video, IdCard, Leaf, Stethoscope,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface CommandItem {
  id: string
  label: string
  group: string
  icon: any
  action: () => void
  hint?: string
}

interface SearchResult {
  patients: any[]
  invoices: any[]
  appointments: any[]
}

export function CommandPalette({ locale }: { locale: Locale }) {
  const {
    commandOpen, setCommandOpen,
    setView, setLocale, toggleTheme, theme,
    setNewPatientOpen, setNewAppointmentOpen,
    setSelectedPatientId,
  } = useApp()
  const t = getDict(locale)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult>({ patients: [], invoices: [], appointments: [] })
  const [searching, setSearching] = useState(false)

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

  // Debounced search for actual data
  useEffect(() => {
    if (query.length < 2) {
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearching(true)
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data)
        }
      } catch {
        // ignore
      } finally {
        setSearching(false)
      }
    }, 200)
    return () => clearTimeout(timeout)
  }, [query])

  const navItems: CommandItem[] = useMemo(() => [
    { id: 'nav-dashboard', label: t.nav.dashboard, group: t.command.groups.navigation, icon: LayoutDashboard, action: () => setView('dashboard') },
    { id: 'nav-patients', label: t.nav.patients, group: t.command.groups.navigation, icon: Users, action: () => setView('patients') },
    { id: 'nav-appointments', label: t.nav.appointments, group: t.command.groups.navigation, icon: CalendarClock, action: () => setView('appointments') },
    { id: 'nav-records', label: t.nav.records, group: t.command.groups.navigation, icon: FileText, action: () => setView('records') },
    { id: 'nav-billing', label: t.nav.billing, group: t.command.groups.navigation, icon: Receipt, action: () => setView('billing') },
    { id: 'nav-labs', label: t.nav.labs, group: t.command.groups.navigation, icon: FlaskConical, action: () => setView('labs') },
    { id: 'nav-documents', label: t.nav.documents, group: t.command.groups.navigation, icon: FolderOpen, action: () => setView('documents') },
    { id: 'nav-telemedicine', label: t.nav.telemedicine, group: t.command.groups.navigation, icon: Video, action: () => setView('telemedicine') },
    { id: 'nav-staff', label: t.nav.staff, group: t.command.groups.navigation, icon: IdCard, action: () => setView('staff') },
    { id: 'nav-audit', label: t.nav.audit, group: t.command.groups.navigation, icon: ShieldCheck, action: () => setView('audit') },
    { id: 'nav-inventory', label: t.nav.inventory, group: t.command.groups.navigation, icon: Package, action: () => setView('inventory') },
    { id: 'nav-triage', label: t.nav.triage, group: t.command.groups.navigation, icon: Stethoscope, action: () => setView('triage') },
    { id: 'nav-sustainability', label: t.nav.sustainability, group: t.command.groups.navigation, icon: Leaf, action: () => setView('sustainability') },
    { id: 'nav-settings', label: t.nav.settings, group: t.command.groups.navigation, icon: Settings, action: () => setView('settings') },
  ], [t, setView])

  const actionItems: CommandItem[] = useMemo(() => [
    { id: 'act-new-patient', label: t.command.actions.newPatient, group: t.command.groups.actions, icon: UserPlus, action: () => { setNewPatientOpen(true); setCommandOpen(false) } },
    { id: 'act-new-appt', label: t.command.actions.newAppointment, group: t.command.groups.actions, icon: CalendarPlus, action: () => { setNewAppointmentOpen(true); setCommandOpen(false) } },
    { id: 'act-new-consult', label: t.command.actions.newConsultation, group: t.command.groups.actions, icon: FilePlus, action: () => { setView('records'); setCommandOpen(false) } },
    { id: 'act-new-invoice', label: t.command.actions.newInvoice, group: t.command.groups.actions, icon: ReceiptPlus, action: () => { setView('billing'); setCommandOpen(false) } },
  ], [t, setView, setNewPatientOpen, setNewAppointmentOpen, setCommandOpen])

  const settingItems: CommandItem[] = useMemo(() => [
    { id: 'set-theme', label: t.command.actions.toggleTheme, group: t.command.groups.settings, icon: theme === 'dark' ? Sun : Moon, action: () => { toggleTheme(); setCommandOpen(false) } },
    { id: 'set-lang', label: t.command.actions.toggleLanguage, group: t.command.groups.settings, icon: Globe, action: () => { setLocale(otherLocale(locale)); setCommandOpen(false) } },
    { id: 'set-open', label: t.command.actions.openSettings, group: t.command.groups.settings, icon: Settings, action: () => { setView('settings'); setCommandOpen(false) } },
  ], [t, theme, locale, setView, setLocale, toggleTheme, setCommandOpen])

  // Build data search results as command items
  const dataItems: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = []
    for (const p of searchResults.patients) {
      items.push({
        id: `data-patient-${p.id}`,
        label: `${p.firstName} ${p.lastName}`,
        group: t.command.groups.patients,
        icon: Users,
        action: () => { setSelectedPatientId(p.id); setView('patients'); setCommandOpen(false) },
        hint: p.email,
      })
    }
    for (const inv of searchResults.invoices) {
      items.push({
        id: `data-invoice-${inv.id}`,
        label: `${inv.number} — ${inv.patient.firstName} ${inv.patient.lastName}`,
        group: t.command.invoicesGroup,
        icon: Hash,
        action: () => { setSelectedPatientId(inv.patientId); setView('billing'); setCommandOpen(false) },
        hint: `${inv.total.toFixed(2)} €`,
      })
    }
    for (const appt of searchResults.appointments) {
      items.push({
        id: `data-appt-${appt.id}`,
        label: `${appt.patient.firstName} ${appt.patient.lastName} — ${appt.reason || 'Consultation'}`,
        group: t.command.appointmentsGroup,
        icon: Calendar,
        action: () => { setSelectedPatientId(appt.patientId); setView('appointments'); setCommandOpen(false) },
        hint: appt.practitioner.name,
      })
    }
    return items
  }, [searchResults, t, locale, setSelectedPatientId, setView, setCommandOpen])

  const hasDataResults = dataItems.length > 0
  const showNav = query.length < 2

  // Check if query looks like a natural-language command
  const isNLCommand = query.length > 3 && /\b(schedule|rdv|rendez-vous|planifier|book|trouve|find|aller|go to|ouvrir|open|navigate)\b/i.test(query)
  const [nlExecuting, setNlExecuting] = useState(false)

  const executeNLCommand = async () => {
    setNlExecuting(true)
    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: query, execute: true }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (data.executionResult?.success) {
        if (data.executionResult.type === 'appointment_created') {
          toast.success(data.executionResult.message)
          setCommandOpen(false)
          setQuery('')
        } else if (data.executionResult.type === 'navigate') {
          setView(data.executionResult.view as any)
          setCommandOpen(false)
          setQuery('')
        }
      } else {
        toast.info(t.command.commandParsedToast)
      }
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setNlExecuting(false)
    }
  }

  const allItems = showNav ? [...navItems, ...actionItems, ...settingItems] : dataItems

  // Group items
  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>()
    for (const item of allItems) {
      if (!map.has(item.group)) map.set(item.group, [])
      map.get(item.group)!.push(item)
    }
    return Array.from(map.entries())
  }, [allItems])

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
          <Search className={`w-4 h-4 text-muted-foreground ${searching ? 'animate-pulse' : ''}`} />
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
          {/* NL command execution */}
          {isNLCommand && (
            <div className="mb-2">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t.command.naturalLanguage}
              </p>
              <button
                onClick={executeNLCommand}
                disabled={nlExecuting}
                className="w-full flex items-center gap-3 px-2 py-3 rounded-lg ai-glow bg-glass-accent/10 hover:bg-glass-accent/20 transition-colors group"
              >
                <span className="w-7 h-7 rounded-md bg-glass-accent/20 flex items-center justify-center shrink-0">
                  {nlExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-glass-accent" /> : <Sparkles className="w-3.5 h-3.5 text-glass-accent" />}
                </span>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate">"{query}"</p>
                  <p className="text-[10px] text-muted-foreground">
                    {nlExecuting
                      ? t.command.executing
                      : t.command.executeCommand}
                  </p>
                </div>
                <CornerDownRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            </div>
          )}
          {query.length >= 2 && !hasDataResults && !searching && !isNLCommand && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              {t.common.noResults}
            </div>
          )}
          {query.length >= 2 && searching && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 animate-pulse opacity-40" />
              {t.common.loading}
            </div>
          )}
          {grouped.length === 0 && showNav && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              {t.common.noResults}
            </div>
          )}
          {grouped.map(([group, groupItems]) => (
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
                    <div className="flex-1 min-w-0 text-left">
                      <p className="truncate">{item.label}</p>
                      {item.hint && (
                        <p className="text-[10px] text-muted-foreground truncate">{item.hint}</p>
                      )}
                    </div>
                    <CornerDownRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-border/40 text-[10px] text-muted-foreground flex items-center justify-between">
          <span>{t.command.hint}</span>
          <span className="font-mono">↵ {t.common.confirm}</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
