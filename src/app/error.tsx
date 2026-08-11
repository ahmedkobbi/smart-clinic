'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="glass-floating rounded-3xl w-full max-w-md p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
          className="w-16 h-16 rounded-2xl bg-destructive/15 flex items-center justify-center mx-auto mb-4"
        >
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </motion.div>
        <h2 className="text-xl font-bold mb-2">Une erreur est survenue</h2>
        <p className="text-sm text-muted-foreground mb-6">
          L'application a rencontré une erreur inattendue. Vous pouvez réessayer ou retourner à l'accueil.
        </p>
        {error.digest && (
          <p className="text-[10px] text-muted-foreground font-mono mb-4">ID: {error.digest}</p>
        )}
        <div className="flex gap-2 justify-center">
          <Button onClick={reset} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
          <Button onClick={() => window.location.href = '/'}>
            <Home className="w-4 h-4 mr-2" />
            Accueil
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
