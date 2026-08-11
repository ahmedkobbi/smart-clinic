'use client'

import { useApp, type ViewKey } from '@/lib/store'
import { getDict, type Locale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, CalendarClock, FileText, Receipt,
  ShieldCheck, Package, Settings, HeartPulse,
} from 'lucide-react'

const NAV_ITEMS: { key: ViewKey; icon: any }[] = [
  { key: 'dashboard', icon: LayoutDashboard },
  { key: 'patients', icon: Users },
  { key: 'appointments', icon: CalendarClock },
  { key: 'records', icon: FileText },
  { key: 'billing', icon: Receipt },
  { key: 'audit', icon: ShieldCheck },
  { key: 'inventory', icon: Package },
  { key: 'settings', icon: Settings },
]

export function Sidebar({ locale }: { locale: Locale }) {
  const { view, setView } = useApp()
  const t = getDict(locale)

  return (
    <aside className="glass-base hidden md:flex flex-col w-64 shrink-0 border-r h-screen sticky top-0">
      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-border/40">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="relative w-10 h-10 rounded-xl glass-raised flex items-center justify-center"
        >
          <HeartPulse className="w-5 h-5 text-primary" />
          <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-success border-2 border-background" />
        </motion.div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold leading-tight">{t.app.name}</h1>
          <p className="text-[11px] text-muted-foreground leading-tight truncate">{t.app.tenant}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scroll-area-glass">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t.app.tagline}
        </p>
        {NAV_ITEMS.map((item, idx) => {
          const Icon = item.icon
          const active = view === item.key
          return (
            <motion.button
              key={item.key}
              initial={{ x: -8, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 30, type: 'spring', stiffness: 200, damping: 25 }}
              onClick={() => setView(item.key)}
              data-active={active}
              className="glass-nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-accent/50"
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-primary' : ''}`} />
              <span>{t.nav[item.key]}</span>
            </motion.button>
          )
        })}
      </nav>

      {/* Deployment badge */}
      <div className="m-3 p-3 rounded-xl glass-raised text-xs">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium">{t.footer.deployment}</span>
          <span className="status-pill text-success">Live</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">{t.footer.compliant}</p>
        <p className="text-[10px] text-muted-foreground mt-1">{t.footer.version}</p>
      </div>
    </aside>
  )
}
