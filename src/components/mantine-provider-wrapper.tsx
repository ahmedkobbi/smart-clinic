'use client'

import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'
import { mantineTheme } from '@/lib/mantine-theme'

export function MantineProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={mantineTheme} defaultColorScheme="auto">
      <ModalsProvider>
        <Notifications position="top-right" zIndex={9999} />
        {children}
      </ModalsProvider>
    </MantineProvider>
  )
}
