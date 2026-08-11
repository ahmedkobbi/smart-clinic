'use client'

import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  format?: (n: number) => string
  duration?: number
  className?: string
}

export function AnimatedNumber({ value, format, duration = 0.8, className }: AnimatedNumberProps) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => {
    return format ? format(latest) : Math.round(latest).toLocaleString()
  })
  const [display, setDisplay] = useState(format ? format(0) : '0')

  useEffect(() => {
    const controls = animate(count, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        setDisplay(format ? format(v) : Math.round(v).toLocaleString())
      },
    })
    return controls.stop
  }, [value, duration])

  return <span className={className}>{display}</span>
}
