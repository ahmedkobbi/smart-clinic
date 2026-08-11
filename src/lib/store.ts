// Smart Clinic — global UI state (Zustand)
// Per master prompt §6.1: Zustand for light client state; TanStack Query for server state.

'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Locale } from '@/lib/i18n'

export type ViewKey =
  | 'dashboard'
  | 'patients'
  | 'appointments'
  | 'records'
  | 'billing'
  | 'audit'
  | 'inventory'
  | 'settings'

export type Theme = 'light' | 'dark'
export type Density = 'comfortable' | 'compact'

interface AppState {
  // Navigation
  view: ViewKey
  setView: (v: ViewKey) => void

  // Selected patient (for detail drawer)
  selectedPatientId: string | null
  setSelectedPatientId: (id: string | null) => void

  // Selected appointment (for detail)
  selectedAppointmentId: string | null
  setSelectedAppointmentId: (id: string | null) => void

  // Command palette
  commandOpen: boolean
  setCommandOpen: (b: boolean) => void

  // Locale (FR/EN)
  locale: Locale
  setLocale: (l: Locale) => void

  // Theme
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void

  // Density
  density: Density
  setDensity: (d: Density) => void

  // Active branch filter
  activeBranchId: string | null
  setActiveBranchId: (id: string | null) => void

  // Quick patient modal
  newPatientOpen: boolean
  setNewPatientOpen: (b: boolean) => void

  // Quick appointment modal
  newAppointmentOpen: boolean
  setNewAppointmentOpen: (b: boolean) => void
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      view: 'dashboard',
      setView: (view) => set({ view }),

      selectedPatientId: null,
      setSelectedPatientId: (id) => set({ selectedPatientId: id }),

      selectedAppointmentId: null,
      setSelectedAppointmentId: (id) => set({ selectedAppointmentId: id }),

      commandOpen: false,
      setCommandOpen: (b) => set({ commandOpen: b }),

      locale: 'fr',
      setLocale: (locale) => set({ locale }),

      theme: 'light',
      setTheme: (theme) => {
        set({ theme })
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', theme === 'dark')
        }
      },
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light'
        get().setTheme(next)
      },

      density: 'comfortable',
      setDensity: (density) => set({ density }),

      activeBranchId: null,
      setActiveBranchId: (id) => set({ activeBranchId: id }),

      newPatientOpen: false,
      setNewPatientOpen: (b) => set({ newPatientOpen: b }),

      newAppointmentOpen: false,
      setNewAppointmentOpen: (b) => set({ newAppointmentOpen: b }),
    }),
    {
      name: 'smartclinic-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        locale: s.locale,
        theme: s.theme,
        density: s.density,
        activeBranchId: s.activeBranchId,
      }),
    }
  )
)
