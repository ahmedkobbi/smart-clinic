// Smart Clinic — Mantine theme configuration
// Per master prompt §6.1: Mantine 9.5.x as primary component library
// Per §7.1: CSS-variables based, single source of truth with Tailwind

import { createTheme, MantineColorsTuple } from '@mantine/core'

// Convert our oklch tokens to hex for Mantine (Mantine doesn't support oklch natively)
// These match the CSS custom properties in globals.css
const clinicalTeal = '#0ea5e9' // --primary
const clinicalAccent = '#14b8a6' // --glass-accent
const clinicalWarm = '#f59e0b' // --glass-warm

// Build a Mantine color scale (10 shades) for primary
const primaryScale: MantineColorsTuple = [
  '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9',
  '#0284c7', '#0369a1', '#075985', '#0c4a6e', '#082f49',
]

const accentScale: MantineColorsTuple = [
  '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6',
  '#0d9488', '#0f766e', '#115e59', '#134e4a', '#042f2e',
]

const warmScale: MantineColorsTuple = [
  '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b',
  '#d97706', '#b45309', '#92400e', '#78350f', '#451a03',
]

export const mantineTheme = createTheme({
  primaryColor: 'clinical-blue',
  primaryShade: { light: 4, dark: 5 },
  colors: {
    'clinical-blue': primaryScale,
    'clinical-teal': accentScale,
    'clinical-warm': warmScale,
  },
  fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, sans-serif',
  fontFamilyMonospace: 'var(--font-geist-mono), ui-monospace, monospace',
  headings: {
    fontFamily: 'var(--font-geist-sans), sans-serif',
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '2rem', lineHeight: '1.2' },
      h2: { fontSize: '1.5rem', lineHeight: '1.3' },
      h3: { fontSize: '1.25rem', lineHeight: '1.4' },
    },
  },
  radius: {
    xs: 'calc(var(--radius) - 6px)',
    sm: 'calc(var(--radius) - 4px)',
    md: 'calc(var(--radius) - 2px)',
    lg: 'var(--radius)',
    xl: 'calc(var(--radius) + 4px)',
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Textarea: {
      defaultProps: {
        radius: 'md',
      },
    },
    Select: {
      defaultProps: {
        radius: 'md',
      },
    },
    Badge: {
      defaultProps: {
        radius: 'xl',
      },
    },
    Card: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'lg',
        centered: true,
        overlayProps: {
          blur: 8,
        },
      },
    },
    ActionIcon: {
      defaultProps: {
        radius: 'md',
      },
    },
  },
})
