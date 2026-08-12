'use client'

import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'
import { mantineTheme } from '@/lib/mantine-theme'
import { CommandSpotlight } from '@/components/layout/command-spotlight'

export function MantineProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={mantineTheme} defaultColorScheme="auto">
      <ModalsProvider>
        <Notifications position="top-right" zIndex={9999} />
        {children}
        <CommandSpotlight />
      </ModalsProvider>
    </MantineProvider>
  )
}
