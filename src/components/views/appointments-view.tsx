'use client'

import { useApp } from '@/lib/store'
import { getDict, formatTime, formatDate, type Locale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClock, ChevronLeft, ChevronRight, Plus, MapPin, User, Clock,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { StatusPill, appointmentStatusVariant, noShowRiskVariant } from '@/components/common/status-pill'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AppointmentForm } from './appointment-form'

interface ApptResponse { items: any[] }

async function fetchAppts(date: string): Promise<ApptResponse> {
  const from = new Date(date)
  from.setHours(0, 0, 0, 0)
  const to = new Date(date)
  to.setHours(23, 59, 59, 999)
  const res = await fetch(`/api/appointments?from=${from.toISOString()}&to=${to.toISOString()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i) // 8 AM - 6 PM

export function AppointmentsView({ locale }: { locale: Locale }) {
  const t = getDict(locale)
  const { setSelectedPatientId, setView, setNewAppointmentOpen } = useApp()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setLocalView] = useState<'day' | 'week'>('day')

  const dateStr = currentDate.toISOString().slice(0, 10)

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', dateStr],
    queryFn: () => fetchAppts(dateStr),
    refetchInterval: 30_000,
  })

  const apptsByHour = useMemo(() => {
    const map = new Map<number, any[]>()
    for (const h of HOURS) map.set(h, [])
    for (const appt of data?.items || []) {
      const h = new Date(appt.startAt).getHours()
      if (map.has(h)) map.get(h)!.push(appt)
      else map.set(h, [appt])
    }
    // Sort each hour by start time
    for (const [h, list] of map) {
      list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    }
    return map
  }, [data])

  const navigate = (delta: number) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + delta)
    setCurrentDate(d)
  }

  const goToday = () => setCurrentDate(new Date())

  const isToday = currentDate.toDateString() === new Date().toDateString()

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            {t.appointments.today}
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <div className="ml-2">
            <p className="text-sm font-semibold capitalize">
              {currentDate.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            {isToday && <p className="text-[11px] text-success">● {t.appointments.today}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg glass-base p-0.5">
            <button
              onClick={() => setLocalView('day')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === 'day' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t.appointments.day}
            </button>
            <button
              onClick={() => setLocalView('week')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === 'week' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t.appointments.week}
            </button>
          </div>
          <Button onClick={() => setNewAppointmentOpen(true)} className="bg-primary text-primary-foreground">
            <Plus className="w-4 h-4" /> {t.appointments.new}
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
          <div className="col-span-2">{t.common.time}</div>
          <div className="col-span-4">{t.appointments.patient}</div>
          <div className="col-span-3 hidden md:block">{t.appointments.practitioner}</div>
          <div className="col-span-2 hidden md:block">{t.appointments.reason}</div>
          <div className="col-span-3 md:col-span-1">{t.common.status}</div>
        </div>

        <ScrollArea className="h-[60vh]">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{t.common.loading}</div>
          ) : HOURS.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{t.common.noData}</div>
          ) : (
            <div>
              {HOURS.map((hour, hIdx) => {
                const appts = apptsByHour.get(hour) || []
                return (
                  <div key={hour} className={`grid grid-cols-12 gap-3 px-4 py-2 border-b border-border/20 min-h-[64px] ${appts.length > 0 ? 'hover:bg-accent/30' : ''}`}>
                    <div className="col-span-2 flex items-start">
                      <span className="text-xs font-mono font-semibold text-muted-foreground">
                        {String(hour).padStart(2, '0')}:00
                      </span>
                    </div>
                    <div className="col-span-10 md:col-span-10 space-y-1">
                      {appts.map((appt) => (
                        <motion.button
                          key={appt.id}
                          initial={{ x: -8, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          onClick={() => { setSelectedPatientId(appt.patientId); setView('patients') }}
                          className="w-full grid grid-cols-12 gap-3 p-2 rounded-lg glass-base hover:bg-accent/50 transition-colors text-left"
                        >
                          <div className="col-span-3 md:col-span-4 flex items-center gap-2 min-w-0">
                            <div
                              className="w-1 h-8 rounded-full shrink-0"
                              style={{ background: appt.practitioner.color }}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">
                                {appt.patient.firstName} {appt.patient.lastName}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {formatTime(appt.startAt, locale)} – {formatTime(appt.endAt, locale)}
                              </p>
                            </div>
                          </div>
                          <div className="col-span-3 hidden md:flex items-center text-xs text-muted-foreground truncate">
                            {appt.practitioner.name}
                          </div>
                          <div className="col-span-2 hidden md:flex items-center text-xs text-muted-foreground truncate">
                            {appt.reason || '—'}
                          </div>
                          <div className="col-span-6 md:col-span-2 flex items-center gap-1 flex-wrap">
                            <StatusPill
                              status={appt.status}
                              variant={appointmentStatusVariant(appt.status)}
                              label={t.appointments.status[appt.status as keyof typeof t.appointments.status]}
                            />
                            {appt.noShowRisk >= 0.3 && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                                style={{
                                  color: appt.noShowRisk >= 0.6 ? '#ef4444' : '#f59e0b',
                                  background: appt.noShowRisk >= 0.6 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                }}
                                title={t.appointments.noShowRisk}
                              >
                                {Math.round(appt.noShowRisk * 100)}%
                              </span>
                            )}
                          </div>
                          <div className="col-span-3 md:col-span-1 flex items-center justify-end">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: appt.practitioner.color }}
                              title={appt.practitioner.specialty}
                            />
                          </div>
                        </motion.button>
                      ))}
                      {appts.length === 0 && (
                        <div className="text-[11px] text-muted-foreground/60 italic py-1">
                          —
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Legend */}
      <div className="glass-base rounded-xl p-3 flex flex-wrap items-center gap-3 text-[11px]">
        <span className="font-semibold text-muted-foreground">{locale === 'fr' ? 'Légende:' : 'Legend:'}</span>
        <span className="flex items-center gap-1"><span className="status-pill text-success">{t.appointments.status.completed}</span></span>
        <span className="flex items-center gap-1"><span className="status-pill text-info">{t.appointments.status.checked_in}</span></span>
        <span className="flex items-center gap-1"><span className="status-pill text-warning">{t.appointments.status.confirmed}</span></span>
        <span className="flex items-center gap-1"><span className="status-pill text-danger">{t.appointments.status.no_show}</span></span>
        <span className="flex items-center gap-1 ml-auto text-muted-foreground">
          <Clock className="w-3 h-3" /> {locale === 'fr' ? 'Glisser pour plus d\'heures' : 'Scroll for more hours'}
        </span>
      </div>

      <AppointmentForm open={useApp.getState().newAppointmentOpen} onOpenChange={(o) => useApp.getState().setNewAppointmentOpen(o)} locale={locale} />
    </div>
  )
}
