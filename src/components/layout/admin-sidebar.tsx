'use client'

import { useApp, type ViewKey } from '@/lib/store'
import { getDict, type Locale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { signOut, type Session } from 'next-auth/react'
import {
  LayoutDashboard, KeyRound, Monitor, Upload, Activity,
  ShieldCheck, LogOut, ArrowLeft, Crown,
} from 'lucide-react'

const ADMIN_NAV: { key: ViewKey; icon: any; labelKey: string }[] = [
  { key: 'admin-dashboard', icon: LayoutDashboard, labelKey: 'overview' },
  { key: 'admin-licenses', icon: KeyRound, labelKey: 'licenses' },
  { key: 'admin-instances', icon: Monitor, labelKey: 'instances' },
  { key: 'admin-updates', icon: Upload, labelKey: 'updates' },
  { key: 'admin-telemetry', icon: Activity, labelKey: 'telemetry' },
  { key: 'admin-actions', icon: ShieldCheck, labelKey: 'actions' },
]

export function AdminSidebar({ locale, session }: { locale: Locale; session: Session | null }) {
  const { view, setView, setUserMode } = useApp()
  const t = getDict(locale)

  const getLabel = (labelKey: string) => {
    const section = (t.admin as any)[labelKey]
    return section?.title || labelKey
  }

  return (
    <aside className="glass-base hidden md:flex flex-col w-64 shrink-0 border-r h-screen sticky top-0">
      {/* Brand — owner side */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-border/40">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="relative w-10 h-10 rounded-xl glass-raised flex items-center justify-center"
        >
          <Crown className="w-5 h-5 text-glass-warm" />
          <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-glass-warm border-2 border-background" />
        </motion.div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold leading-tight">Smart Clinic</h1>
          <p className="text-[11px] text-glass-warm leading-tight truncate font-medium">
            {t.admin.console}
          </p>
        </div>
      </div>

      {/* Back to clinic mode */}
      <div className="px-3 pt-3">
        <button
          onClick={() => setUserMode('clinic')}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t.admin.backToClinic}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scroll-area-glass">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t.admin.licensing}
        </p>
        {ADMIN_NAV.map((item, idx) => {
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
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-glass-warm' : ''}`} />
              <span>{getLabel(item.labelKey)}</span>
            </motion.button>
          )
        })}
      </nav>

      {/* User + security badge */}
      <div className="m-3 space-y-2">
        <div className="p-3 rounded-xl glass-raised">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-glass-warm to-glass-accent flex items-center justify-center text-xs font-semibold text-white">
              {(session?.user?.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{session?.user?.name}</p>
              <p className="text-[10px] text-glass-warm truncate font-medium">SUPERADMIN</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">{t.admin.overview.systemStatus}</span>
            <span className="status-pill text-success">{t.admin.online}</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
          <ShieldCheck className="w-3 h-3 text-success" />
          Ed25519 · JWT · mTLS
        </p>
      </div>
    </aside>
  )
}
