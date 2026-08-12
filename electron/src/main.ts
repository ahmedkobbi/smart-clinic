// Smart Clinic — Electron Main Process
// Per master prompt §8.3: "Clinic-in-a-Box" — single-tenant, self-hosted, offline-first
// Per §9: contextIsolation: true, nodeIntegration: false, sandbox: true

import { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, shell, dialog } from 'electron'
import * as path from 'path'
import { LicenseManager } from './license'
import { AutoUpdater } from './updater'
import { DatabaseManager } from './db'
import { createMenu } from './menu'
import { createTray } from './tray'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let licenseManager: LicenseManager
let dbManager: DatabaseManager
let updater: AutoUpdater

const isDev = process.env.NODE_ENV === 'development' || !!process.env.ELECTRON_DEV
const NEXT_URL = process.env.NEXT_URL || 'http://localhost:3000'

// ─────────────────────────────────────────────────────────────────────────────
// Security: prevent renderer from accessing Node.js APIs
// ─────────────────────────────────────────────────────────────────────────────

const SECURITY_CONFIG = {
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    preload: path.join(__dirname, 'preload.js'),
    // Prevent navigation to external sites
    navigationWhitelist: ['http://localhost:3000', 'file://'],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Window management
// ─────────────────────────────────────────────────────────────────────────────

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false, // Show when ready-to-show
    title: 'Smart Clinic',
    backgroundColor: '#f8fafc',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 16, y: 16 } : undefined,
    ...SECURITY_CONFIG,
  })

  // Security: prevent navigation to external URLs
  window.webContents.on('will-navigate', (event, url) => {
    const allowed = [NEXT_URL, 'file://', 'http://localhost']
    if (!allowed.some(prefix => url.startsWith(prefix))) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  // Security: open external links in browser, not in app
  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  window.once('ready-to-show', () => {
    window.show()
    if (isDev) {
      window.webContents.openDevTools({ mode: 'detach' })
    }
  })

  return window
}

function createActivationWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 600,
    height: 700,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    title: 'Smart Clinic — Activation',
    backgroundColor: '#f8fafc',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    ...SECURITY_CONFIG,
  })

  window.once('ready-to-show', () => window.show())
  return window
}

// ─────────────────────────────────────────────────────────────────────────────
// App lifecycle
// ─────────────────────────────────────────────────────────────────────────────

async function initialize() {
  console.log('[ELECTRON] Initializing Smart Clinic Desktop...')

  // 1. Initialize PGlite database
  dbManager = new DatabaseManager()
  await dbManager.initialize()
  console.log('[ELECTRON] PGlite database initialized')

  // 2. Initialize license manager
  licenseManager = new LicenseManager()
  const licenseState = await licenseManager.checkLicense()

  // 3. Create window
  if (licenseState.status === 'valid') {
    // License valid — show main app
    mainWindow = createWindow()
    await mainWindow.loadURL(NEXT_URL)
    console.log('[ELECTRON] App loaded — license valid')

    // 4. Initialize auto-updater (only when app is running, not during activation)
    updater = new AutoUpdater(mainWindow)
    await updater.checkForUpdates()
  } else if (licenseState.status === 'grace_period' || licenseState.status === 'read_only') {
    // License expired but in grace/read-only — show app with warning
    mainWindow = createWindow()
    await mainWindow.loadURL(NEXT_URL + '?license=' + licenseState.status)
    console.log('[ELECTRON] App loaded — license ' + licenseState.status)
  } else {
    // No license or expired — show activation screen
    mainWindow = createActivationWindow()
    await mainWindow.loadURL(NEXT_URL + '/login?mode=activate')
    console.log('[ELECTRON] Activation screen loaded')
  }

  // 5. Set up native menus and tray
  Menu.setApplicationMenu(createMenu(mainWindow))
  tray = createTray(mainWindow, licenseState)
}

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers — strict whitelist
// ─────────────────────────────────────────────────────────────────────────────

function registerIpcHandlers() {
  // License management
  ipcMain.handle('license:verify', async (_event, { licenseKey, machineInfo }) => {
    return licenseManager.verifyAndStore(licenseKey, machineInfo)
  })

  ipcMain.handle('license:status', async () => {
    return licenseManager.checkLicense()
  })

  ipcMain.handle('license:clear', async () => {
    return licenseManager.clearLicense()
  })

  // Database queries (renderer never touches PGlite directly)
  ipcMain.handle('db:query', async (_event, { sql, params }) => {
    return dbManager.query(sql, params)
  })

  // OS keychain
  ipcMain.handle('keychain:get', async (_event, { service, account }) => {
    const keytar = require('keytar')
    return keytar.getPassword(service, account)
  })

  ipcMain.handle('keychain:set', async (_event, { service, account, password }) => {
    const keytar = require('keytar')
    return keytar.setPassword(service, account, password)
  })

  ipcMain.handle('keychain:delete', async (_event, { service, account }) => {
    const keytar = require('keytar')
    return keytar.deletePassword(service, account)
  })

  // Auto-updater
  ipcMain.handle('updater:check', async () => {
    return updater?.checkForUpdates()
  })

  ipcMain.handle('updater:download', async () => {
    return updater?.downloadUpdate()
  })

  ipcMain.handle('updater:install', async () => {
    return updater?.installUpdate()
  })

  // Machine fingerprint
  ipcMain.handle('machine:fingerprint', async () => {
    return licenseManager.getMachineFingerprint()
  })

  // App info
  ipcMain.handle('app:info', async () => {
    return {
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
    }
  })

  // Native file dialog — for document upload
  ipcMain.handle('dialog:openFile', async (_event, { filters, multiple }) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: multiple ? ['openFile', 'multiSelections'] : ['openFile'],
      filters: filters || [
        { name: 'All Files', extensions: ['*'] },
        { name: 'Images', extensions: ['jpg', 'png', 'gif', 'bmp', 'tiff'] },
        { name: 'Documents', extensions: ['pdf', 'doc', 'docx'] },
        { name: 'DICOM', extensions: ['dcm'] },
      ],
    })
    return result
  })

  // Print — for ordonnances, invoices, patient summaries
  ipcMain.handle('print:html', async (_event, { html }) => {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    })
    await printWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    await printWindow.webContents.print()
    printWindow.close()
  })

  // Export data (for migration when license expires)
  ipcMain.handle('data:export', async () => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Export patient data',
      defaultPath: `smartclinic-export-${Date.now()}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (!result.canceled && result.filePath) {
      const data = await dbManager.exportAll()
      require('fs').writeFileSync(result.filePath, JSON.stringify(data, null, 2))
      return { success: true, path: result.filePath }
    }
    return { success: false }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// App events
// ─────────────────────────────────────────────────────────────────────────────

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    registerIpcHandlers()
    await initialize()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await initialize()
    }
  })

  app.on('before-quit', async () => {
    if (dbManager) {
      await dbManager.close()
    }
  })

  // Security: prevent webview creation
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (event) => {
      event.preventDefault()
    })
  })
}

export { mainWindow, licenseManager, dbManager }
