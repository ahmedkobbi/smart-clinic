// Smart Clinic — Native Menu
// Per master prompt §7.2: premium, fast, trustworthy tool — not a generic admin panel

import { app, BrowserWindow, Menu, shell, dialog } from 'electron'
import * as path from 'path'

export function createMenu(mainWindow: BrowserWindow): Menu {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' as const },
            { type: 'separator' as const },
            { role: 'services' as const },
            { type: 'separator' as const },
            { role: 'hide' as const },
            { role: 'hideOthers' as const },
            { role: 'unhide' as const },
            { type: 'separator' as const },
            { role: 'quit' as const },
          ],
        }]
      : []),

    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Patient',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu:new-patient'),
        },
        {
          label: 'New Appointment',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => mainWindow.webContents.send('menu:new-appointment'),
        },
        { type: 'separator' },
        {
          label: 'Export Patient Data',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow.webContents.send('menu:export-data'),
        },
        { type: 'separator' },
        isMac
          ? { role: 'close' }
          : { role: 'quit' },
      ],
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },

    // View menu
    {
      label: 'View',
      submenu: [
        {
          label: 'Command Palette',
          accelerator: 'CmdOrCtrl+K',
          click: () => mainWindow.webContents.send('menu:command-palette'),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },

    // Navigate menu — quick view switching
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Dashboard',
          accelerator: 'CmdOrCtrl+1',
          click: () => mainWindow.webContents.send('menu:navigate', 'dashboard'),
        },
        {
          label: 'Patients',
          accelerator: 'CmdOrCtrl+2',
          click: () => mainWindow.webContents.send('menu:navigate', 'patients'),
        },
        {
          label: 'Appointments',
          accelerator: 'CmdOrCtrl+3',
          click: () => mainWindow.webContents.send('menu:navigate', 'appointments'),
        },
        {
          label: 'Clinical Records',
          accelerator: 'CmdOrCtrl+4',
          click: () => mainWindow.webContents.send('menu:navigate', 'records'),
        },
        {
          label: 'Billing',
          accelerator: 'CmdOrCtrl+5',
          click: () => mainWindow.webContents.send('menu:navigate', 'billing'),
        },
        { type: 'separator' },
        {
          label: 'Audit & Compliance',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => mainWindow.webContents.send('menu:navigate', 'audit'),
        },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow.webContents.send('menu:navigate', 'settings'),
        },
      ],
    },

    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },

    // Help menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'Smart Clinic Documentation',
          click: () => shell.openExternal('https://github.com/ahmedkobbi/smart-clinic'),
        },
        {
          label: 'Report an Issue',
          click: () => shell.openExternal('https://github.com/ahmedkobbi/smart-clinic/issues'),
        },
        {
          label: 'Check for Updates',
          click: () => mainWindow.webContents.send('menu:check-updates'),
        },
        { type: 'separator' },
        {
          label: 'License Information',
          click: () => mainWindow.webContents.send('menu:license-info'),
        },
        { type: 'separator' },
        {
          label: `About Smart Clinic v${app.getVersion()}`,
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Smart Clinic',
              message: `Smart Clinic v${app.getVersion()}`,
              detail: [
                'Enterprise Clinical Practice Management Platform',
                '',
                `Version: ${app.getVersion()}`,
                `Electron: ${process.versions.electron}`,
                `Chrome: ${process.versions.chrome}`,
                `Node.js: ${process.versions.node}`,
                `Platform: ${process.platform} ${process.arch}`,
                '',
                'RGPD · HDS · ISO 27001 (cible)',
                '© 2026 Smart Clinic',
              ].join('\n'),
              buttons: ['OK'],
            })
          },
        },
      ],
    },
  ]

  return Menu.buildFromTemplate(template)
}
