// Smart Clinic — System Tray
// Per master prompt §7.2: premium tool with always-available access

import { app, Tray, Menu, BrowserWindow, nativeImage } from 'electron'
import * as path from 'path'

export function createTray(mainWindow: BrowserWindow, licenseState: any): Tray {
  // Create a simple tray icon (1x1 transparent image as placeholder)
  // In production, this would be a proper .ico/.png icon
  const icon = nativeImage.createEmpty()
  const tray = new Tray(icon)
  tray.setToolTip('Smart Clinic')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Smart Clinic v${app.getVersion()}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: licenseState.status === 'valid'
        ? `✓ License valid — ${licenseState.daysRemaining || 0} days remaining`
        : licenseState.status === 'grace_period'
        ? `⚠ License grace period — ${Math.abs(licenseState.daysRemaining || 0)} days expired`
        : licenseState.status === 'read_only'
        ? '⚠ Emergency read-only mode'
        : '✗ No license',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Show Smart Clinic',
      click: () => {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.show()
        mainWindow.focus()
      },
    },
    {
      label: 'New Patient',
      click: () => mainWindow.webContents.send('menu:new-patient'),
    },
    {
      label: 'New Appointment',
      click: () => mainWindow.webContents.send('menu:new-appointment'),
    },
    { type: 'separator' },
    {
      label: 'Check for Updates',
      click: () => mainWindow.webContents.send('menu:check-updates'),
    },
    { type: 'separator' },
    {
      label: 'Quit Smart Clinic',
      click: () => app.quit(),
    },
  ])

  tray.setContextMenu(contextMenu)

  // Click on tray icon shows the window
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  return tray
}
