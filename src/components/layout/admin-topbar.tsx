'use client'

import { useApp } from '@/lib/store'
import { type Locale } from '@/lib/i18n'
import { type Session } from 'next-auth/react'
import {
  Search, Command, Globe, Moon, Sun, ChevronRight,
  Crown, ShieldCheck,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'

const TITLE_MAP: Record<string, { fr: string; en: string }> = {
  'admin-dashboard': { fr: 'Vue d\'ensemble', en: 'Overview' },
  'admin-licenses': { fr: 'Licences', en: 'Licenses' },
  'admin-instances': { fr: 'Instances', en: 'Instances' },
  'admin-updates': { fr: 'Mises à jour', en: 'Updates' },
  'admin-actions': { fr: 'Journal admin', en: 'Admin log' },
}

export function AdminTopBar({ locale, session }: { locale: Locale; session: Session | null }) {
  const { setCommandOpen, setLocale, toggleTheme, theme, view, setUserMode } = useApp()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const title = TITLE_MAP[view]?.[locale as 'fr' | 'en'] || 'Admin'

  return (
    <header className="sticky top-0 z-30 glass-base border-b border-border/40">
      <div className="flex items-center gap-3 px-4 md:px-6 py-3">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <Crown className="w-3.5 h-3.5 text-glass-warm" />
          <span className="hidden md:inline">{locale === 'fr' ? 'Console Propriétaire' : 'Owner Console'}</span>
          <ChevronRight className="w-3 h-3 hidden md:inline" />
          <span className="font-medium text-foreground">{title}</span>
        </div>

        {/* Date */}
        <div className="flex-1 min-w-0 ml-2">
          <h2 className="text-base font-semibold leading-tight truncate hidden md:block">
            {now.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
        </div>

        {/* Command palette */}
        <button
          onClick={() => setCommandOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg glass-button text-sm text-muted-foreground hover:text-foreground min-w-[260px]"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left">{locale === 'fr' ? 'Rechercher…' : 'Search…'}</span>
          <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono rounded bg-muted border border-border">
            <Command className="w-3 h-3" /> K
          </kbd>
        </button>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
                className="p-2 rounded-lg glass-button text-foreground/70 hover:text-foreground"
              >
                <Globe className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{locale === 'fr' ? 'English' : 'Français'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg glass-button text-foreground/70 hover:text-foreground"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>{theme === 'dark' ? 'Light' : 'Dark'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Security status */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-base text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-success" />
          <span className="text-muted-foreground">{locale === 'fr' ? 'Sécurisé' : 'Secured'}</span>
        </div>

        {/* User chip */}
        <div className="flex items-center gap-2 p-1 pr-2 rounded-lg glass-button">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-glass-warm to-glass-accent flex items-center justify-center text-white text-xs font-semibold">
            {(session?.user?.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}
          </div>
          <span className="text-xs text-glass-warm font-medium hidden md:block">SUPERADMIN</span>
        </div>
      </div>
    </header>
  )
}
