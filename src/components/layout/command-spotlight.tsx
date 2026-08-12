'use client'

import { Spotlight, SpotlightAction } from '@mantine/spotlight'
import { useApp, type ViewKey } from '@/lib/store'
import { getDict, type Locale } from '@/lib/i18n'
import { useMemo, useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, CalendarClock, FileText, Receipt,
  ShieldCheck, Package, Settings, UserPlus, CalendarPlus,
  FilePlus, Moon, Sun, Globe, Leaf, Stethoscope, FolderOpen,
  FlaskConical, Video, IdCard, KeyRound, Monitor, Upload, Activity,
} from 'lucide-react'

interface SearchResult {
  patients: any[]
  invoices: any[]
  appointments: any[]
}

export function CommandSpotlight() {
  const {
    setView, setLocale, toggleTheme, theme, setNewPatientOpen,
    setNewAppointmentOpen, setSelectedPatientId, setCommandOpen,
  } = useApp()
  const locale = useApp((s) => s.locale)
  const t = getDict(locale)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult>({ patients: [], invoices: [], appointments: [] })

  // Build navigation actions
  const navActions: SpotlightAction[] = useMemo(() => [
    { id: 'dashboard', label: t.nav.dashboard, icon: <LayoutDashboard size={18} />, onClick: () => setView('dashboard') },
    { id: 'patients', label: t.nav.patients, icon: <Users size={18} />, onClick: () => setView('patients') },
    { id: 'appointments', label: t.nav.appointments, icon: <CalendarClock size={18} />, onClick: () => setView('appointments') },
    { id: 'records', label: t.nav.records, icon: <FileText size={18} />, onClick: () => setView('records') },
    { id: 'billing', label: t.nav.billing, icon: <Receipt size={18} />, onClick: () => setView('billing') },
    { id: 'labs', label: t.nav.labs, icon: <FlaskConical size={18} />, onClick: () => setView('labs') },
    { id: 'documents', label: t.nav.documents, icon: <FolderOpen size={18} />, onClick: () => setView('documents') },
    { id: 'telemedicine', label: t.nav.telemedicine, icon: <Video size={18} />, onClick: () => setView('telemedicine') },
    { id: 'staff', label: t.nav.staff, icon: <IdCard size={18} />, onClick: () => setView('staff') },
    { id: 'audit', label: t.nav.audit, icon: <ShieldCheck size={18} />, onClick: () => setView('audit') },
    { id: 'inventory', label: t.nav.inventory, icon: <Package size={18} />, onClick: () => setView('inventory') },
    { id: 'triage', label: t.nav.triage, icon: <Stethoscope size={18} />, onClick: () => setView('triage') },
    { id: 'sustainability', label: t.nav.sustainability, icon: <Leaf size={18} />, onClick: () => setView('sustainability') },
    { id: 'settings', label: t.nav.settings, icon: <Settings size={18} />, onClick: () => setView('settings') },
  ], [t, setView])

  // Build action actions
  const actionActions: SpotlightAction[] = useMemo(() => [
    { id: 'new-patient', label: t.command.actions.newPatient, icon: <UserPlus size={18} />, onClick: () => setNewPatientOpen(true) },
    { id: 'new-appointment', label: t.command.actions.newAppointment, icon: <CalendarPlus size={18} />, onClick: () => setNewAppointmentOpen(true) },
    { id: 'new-consultation', label: t.command.actions.newConsultation, icon: <FilePlus size={18} />, onClick: () => setView('records') },
  ], [t, setNewPatientOpen, setNewAppointmentOpen, setView])

  // Build settings actions
  const settingsActions: SpotlightAction[] = useMemo(() => [
    { id: 'toggle-theme', label: t.command.actions.toggleTheme, icon: theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />, onClick: toggleTheme },
    { id: 'toggle-lang', label: t.command.actions.toggleLanguage, icon: <Globe size={18} />, onClick: () => setLocale(locale === 'fr' ? 'en' : 'fr') },
    { id: 'open-settings', label: t.command.actions.openSettings, icon: <Settings size={18} />, onClick: () => setView('settings') },
  ], [t, theme, locale, toggleTheme, setLocale, setView])

  // Debounced search for actual data
  useEffect(() => {
    if (query.length < 2) {
      return
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data)
        }
      } catch {
        // ignore
      }
    }, 200)
    return () => clearTimeout(timeout)
  }, [query])

  // Build data search actions
  const dataActions: SpotlightAction[] = useMemo(() => {
    const items: SpotlightAction[] = []
    for (const p of searchResults.patients) {
      items.push({
        id: `patient-${p.id}`,
        label: `${p.firstName} ${p.lastName}`,
        description: p.email,
        onClick: () => { setSelectedPatientId(p.id); setView('patients') },
      })
    }
    for (const inv of searchResults.invoices) {
      items.push({
        id: `invoice-${inv.id}`,
        label: `${inv.number} — ${inv.patient.firstName} ${inv.patient.lastName}`,
        description: `${inv.total.toFixed(2)} €`,
        onClick: () => { setSelectedPatientId(inv.patientId); setView('billing') },
      })
    }
    return items
  }, [searchResults, setSelectedPatientId, setView])

  // Combine all actions — group with labels
  const allActions: (SpotlightAction & { group?: string })[] = useMemo(() => {
    const grouped: any[] = []
    if (query.length < 2) {
      // Show navigation + actions + settings when no search
      navActions.forEach(a => grouped.push({ ...a, group: t.command.groups.navigation }))
      actionActions.forEach(a => grouped.push({ ...a, group: t.command.groups.actions }))
      settingsActions.forEach(a => grouped.push({ ...a, group: t.command.groups.settings }))
    } else {
      // Show search results
      dataActions.forEach(a => grouped.push({ ...a, group: t.command.groups.patients }))
    }
    return grouped
  }, [query, navActions, actionActions, settingsActions, dataActions, t])

  return (
    <Spotlight
      actions={allActions}
      shortcut={['mod + k', 'ctrl + k']}
      highlightQuery
      limit={15}
      nothingFound={t.common.noResults}
      query={query}
      onQueryChange={setQuery}
      radius="lg"
      overlayProps={{ blur: 8 }}
    />
  )
}
