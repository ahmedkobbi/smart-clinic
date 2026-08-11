'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useApp } from '@/lib/store'
import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/topbar'
import { FloatingDock } from '@/components/layout/floating-dock'
import { CommandPalette } from '@/components/layout/command-palette'
import { MobileNav } from '@/components/layout/mobile-nav'
import { DashboardView } from '@/components/views/dashboard-view'
import { PatientsView } from '@/components/views/patients-view'
import { AppointmentsView } from '@/components/views/appointments-view'
import { RecordsView } from '@/components/views/records-view'
import { BillingView } from '@/components/views/billing-view'
import { AuditView } from '@/components/views/audit-view'
import { InventoryView } from '@/components/views/inventory-view'
import { SettingsView } from '@/components/views/settings-view'
import { SustainabilityView } from '@/components/views/sustainability-view'
import { TriageView } from '@/components/views/triage-view'
import { DocumentsView } from '@/components/views/documents-view'
import { LabsView } from '@/components/views/labs-view'
import { TelemedicineView } from '@/components/views/telemedicine-view'
import { StaffView } from '@/components/views/staff-view'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { AdminTopBar } from '@/components/layout/admin-topbar'
import { AdminDashboardView } from '@/components/views/admin-dashboard-view'
import { AdminLicensesView } from '@/components/views/admin-licenses-view'
import { AdminInstancesView } from '@/components/views/admin-instances-view'
import { AdminUpdatesView } from '@/components/views/admin-updates-view'
import { AdminActionsView } from '@/components/views/admin-actions-view'
import { Menu } from 'lucide-react'
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { LoginScreen } from '@/components/login-screen'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function AppShell() {
  const { view, theme, density, locale } = useApp()
  const { data: session, status } = useSession()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Apply theme + density to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    document.documentElement.classList.toggle('density-compact', density === 'compact')
    document.documentElement.classList.toggle('density-comfortable', density === 'comfortable')
  }, [density])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-floating rounded-2xl p-8 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl glass-raised flex items-center justify-center animate-pulse-glow">
            <HeartPulse className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <LoginScreen />
  }

  // Owner side — admin console
  if (useApp.getState().userMode === 'admin') {
    return (
      <div className="flex min-h-screen">
        <AdminSidebar locale={locale} session={session} />
        <button
          onClick={() => setMobileNavOpen(true)}
          className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-lg glass-floating"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex-1 flex flex-col min-w-0">
          <AdminTopBar locale={locale} session={session} />
          <main className="flex-1 animate-fade-in">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {view === 'admin-dashboard' && <AdminDashboardView locale={locale} />}
                {view === 'admin-licenses' && <AdminLicensesView locale={locale} />}
                {view === 'admin-instances' && <AdminInstancesView locale={locale} />}
                {view === 'admin-updates' && <AdminUpdatesView locale={locale} />}
                {view === 'admin-actions' && <AdminActionsView locale={locale} />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <CommandPalette locale={locale} />
      </div>
    )
  }

  // Clinic side — practitioner UI
  return (
    <div className="flex min-h-screen">
      <Sidebar locale={locale} session={session} />

      <button
        onClick={() => setMobileNavOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-lg glass-floating"
        aria-label="Open menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      <MobileNav locale={locale} open={mobileNavOpen} onOpenChange={setMobileNavOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar locale={locale} session={session} />
        <main className="flex-1 animate-fade-in">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {view === 'dashboard' && <DashboardView locale={locale} />}
              {view === 'patients' && <PatientsView locale={locale} />}
              {view === 'appointments' && <AppointmentsView locale={locale} />}
              {view === 'records' && <RecordsView locale={locale} />}
              {view === 'billing' && <BillingView locale={locale} />}
              {view === 'audit' && <AuditView locale={locale} />}
              {view === 'inventory' && <InventoryView locale={locale} />}
              {view === 'settings' && <SettingsView locale={locale} />}
              {view === 'sustainability' && <SustainabilityView locale={locale} />}
              {view === 'triage' && <TriageView locale={locale} />}
              {view === 'documents' && <DocumentsView locale={locale} />}
              {view === 'labs' && <LabsView locale={locale} />}
              {view === 'telemedicine' && <TelemedicineView locale={locale} />}
              {view === 'staff' && <StaffView locale={locale} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <FloatingDock locale={locale} />
      <CommandPalette locale={locale} />
    </div>
  )
}

// Inline import to avoid circular dependency issues
import { HeartPulse } from 'lucide-react'

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  )
}
