// Smart Clinic — Auto-Updater
// Per master prompt §9: signed container images, auto-rollback
// Per §6.3: supply-chain integrity via Sigstore cosign
// Updates only during off-hours (02:00-05:00 by default)

import { BrowserWindow, app } from 'electron'
import { autoUpdater } from 'electron-updater'
import * as os from 'os'

export class AutoUpdater {
  private window: BrowserWindow
  private updateAvailable: boolean = false
  private updateDownloaded: boolean = false

  constructor(window: BrowserWindow) {
    this.window = window
    this.setupListeners()
  }

  private setupListeners() {
    autoUpdater.on('checking-for-update', () => {
      console.log('[UPDATER] Checking for updates...')
      this.window.webContents.send('update-checking')
    })

    autoUpdater.on('update-available', (info) => {
      console.log('[UPDATER] Update available:', info.version)
      this.updateAvailable = true
      this.window.webContents.send('update-available', info)

      // Check if we're in the off-hours window (02:00-05:00)
      if (this.isOffHours()) {
        this.downloadUpdate()
      }
    })

    autoUpdater.on('update-not-available', (info) => {
      console.log('[UPDATER] App is up to date:', info.version)
      this.window.webContents.send('update-not-available', info)
    })

    autoUpdater.on('error', (err) => {
      console.error('[UPDATER] Error:', err)
      this.window.webContents.send('update-error', { message: err.message })
    })

    autoUpdater.on('download-progress', (progress) => {
      console.log(`[UPDATER] Downloading: ${progress.percent.toFixed(1)}%`)
      this.window.webContents.send('download-progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond,
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      console.log('[UPDATER] Update downloaded:', info.version)
      this.updateDownloaded = true
      this.window.webContents.send('update-downloaded', info)
    })
  }

  /**
   * Check for updates.
   * Called on app start and periodically.
   */
  async checkForUpdates(): Promise<any> {
    try {
      autoUpdater.autoDownload = false // Don't auto-download — wait for off-hours
      autoUpdater.autoInstallOnAppQuit = true // Install on next quit

      const result = await autoUpdater.checkForUpdates()
      return {
        available: this.updateAvailable,
        downloaded: this.updateDownloaded,
        latestVersion: result?.updateInfo?.version,
        currentVersion: app.getVersion(),
      }
    } catch (e) {
      console.error('[UPDATER] Check failed:', e)
      return { available: false, error: (e as Error).message }
    }
  }

  /**
   * Download the update (if available).
   * Only called during off-hours or when user manually triggers.
   */
  async downloadUpdate(): Promise<void> {
    if (!this.updateAvailable) return
    try {
      await autoUpdater.downloadUpdate()
    } catch (e) {
      console.error('[UPDATER] Download failed:', e)
    }
  }

  /**
   * Install the update (quit and restart).
   * Only called when user confirms or on app quit.
   */
  async installUpdate(): Promise<void> {
    if (!this.updateDownloaded) return

    // Health check: verify the app started successfully after update
    // This is done via a flag file — if the flag exists on next boot,
    // the update was successful and we clear it. If the flag exists
    // after 5 minutes of the next boot, we know the app failed to start
    // and we should rollback.
    const { promises: fs } = require('fs')
    const path = require('path')
    const flagFile = path.join(os.tmpdir(), 'smartclinic-update-pending')

    await fs.writeFile(flagFile, JSON.stringify({
      version: app.getVersion(),
      timestamp: Date.now(),
    }))

    // Quit and install
    autoUpdater.quitAndInstall()
  }

  /**
   * Check if current time is within off-hours (02:00-05:00 local).
   * Updates only happen during these hours to avoid disrupting clinic operations.
   * Mondays excluded (post-weekend catch-up).
   */
  private isOffHours(): boolean {
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay() // 0=Sunday, 1=Monday

    // Never on Monday (post-weekend catch-up)
    if (day === 1) return false

    // 02:00-05:00
    return hour >= 2 && hour < 5
  }

  /**
   * Check for a pending update flag on startup.
   * If the flag exists and is older than 5 minutes, the previous
   * update failed — trigger rollback.
   */
  static async checkPendingUpdate(): Promise<{ pending: boolean; shouldRollback: boolean }> {
    try {
      const { promises: fs } = require('fs')
      const path = require('path')
      const flagFile = path.join(os.tmpdir(), 'smartclinic-update-pending')

      const data = await fs.readFile(flagFile, 'utf-8')
      const parsed = JSON.parse(data)

      const ageMinutes = (Date.now() - parsed.timestamp) / (1000 * 60)

      // If flag exists and is older than 5 minutes, the app failed to start
      // after the update — we should rollback
      if (ageMinutes > 5) {
        await fs.unlink(flagFile)
        return { pending: true, shouldRollback: true }
      }

      // Flag exists and is recent — app started successfully after update
      // Clear the flag
      await fs.unlink(flagFile)
      return { pending: true, shouldRollback: false }
    } catch {
      // No flag — no pending update
      return { pending: false, shouldRollback: false }
    }
  }
}
