'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { HeartPulse, Mail, Lock, Loader2, AlertCircle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') || '/'
  const [email, setEmail] = useState('admin@cabinet-lumiere.fr')
  const [password, setPassword] = useState('smartclinic2026')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (result?.error) {
        setError('Identifiants invalides')
      } else if (result?.ok) {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-glass-accent/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="glass-floating rounded-3xl w-full max-w-md p-8 relative z-10"
      >
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
            className="w-16 h-16 rounded-2xl glass-raised flex items-center justify-center mb-4"
          >
            <HeartPulse className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="text-2xl font-bold">Smart Clinic</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plateforme de gestion de cabinet médical
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 glass-base border-0 h-11"
                placeholder="vous@cabinet.fr"
                required
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 glass-base border-0 h-11"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-primary text-primary-foreground hover:opacity-90"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Se connecter'
            )}
          </Button>
        </form>

        {/* Compliance footer */}
        <div className="mt-6 pt-6 border-t border-border/30">
          <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-success" /> RGPD
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-success" /> HDS
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-success" /> ISO 27001
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Accès réservé au personnel autorisé. Toutes les actions sont journalisées.
          </p>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 p-3 rounded-lg glass-base text-[11px] text-muted-foreground">
          <p className="font-semibold mb-1">Démo:</p>
          <p>admin@cabinet-lumiere.fr</p>
          <p>smartclinic2026</p>
        </div>
      </motion.div>
    </div>
  )
}
