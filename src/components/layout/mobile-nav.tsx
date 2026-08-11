'use client'

import { useApp, type ViewKey } from '@/lib/store'
import { getDict, type Locale } from '@/lib/i18n'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  LayoutDashboard, Users, CalendarClock, FileText, Receipt,
  ShieldCheck, Package, Settings, HeartPulse,
  FolderOpen, FlaskConical, Video, IdCard, Leaf, Stethoscope,
} from 'lucide-react'

const NAV_ITEMS: { key: ViewKey; icon: any }[] = [
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

export function MobileNav({ locale, open, onOpenChange }: { locale: Locale; open: boolean; onOpenChange: (b: boolean) => void }) {
  const { view, setView } = useApp()
  const t = getDict(locale)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="glass-base w-72 p-0">
        <SheetHeader className="px-5 py-5 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl glass-raised flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-sm">{t.app.name}</SheetTitle>
              <p className="text-[11px] text-muted-foreground">{t.app.tenant}</p>
            </div>
          </div>
        </SheetHeader>
        <nav className="px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = view === item.key
            return (
              <button
                key={item.key}
                onClick={() => { setView(item.key); onOpenChange(false) }}
                data-active={active}
                className="glass-nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground/70"
              >
                <Icon className={`w-4 h-4 ${active ? 'text-primary' : ''}`} />
                <span>{t.nav[item.key]}</span>
              </button>
            )
          })}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
