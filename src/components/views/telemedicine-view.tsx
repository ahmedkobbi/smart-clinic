'use client'

import { useApp } from '@/lib/store'
import { getDict, type Locale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Phone, ScreenShare,
  MessageSquare, FileText, Settings, Users, Wifi,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

async function fetchTelemedicineAppts() {
  const today = new Date().toISOString().slice(0, 10)
  const from = new Date(today)
  from.setHours(0, 0, 0, 0)
  const to = new Date(today)
  to.setHours(23, 59, 59, 999)
  const res = await fetch(`/api/appointments?from=${from.toISOString()}&to=${to.toISOString()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

export function TelemedicineView({ locale }: { locale: Locale }) {
  const t = getDict(locale)
  const { setSelectedPatientId, setView } = useApp()
  const [inCall, setInCall] = useState(false)
  const [videoOn, setVideoOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const { data } = useQuery({
    queryKey: ['telemedicine-appts'],
    queryFn: fetchTelemedicineAppts,
    refetchInterval: 30_000,
  })

  const telemedicineAppts = (data?.items || []).filter((a: any) => a.type === 'telemedicine' || a.type === 'consultation')

  useEffect(() => {
    if (inCall) {
      const id = setInterval(() => setElapsed(e => e + 1), 1000)
      return () => clearInterval(id)
    }
  }, [inCall])

  // Start/stop local video
  useEffect(() => {
    if (inCall && videoOn) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: micOn })
        .then(stream => {
          streamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
        })
        .catch(() => {
          toast.error(locale === 'fr' ? 'Accès caméra refusé' : 'Camera access denied')
          setVideoOn(false)
        })
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [inCall, videoOn, micOn, locale])

  const startCall = (appt: any) => {
    setSelectedAppt(appt)
    setElapsed(0)
    setInCall(true)
  }

  const endCall = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setInCall(false)
    setSelectedAppt(null)
    toast.success(locale === 'fr' ? `Appel terminé (${formatDuration(elapsed)})` : `Call ended (${formatDuration(elapsed)})`)
  }

  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(t => t.enabled = !videoOn)
    }
    setVideoOn(!videoOn)
  }

  const toggleMic = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => t.enabled = !micOn)
    }
    setMicOn(!micOn)
  }

  if (inCall && selectedAppt) {
    return (
      <div className="p-4 md:p-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-180px)]">
          {/* Video area */}
          <div className="lg:col-span-3 glass-card rounded-2xl overflow-hidden relative flex items-center justify-center">
            {/* Remote (placeholder — patient avatar) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-glass-accent/5">
              <div className="w-32 h-32 rounded-2xl glass-raised flex items-center justify-center text-4xl font-bold mb-4"
                style={{ background: `linear-gradient(135deg, ${stringToColor(selectedAppt.patient?.firstName + selectedAppt.patient?.lastName)}40, ${stringToColor(selectedAppt.patient?.firstName + selectedAppt.patient?.lastName)}20)` }}
              >
                {(selectedAppt.patient?.firstName[0] + selectedAppt.patient?.lastName[0]).toUpperCase()}
              </div>
              <p className="text-lg font-semibold">{selectedAppt.patient?.firstName} {selectedAppt.patient?.lastName}</p>
              <p className="text-sm text-muted-foreground">{selectedAppt.practitioner?.name}</p>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline" className="animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse mr-1" />
                  {locale === 'fr' ? 'En appel' : 'In call'}
                </Badge>
                <span className="text-sm font-mono tabular-nums">{formatDuration(elapsed)}</span>
              </div>
            </div>

            {/* Local video preview (PiP) */}
            <div className="absolute bottom-4 right-4 w-48 h-36 rounded-xl overflow-hidden glass-floating border-2 border-border/40">
              {videoOn ? (
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <VideoOff className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/50 text-white text-[9px]">
                {locale === 'fr' ? 'Vous' : 'You'}
              </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 glass-dock rounded-2xl px-3 py-2">
              <button
                onClick={toggleMic}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${micOn ? 'glass-button' : 'bg-destructive text-destructive-foreground'}`}
              >
                {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
              <button
                onClick={toggleVideo}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${videoOn ? 'glass-button' : 'bg-destructive text-destructive-foreground'}`}
              >
                {videoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </button>
              <button className="w-10 h-10 rounded-xl flex items-center justify-center glass-button">
                <ScreenShare className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-border mx-1" />
              <button
                onClick={endCall}
                className="w-12 h-10 rounded-xl flex items-center justify-center bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sidebar — patient info */}
          <div className="glass-card rounded-2xl p-4 space-y-4 overflow-y-auto scroll-area-glass">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {locale === 'fr' ? 'Patient' : 'Patient'}
              </h3>
              <button
                onClick={() => { setView('patients'); setSelectedPatientId(selectedAppt.patientId) }}
                className="text-sm font-medium hover:text-primary"
              >
                {selectedAppt.patient?.firstName} {selectedAppt.patient?.lastName}
              </button>
              {selectedAppt.reason && (
                <p className="text-xs text-muted-foreground mt-1">{selectedAppt.reason}</p>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {locale === 'fr' ? 'Actions rapides' : 'Quick actions'}
              </h3>
              <div className="space-y-1.5">
                <button
                  onClick={() => { setView('records') }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg glass-base hover:bg-accent/50 text-sm transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  {locale === 'fr' ? 'Note de consultation' : 'Consultation note'}
                </button>
                <button className="w-full flex items-center gap-2 p-2 rounded-lg glass-base hover:bg-accent/50 text-sm transition-colors">
                  <MessageSquare className="w-3.5 h-3.5 text-info" />
                  {locale === 'fr' ? 'Messagerie' : 'Chat'}
                </button>
                <button className="w-full flex items-center gap-2 p-2 rounded-lg glass-base hover:bg-accent/50 text-sm transition-colors">
                  <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                  {locale === 'fr' ? 'Paramètres' : 'Settings'}
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {locale === 'fr' ? 'Qualité' : 'Quality'}
              </h3>
              <div className="flex items-center gap-2 p-2 rounded-lg glass-base">
                <Wifi className="w-4 h-4 text-success" />
                <div className="flex-1">
                  <p className="text-xs font-medium">HD · 720p</p>
                  <p className="text-[10px] text-muted-foreground">Latence: 45ms</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24">
      {/* Hero */}
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-card rounded-2xl p-5 flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Video className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{locale === 'fr' ? 'Télémédecine' : 'Telemedicine'}</h2>
          <p className="text-xs text-muted-foreground">
            {locale === 'fr' ? 'Consultations vidéo sécurisées avec e-prescription intégrée' : 'Secure video consultations with integrated e-prescription'}
          </p>
        </div>
      </motion.div>

      {/* Today's telemedicine appointments */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          {locale === 'fr' ? 'Téléconsultations du jour' : 'Today\'s teleconsultations'}
        </h3>
        {telemedicineAppts.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
            <Video className="w-8 h-8 mx-auto mb-2 opacity-40" />
            {locale === 'fr' ? 'Aucune téléconsultation prévue' : 'No teleconsultations scheduled'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {telemedicineAppts.map((appt: any, i: number) => (
              <motion.div
                key={appt.id}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 30 }}
                className="glass-card rounded-2xl p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0"
                    style={{ background: `linear-gradient(135deg, ${stringToColor(appt.patient?.firstName + appt.patient?.lastName)}40, ${stringToColor(appt.patient?.firstName + appt.patient?.lastName)}20)` }}
                  >
                    {(appt.patient?.firstName[0] + appt.patient?.lastName[0]).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{appt.patient?.firstName} {appt.patient?.lastName}</p>
                    <p className="text-[11px] text-muted-foreground">{appt.practitioner?.name}</p>
                  </div>
                </div>
                {appt.reason && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{appt.reason}</p>}
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {new Date(appt.startAt).toLocaleTimeString(locale === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => startCall(appt)}
                    className="bg-success text-success-foreground hover:bg-success/90 h-8"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {locale === 'fr' ? 'Démarrer' : 'Start'}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function stringToColor(s: string): string {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 65%, 45%)`
}
