'use client'

import { useApp, type ViewKey } from '@/lib/store'
import { getDict, type Locale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { signOut, type Session } from 'next-auth/react'
import {
  LayoutDashboard, Users, CalendarClock, FileText, Receipt,
  ShieldCheck, Package, Settings, HeartPulse, Leaf, Stethoscope,
  LogOut, FolderOpen, FlaskConical, Video, IdCard, Crown,
} from 'lucide-react'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'

const NAV_ITEMS: { key: ViewKey; icon: any; }[] = [
  { key: 'dashboard', icon: LayoutDashboard },
  { key: 'patients', icon: Users },
  { key: 'appointments', icon: CalendarClock },
  { key: 'records', icon: FileText },
  { key: 'billing', icon: Receipt },
  { key: 'labs', icon: FlaskConical },
  { key: 'documents', icon: FolderOpen },
  { key: 'telemedicine', icon: Video },
  { key: 'staff', icon: IdCard },
  { key: 'audit', icon: ShieldCheck },
  { key: 'inventory', icon: Package },
  { key: 'triage', icon: Stethoscope },
  { key: 'sustainability', icon: Leaf },
  { key: 'settings', icon: Settings },
]

export function Sidebar({ locale, session }: { locale: Locale; session: Session | null }) {
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
          <p className="text-[11px] text-muted-foreground leading-tight truncate">
            {(session?.user as any)?.tenantName || t.app.tenant}
          </p>
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
              <span>{t.nav[item.key] || item.key}</span>
            </motion.button>
          )
        })}
      </nav>

      {/* User + deployment badge */}
      <div className="m-3 space-y-2">
        <div className="p-3 rounded-xl glass-raised">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-glass-accent flex items-center justify-center text-xs font-semibold text-primary-foreground">
              {(session?.user?.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{session?.user?.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{(session?.user as any)?.role}</p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Déconnexion</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">{t.footer.deployment}</span>
            <span className="status-pill text-success">Live</span>
          </div>
        </div>
        {/* Admin console toggle — only for superadmin */}
        {(session?.user as any)?.role === 'superadmin' && (
          <button
            onClick={() => useApp.getState().setUserMode('admin')}
            className="w-full p-2.5 rounded-xl glass-raised text-xs font-medium flex items-center gap-2 hover:bg-glass-warm/10 transition-colors group"
          >
            <div className="w-7 h-7 rounded-lg bg-glass-warm/15 flex items-center justify-center group-hover:bg-glass-warm/25 transition-colors">
              <Crown className="w-3.5 h-3.5 text-glass-warm" />
            </div>
            <div className="text-left flex-1">
              <p className="text-glass-warm font-medium">{t.admin.console}</p>
              <p className="text-[10px] text-muted-foreground">{t.admin.licensing}</p>
            </div>
          </button>
        )}
        <p className="text-[10px] text-muted-foreground text-center">{t.footer.compliant}</p>
      </div>
    </aside>
  )
}
