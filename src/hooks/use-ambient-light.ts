'use client'

// Smart Clinic — Ambient Light Sensor Hook
// Per master prompt §7.2: "Adaptive glass — blur/opacity intensity subtly adapts
// to ambient light (via the Ambient Light Sensor API where available, degrading gracefully)"
//
// This is a genuinely novel touch not present in existing clinic software.

import { useState, useEffect } from 'react'

interface AmbientLightState {
  illuminance: number | null // lux
  level: 'dark' | 'dim' | 'normal' | 'bright'
  supported: boolean
}

export function useAmbientLight(): AmbientLightState {
  const [state, setState] = useState<AmbientLightState>({
    illuminance: null,
    level: 'normal',
    supported: false,
  })

  useEffect(() => {
    // Check if Ambient Light Sensor API is available
    if (typeof window === 'undefined' || !('AmbientLightSensor' in window)) {
      return
    }

    try {
      const sensor = new (window as any).AmbientLightSensor({ frequency: 1 })

      const updateState = (illuminance: number) => {
        let level: AmbientLightState['level'] = 'normal'
        if (illuminance < 10) level = 'dark'
        else if (illuminance < 50) level = 'dim'
        else if (illuminance < 500) level = 'normal'
        else level = 'bright'

        setState({ illuminance, level, supported: true })
      }

      sensor.addEventListener('reading', () => {
        updateState(sensor.illuminance)
      })

      sensor.addEventListener('error', () => {
        // Permission denied or hardware unavailable — degrade gracefully
        setState({ illuminance: null, level: 'normal', supported: false })
      })

      sensor.start()

      return () => {
        sensor.stop()
      }
    } catch {
      // API exists but not usable — degrade gracefully
    }
  }, [])

  return state
}

// CSS class mapping for glass intensity based on ambient light
export function getGlassIntensity(level: AmbientLightState['level']): string {
  switch (level) {
    case 'dark':
      return 'glass-intensity-dark' // stronger blur, more opaque
    case 'dim':
      return 'glass-intensity-dim'
    case 'bright':
      return 'glass-intensity-bright' // lighter blur, more transparent
    default:
      return '' // default glass
  }
}
