'use client'

import { useEffect } from 'react'
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
import { Menu } from 'lucide-react'
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'

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

  return (
    <div className="flex min-h-screen">
      <Sidebar locale={locale} />

      {/* Mobile menu trigger */}
      <button
        onClick={() => setMobileNavOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-lg glass-floating"
        aria-label="Open menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      <MobileNav locale={locale} open={mobileNavOpen} onOpenChange={setMobileNavOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar locale={locale} />
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
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <FloatingDock locale={locale} />
      <CommandPalette locale={locale} />
    </div>
  )
}

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  )
}
