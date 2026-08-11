'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Activity } from 'lucide-react'
import { useState, useEffect } from 'react'
import { type Locale, getDict } from '@/lib/i18n'

interface LiveIndicatorProps {
  isFetching: boolean
  lastUpdated: Date | null
  onRefresh: () => void
  locale: Locale
  intervalMs?: number
}

export function LiveIndicator({ isFetching, lastUpdated, onRefresh, locale, intervalMs = 30000 }: LiveIndicatorProps) {
  const t = getDict(locale)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const secondsAgo = lastUpdated ? Math.floor((now.getTime() - lastUpdated.getTime()) / 1000) : null

  const formatAgo = (s: number) => {
    if (s < 5) return t.common.timeAgo.justNow
    if (s < 60) return t.common.timeAgo.secondsAgo.replace('{n}', String(s))
    if (s < 3600) return t.common.timeAgo.minutesAgo.replace('{n}', String(Math.floor(s / 60)))
    return t.common.timeAgo.hoursAgo.replace('{n}', String(Math.floor(s / 3600)))
  }

  return (
    <div className="flex items-center gap-2">
      {/* Live badge with pulsing dot */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-base">
        <div className="relative">
          <div className={`w-2 h-2 rounded-full ${isFetching ? 'bg-glass-warm' : 'bg-success'}`} />
          {!isFetching && (
            <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" />
          )}
        </div>
        <span className="text-[10px] font-medium text-muted-foreground">
          {isFetching ? t.admin.refreshing : t.admin.live}
        </span>
      </div>

      {/* Last updated */}
      {secondsAgo !== null && (
        <span className="text-[10px] text-muted-foreground font-mono hidden md:inline">
          {t.admin.lastUpdated}: {formatAgo(secondsAgo)}
        </span>
      )}

      {/* Manual refresh */}
      <button
        onClick={onRefresh}
        disabled={isFetching}
        className="p-1.5 rounded-md glass-button text-muted-foreground hover:text-foreground transition-colors"
        title={t.admin.refresh}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )
}
