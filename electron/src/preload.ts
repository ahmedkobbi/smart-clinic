// Smart Clinic — Preload Script
// Runs in isolated context between main process and renderer
// Exposes a STRICT, typed API to the renderer via contextBridge

import { contextBridge, ipcRenderer } from 'electron'

// Type definitions for the exposed API
interface SmartClinicAPI {
  // License
  license: {
    verify: (licenseKey: string, machineInfo: any) => Promise<any>
    status: () => Promise<LicenseStatus>
    clear: () => Promise<void>
  }
  // Database (PGlite)
  db: {
    query: (sql: string, params?: any[]) => Promise<any>
  }
  // OS Keychain
  keychain: {
    get: (service: string, account: string) => Promise<string | null>
    set: (service: string, account: string, password: string) => Promise<void>
    delete: (service: string, account: string) => Promise<void>
  }
  // Auto-updater
  updater: {
    check: () => Promise<any>
    download: () => Promise<void>
    install: () => Promise<void>
    onUpdateAvailable: (callback: (info: any) => void) => void
    onDownloadProgress: (callback: (progress: any) => void) => void
  }
  // Machine info
  machine: {
    fingerprint: () => Promise<string>
  }
  // App info
  app: {
    info: () => Promise<AppInfo>
  }
  // Native dialogs
  dialog: {
    openFile: (filters?: any[], multiple?: boolean) => Promise<any>
  }
  // Print
  print: {
    html: (html: string) => Promise<void>
  }
  // Data export
  data: {
    export: () => Promise<any>
  }
  // Check if running in Electron
  isElectron: boolean
}

interface LicenseStatus {
  status: 'valid' | 'grace_period' | 'read_only' | 'expired' | 'none'
  lease?: any
  expiresAt?: string
  daysRemaining?: number
  emergencyMode?: boolean
}

interface AppInfo {
  version: string
  platform: string
  arch: string
  electron: string
  chrome: string
  node: string
}

// Expose API to renderer with contextBridge
contextBridge.exposeInMainWorld('smartclinic', {
  // License management
  license: {
    verify: (licenseKey: string, machineInfo: any) =>
      ipcRenderer.invoke('license:verify', { licenseKey, machineInfo }),
    status: () => ipcRenderer.invoke('license:status'),
    clear: () => ipcRenderer.invoke('license:clear'),
  },

  // Database queries (PGlite)
  db: {
    query: (sql: string, params?: any[]) =>
      ipcRenderer.invoke('db:query', { sql, params }),
  },

  // OS Keychain
  keychain: {
    get: (service: string, account: string) =>
      ipcRenderer.invoke('keychain:get', { service, account }),
    set: (service: string, account: string, password: string) =>
      ipcRenderer.invoke('keychain:set', { service, account, password }),
    delete: (service: string, account: string) =>
      ipcRenderer.invoke('keychain:delete', { service, account }),
  },

  // Auto-updater
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
    onUpdateAvailable: (callback: (info: any) => void) =>
      ipcRenderer.on('update-available', (_e, info) => callback(info)),
    onDownloadProgress: (callback: (progress: any) => void) =>
      ipcRenderer.on('download-progress', (_e, progress) => callback(progress)),
  },

  // Machine fingerprint
  machine: {
    fingerprint: () => ipcRenderer.invoke('machine:fingerprint'),
  },

  // App info
  app: {
    info: () => ipcRenderer.invoke('app:info'),
  },

  // Native file dialog
  dialog: {
    openFile: (filters?: any[], multiple?: boolean) =>
      ipcRenderer.invoke('dialog:openFile', { filters, multiple }),
  },

  // Print
  print: {
    html: (html: string) => ipcRenderer.invoke('print:html', { html }),
  },

  // Data export
  data: {
    export: () => ipcRenderer.invoke('data:export'),
  },

  // Flag — renderer can check if running in Electron
  isElectron: true,
} as SmartClinicAPI)
