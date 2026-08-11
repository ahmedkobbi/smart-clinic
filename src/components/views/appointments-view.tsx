'use client'

import { useApp } from '@/lib/store'
import { getDict, formatTime, formatDate, type Locale } from '@/lib/i18n'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Plus, Clock, Loader2,
  CheckCircle2, LogIn, Play, XCircle, UserCheck,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { StatusPill, appointmentStatusVariant, noShowRiskVariant } from '@/components/common/status-pill'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EmptyState } from '@/components/common/empty-state'
import { SkeletonList } from '@/components/common/skeleton'
import { AppointmentForm } from './appointment-form'
import { toast } from 'sonner'

interface ApptResponse { items: any[] }

async function fetchApptsRange(from: string, to: string): Promise<ApptResponse> {
  const res = await fetch(`/api/appointments?from=${from}&to=${to}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i) // 8 AM - 6 PM

const STATUS_ACTIONS = [
  { from: 'scheduled', to: 'confirmed', label: { fr: 'Confirmer', en: 'Confirm' }, icon: CheckCircle2, color: 'text-success' },
  { from: 'confirmed', to: 'checked_in', label: { fr: 'Check-in', en: 'Check-in' }, icon: LogIn, color: 'text-info' },
  { from: 'checked_in', to: 'in_session', label: { fr: 'Démarrer', en: 'Start' }, icon: Play, color: 'text-info' },
  { from: 'in_session', to: 'completed', label: { fr: 'Terminer', en: 'Complete' }, icon: CheckCircle2, color: 'text-success' },
] as const

export function AppointmentsView({ locale }: { locale: Locale }) {
  const t = getDict(locale)
  const { setSelectedPatientId, setView, setNewAppointmentOpen } = useApp()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')

  // Compute date range based on view mode
  const { rangeFrom, rangeTo, weekDays } = useMemo(() => {
    if (viewMode === 'day') {
      const from = new Date(currentDate)
      from.setHours(0, 0, 0, 0)
      const to = new Date(currentDate)
      to.setHours(23, 59, 59, 999)
      return { rangeFrom: from.toISOString(), rangeTo: to.toISOString(), weekDays: [currentDate] }
    }
    // Week view — Monday to Sunday
    const monday = new Date(currentDate)
    const day = monday.getDay()
    const diff = day === 0 ? -6 : 1 - day
    monday.setDate(monday.getDate() + diff)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(d.getDate() + i)
      return d
    })
    return { rangeFrom: monday.toISOString(), rangeTo: sunday.toISOString(), weekDays: days }
  }, [currentDate, viewMode])

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', rangeFrom, rangeTo],
    queryFn: () => fetchApptsRange(rangeFrom, rangeTo),
    refetchInterval: 30_000,
  })

  const apptsByDay = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const appt of data?.items || []) {
      const key = new Date(appt.startAt).toISOString().slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(appt)
    }
    for (const [, list] of map) {
      list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    }
    return map
  }, [data])

  const navigate = (delta: number) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + (viewMode === 'week' ? delta * 7 : delta))
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
              {viewMode === 'day'
                ? currentDate.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                : `${weekDays[0].toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })} — ${weekDays[6].toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`}
            </p>
            {isToday && <p className="text-[11px] text-success">● {t.appointments.today}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg glass-base p-0.5">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'day' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t.appointments.day}
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'week' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t.appointments.week}
            </button>
          </div>
          <Button onClick={() => setNewAppointmentOpen(true)} className="bg-primary text-primary-foreground h-9">
            <Plus className="w-4 h-4" /> {t.appointments.new}
          </Button>
        </div>
      </div>

      {viewMode === 'day' ? (
        <DayView
          date={currentDate}
          appts={apptsByDay.get(currentDate.toISOString().slice(0, 10)) || []}
          isLoading={isLoading}
          locale={locale}
          t={t}
          onPatientClick={(id) => { setSelectedPatientId(id); setView('patients') }}
        />
      ) : (
        <WeekView
          weekDays={weekDays}
          apptsByDay={apptsByDay}
          isLoading={isLoading}
          locale={locale}
          t={t}
          onPatientClick={(id) => { setSelectedPatientId(id); setView('patients') }}
        />
      )}

      {/* Legend */}
      <div className="glass-base rounded-xl p-3 flex flex-wrap items-center gap-3 text-[11px]">
        <span className="font-semibold text-muted-foreground">{locale === 'fr' ? 'Légende:' : 'Legend:'}</span>
        <span className="flex items-center gap-1"><span className="status-pill text-success">{t.appointments.status.completed}</span></span>
        <span className="flex items-center gap-1"><span className="status-pill text-info">{t.appointments.status.checked_in}</span></span>
        <span className="flex items-center gap-1"><span className="status-pill text-warning">{t.appointments.status.confirmed}</span></span>
        <span className="flex items-center gap-1"><span className="status-pill text-danger">{t.appointments.status.no_show}</span></span>
      </div>

      <AppointmentForm open={useApp.getState().newAppointmentOpen} onOpenChange={(o) => useApp.getState().setNewAppointmentOpen(o)} locale={locale} />
    </div>
  )
}

function DayView({ date, appts, isLoading, locale, t, onPatientClick }: any) {
  const qc = useQueryClient()
  const apptsByHour = useMemo(() => {
    const map = new Map<number, any[]>()
    for (const h of HOURS) map.set(h, [])
    for (const appt of appts) {
      const h = new Date(appt.startAt).getHours()
      if (map.has(h)) map.get(h)!.push(appt)
      else map.set(h, [appt])
    }
    for (const [, list] of map) list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    return map
  }, [appts])

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="grid grid-cols-12 gap-3 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
        <div className="col-span-2">{t.common.time}</div>
        <div className="col-span-4 md:col-span-4">{t.appointments.patient}</div>
        <div className="col-span-3 hidden md:block">{t.appointments.practitioner}</div>
        <div className="col-span-2 hidden md:block">{t.appointments.reason}</div>
        <div className="col-span-3 md:col-span-1">{t.common.status}</div>
      </div>

      <ScrollArea className="h-[60vh]">
        {isLoading ? (
          <SkeletonList rows={8} />
        ) : (
          <div>
            {HOURS.map((hour) => {
              const hourAppts = apptsByHour.get(hour) || []
              return (
                <div key={hour} className={`grid grid-cols-12 gap-3 px-4 py-2 border-b border-border/20 min-h-[64px] ${hourAppts.length > 0 ? 'hover:bg-accent/30' : ''}`}>
                  <div className="col-span-2 flex items-start">
                    <span className="text-xs font-mono font-semibold text-muted-foreground">
                      {String(hour).padStart(2, '0')}:00
                    </span>
                  </div>
                  <div className="col-span-10 md:col-span-10 space-y-1">
                    {hourAppts.map((appt: any) => (
                      <ApptRow key={appt.id} appt={appt} locale={locale} t={t} onPatientClick={onPatientClick} onStatusChange={() => qc.invalidateQueries({ queryKey: ['appointments'] })} />
                    ))}
                    {hourAppts.length === 0 && (
                      <div className="text-[11px] text-muted-foreground/60 italic py-1">—</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

function WeekView({ weekDays, apptsByDay, isLoading, locale, t, onPatientClick }: any) {
  const qc = useQueryClient()
  const today = new Date().toDateString()

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <ScrollArea className="h-[60vh]">
        {isLoading ? (
          <div className="p-4"><SkeletonList rows={6} /></div>
        ) : (
          <div className="grid grid-cols-7 divide-x divide-border/20">
            {weekDays.map((day: Date) => {
              const key = day.toISOString().slice(0, 10)
              const dayAppts = apptsByDay.get(key) || []
              const isToday = day.toDateString() === today
              return (
                <div key={key} className="min-h-[400px]">
                  {/* Day header */}
                  <div className={`p-2 border-b border-border/30 text-center ${isToday ? 'bg-primary/10' : ''}`}>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                      {day.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short' })}
                    </p>
                    <p className={`text-sm font-mono ${isToday ? 'text-primary font-bold' : ''}`}>
                      {day.getDate()}
                    </p>
                  </div>
                  {/* Appointments */}
                  <div className="p-1 space-y-1">
                    {dayAppts.map((appt: any) => (
                      <button
                        key={appt.id}
                        onClick={() => onPatientClick(appt.patientId)}
                        className="w-full text-left p-1.5 rounded-md glass-base hover:bg-accent/50 transition-colors"
                        style={{ borderLeft: `2px solid ${appt.practitioner.color}` }}
                      >
                        <p className="text-[10px] font-mono text-muted-foreground">{formatTime(appt.startAt, locale)}</p>
                        <p className="text-[11px] font-medium truncate">{appt.patient.firstName} {appt.patient.lastName}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{appt.practitioner.name}</p>
                        <div className="mt-0.5">
                          <StatusPillMini status={appt.status} locale={locale} t={t} />
                        </div>
                      </button>
                    ))}
                    {dayAppts.length === 0 && (
                      <p className="text-[10px] text-muted-foreground/40 text-center py-2">—</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

function ApptRow({ appt, locale, t, onPatientClick, onStatusChange }: any) {
  const [updating, setUpdating] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/appointments/${appt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      toast.success(locale === 'fr' ? `Statut → ${t.appointments.status[newStatus as keyof typeof t.appointments.status]}` : `Status → ${newStatus}`)
      onStatusChange()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setUpdating(false)
    }
  }

  const nextAction = STATUS_ACTIONS.find(a => a.from === appt.status)

  return (
    <motion.div
      initial={{ x: -8, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="grid grid-cols-12 gap-3 p-2 rounded-lg glass-base hover:bg-accent/50 transition-colors"
    >
      <button onClick={() => onPatientClick(appt.patientId)} className="col-span-4 md:col-span-4 flex items-center gap-2 min-w-0 text-left">
        <div className="w-1 h-8 rounded-full shrink-0" style={{ background: appt.practitioner.color }} />
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{appt.patient.firstName} {appt.patient.lastName}</p>
          <p className="text-[10px] text-muted-foreground font-mono">{formatTime(appt.startAt, locale)} – {formatTime(appt.endAt, locale)}</p>
        </div>
      </button>
      <div className="col-span-3 hidden md:flex items-center text-xs text-muted-foreground truncate">
        {appt.practitioner.name}
      </div>
      <div className="col-span-2 hidden md:flex items-center text-xs text-muted-foreground truncate">
        {appt.reason || '—'}
      </div>
      <div className="col-span-4 md:col-span-2 flex items-center gap-1 flex-wrap">
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
      <div className="col-span-4 md:col-span-1 flex items-center justify-end gap-1">
        {nextAction && (
          <button
            onClick={() => handleStatusChange(nextAction.to)}
            disabled={updating}
            className={`p-1 rounded hover:bg-accent/50 transition-colors ${nextAction.color}`}
            title={nextAction.label[locale as 'fr' | 'en']}
          >
            {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <nextAction.icon className="w-3.5 h-3.5" />}
          </button>
        )}
        {(appt.status === 'scheduled' || appt.status === 'confirmed') && (
          <button
            onClick={() => handleStatusChange('cancelled')}
            disabled={updating}
            className="p-1 rounded hover:bg-accent/50 transition-colors text-destructive"
            title={t.appointments.status.cancelled}
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

function StatusPillMini({ status, locale, t }: any) {
  const variant = appointmentStatusVariant(status)
  const variantClasses = {
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
    danger: 'bg-destructive/15 text-destructive',
    info: 'bg-info/15 text-info',
    neutral: 'bg-muted text-muted-foreground',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${variantClasses[variant]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {t.appointments.status[status as keyof typeof t.appointments.status]}
    </span>
  )
}
