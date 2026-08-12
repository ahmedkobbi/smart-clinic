'use client'

import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'
import { Spotlight } from '@mantine/spotlight'
import { mantineTheme } from '@/lib/mantine-theme'

export function MantineProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={mantineTheme} defaultColorScheme="auto">
      <Spotlight
        actions={[]}
        shortcut={['mod + k', 'ctrl + k']}
        highlightQuery
        limit={10}
        nothingFound="No results found"
      >
        <ModalsProvider>
          <Notifications position="top-right" zIndex={9999} />
          {children}
        </ModalsProvider>
      </Spotlight>
    </MantineProvider>
  )
}
