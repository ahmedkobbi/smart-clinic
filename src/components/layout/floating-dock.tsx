'use client'

import { useApp } from '@/lib/store'
import { getDict, type Locale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { UserPlus, CalendarPlus, FilePlus, Command as CommandIcon, Stethoscope } from 'lucide-react'

export function FloatingDock({ locale }: { locale: Locale }) {
  const { setNewPatientOpen, setNewAppointmentOpen, setCommandOpen, setView } = useApp()
  const t = getDict(locale)

  const actions = [
    { icon: UserPlus, label: t.patients.new, onClick: () => setNewPatientOpen(true) },
    { icon: CalendarPlus, label: t.appointments.new, onClick: () => setNewAppointmentOpen(true) },
    { icon: FilePlus, label: t.records.new, onClick: () => { setView('records') } },
    { icon: Stethoscope, label: t.command.actions.newConsultation, onClick: () => { setView('records') } },
  ]

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 22 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40"
    >
      <div className="glass-dock rounded-2xl px-2 py-2 flex items-center gap-1">
        {actions.map((a, i) => {
          const Icon = a.icon
          return (
            <button
              key={i}
              onClick={a.onClick}
              className="group relative flex flex-col items-center justify-center w-12 h-12 rounded-xl hover:bg-accent/50 transition-colors"
              aria-label={a.label}
            >
              <Icon className="w-5 h-5 text-foreground/70 group-hover:text-primary transition-colors" />
              <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md glass-floating text-[10px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {a.label}
              </span>
            </button>
          )
        })}
        <div className="w-px h-7 bg-border mx-1" />
        <button
          onClick={() => setCommandOpen(true)}
          className="group relative flex flex-col items-center justify-center w-12 h-12 rounded-xl hover:bg-accent/50 transition-colors"
        >
          <CommandIcon className="w-5 h-5 text-primary" />
          <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md glass-floating text-[10px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            ⌘K
          </span>
        </button>
      </div>
    </motion.div>
  )
}
