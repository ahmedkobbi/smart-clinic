// Smart Clinic — License Manager
// Per ADR-002: Ed25519 JWT leases, 30-day validity, emergency read-only mode
// Per master prompt §9: break-glass access for life-critical situations

import { verify, sign, createHash, randomBytes } from 'crypto'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'

// Owner's Ed25519 public key (embedded in desktop app for offline verification)
// In production, this is the REAL public key from the licensing server
// For demo, we'll generate it from the .keys/ directory
const OWNER_PUBLIC_KEY_PATH = path.join(process.cwd(), '.keys', 'ed25519-public.pem')

const LEASE_FILE = path.join(appDataDir(), 'license.lease')
const LICENSE_KEY_FILE = path.join(appDataDir(), 'license.key')

function appDataDir(): string {
  const home = os.homedir()
  const appName = 'SmartClinic'
  switch (process.platform) {
    case 'darwin':
      return path.join(home, 'Library', 'Application Support', appName)
    case 'win32':
      return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), appName)
    default:
      return path.join(home, '.config', appName.toLowerCase())
  }
}

export interface LicenseStatus {
  status: 'valid' | 'grace_period' | 'read_only' | 'expired' | 'none'
  lease?: any
  expiresAt?: string
  daysRemaining?: number
  emergencyMode?: boolean
  message?: string
}

export class LicenseManager {
  private cachedLease: any = null
  private cachedKey: string | null = null

  /**
   * Get the owner's public key for JWT verification.
   * In production, this key is hardcoded in the app binary.
   */
  private async getOwnerPublicKey(): Promise<string> {
    try {
      return await fs.readFile(OWNER_PUBLIC_KEY_PATH, 'utf-8')
    } catch {
      // Fallback: try to fetch from the licensing server on first run
      // In production, this key is baked into the app at build time
      throw new Error('Owner public key not found. Contact support.')
    }
  }

  /**
   * Check the current license state.
   * This runs entirely offline — no network call needed.
   */
  async checkLicense(): Promise<LicenseStatus> {
    try {
      // Load stored lease
      const leaseJwt = await this.loadLease()
      if (!leaseJwt) {
        return { status: 'none', message: 'No license found. Please activate.' }
      }

      // Verify JWT signature with owner's public key
      const publicKey = await this.getOwnerPublicKey()
      const decoded = this.verifyJwt(leaseJwt, publicKey)

      // Check expiry
      const expiresAt = new Date(decoded.exp * 1000)
      const now = new Date()
      const daysRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysRemaining > 0) {
        // Valid
        this.cachedLease = decoded
        return {
          status: 'valid',
          lease: decoded,
          expiresAt: expiresAt.toISOString(),
          daysRemaining,
          message: `License valid — ${daysRemaining} days remaining`,
        }
      }

      // Expired — check grace period (7 days)
      if (daysRemaining >= -7) {
        return {
          status: 'grace_period',
          lease: decoded,
          expiresAt: expiresAt.toISOString(),
          daysRemaining,
          message: `License expired ${Math.abs(daysRemaining)} days ago — grace period active`,
        }
      }

      // Expired 7-30 days — emergency read-only mode
      if (daysRemaining >= -30) {
        return {
          status: 'read_only',
          lease: decoded,
          expiresAt: expiresAt.toISOString(),
          daysRemaining,
          emergencyMode: true,
          message: 'Emergency read-only mode — patient data readable, new writes blocked',
        }
      }

      // Expired >30 days — hard lock
      return {
        status: 'expired',
        lease: decoded,
        expiresAt: expiresAt.toISOString(),
        daysRemaining,
        message: 'License expired — only data export allowed',
      }
    } catch (e) {
      return { status: 'none', message: (e as Error).message }
    }
  }

  /**
   * Verify a license key with the licensing server and store the JWT lease.
   * This is the only method that requires network access.
   */
  async verifyAndStore(licenseKey: string, machineInfo: any): Promise<{ success: boolean; lease?: string; error?: string }> {
    try {
      const LICENSING_SERVER = process.env.LICENSING_SERVER || 'http://localhost:3000'

      const response = await fetch(`${LICENSING_SERVER}/api/licenses/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey,
          machineInfo,
          appVersion: require('../../package.json').version,
          os: `${process.platform} ${os.release()}`,
        }),
      })

      if (!response.ok) {
        const error: any = await response.json()
        return { success: false, error: error.error || 'Verification failed' }
      }

      const data: any = await response.json()

      // Store lease and license key
      await this.saveLease(data.lease)
      await this.saveLicenseKey(licenseKey)

      // Store encryption key in OS keychain
      const keytar = require('keytar')
      await keytar.setPassword('SmartClinic', 'encryption-key', randomBytes(32).toString('hex'))

      return { success: true, lease: data.lease }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }

  /**
   * Clear the stored license (for deactivation).
   */
  async clearLicense(): Promise<void> {
    try {
      await fs.unlink(LEASE_FILE)
      await fs.unlink(LICENSE_KEY_FILE)
    } catch {
      // Files may not exist
    }

    // Clear keychain entry
    try {
      const keytar = require('keytar')
      await keytar.deletePassword('SmartClinic', 'encryption-key')
    } catch {
      // Keychain may not be available
    }

    this.cachedLease = null
    this.cachedKey = null
  }

  /**
   * Get machine fingerprint for license verification.
   * SHA-256 hash of hostname + MAC + CPU + disk serial — opaque, non-reversible.
   */
  async getMachineFingerprint(): Promise<string> {
    const hostname = os.hostname()
    const networkInterfaces = os.networkInterfaces()
    const mac = Object.values(networkInterfaces)
      .flat()
      .find(iface => iface && !iface.internal && iface.mac !== '00:00:00:00:00:00')?.mac || 'unknown'

    // CPU ID — platform-specific
    const cpuId = process.platform === 'darwin'
      ? (await this.execCommand('sysctl -n machdep.cpu.brand_string')).trim()
      : process.platform === 'win32'
      ? (await this.execCommand('wmic cpu get ProcessorId')).trim()
      : (await this.execCommand('cat /proc/cpuinfo | grep -m1 "model name"')).trim()

    // Disk serial — platform-specific
    const diskSerial = process.platform === 'darwin'
      ? (await this.execCommand('diskutil info / | grep "Volume UUID"')).trim()
      : process.platform === 'win32'
      ? (await this.execCommand('vol')).trim()
      : (await this.execCommand('lsblk -dno SERIAL')).trim()

    const data = `${hostname}|${mac}|${cpuId}|${diskSerial}`
    return createHash('sha256').update(data).digest('hex')
  }

  // ──────────────────────────────────────────────────────────────────────────
  // JWT verification (Ed25519 / EdDSA)
  // ──────────────────────────────────────────────────────────────────────────

  private verifyJwt(jwt: string, publicKey: string): any {
    const parts = jwt.split('.')
    if (parts.length !== 3) throw new Error('Invalid JWT format')

    const [encodedHeader, encodedPayload, encodedSignature] = parts
    const data = `${encodedHeader}.${encodedPayload}`
    const signature = Buffer.from(encodedSignature, 'base64url')

    const valid = verify(null, Buffer.from(data), publicKey, signature)
    if (!valid) throw new Error('Invalid lease signature — license may be forged')

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString())

    return payload
  }

  // ──────────────────────────────────────────────────────────────────────────
  // File storage
  // ──────────────────────────────────────────────────────────────────────────

  private async loadLease(): Promise<string | null> {
    try {
      return await fs.readFile(LEASE_FILE, 'utf-8')
    } catch {
      return null
    }
  }

  private async saveLease(lease: string): Promise<void> {
    await fs.mkdir(path.dirname(LEASE_FILE), { recursive: true })
    await fs.writeFile(LEASE_FILE, lease, { mode: 0o600 }) // Owner read/write only
  }

  private async saveLicenseKey(key: string): Promise<void> {
    await fs.mkdir(path.dirname(LICENSE_KEY_FILE), { recursive: true })
    await fs.writeFile(LICENSE_KEY_FILE, key, { mode: 0o600 })
  }

  private async execCommand(cmd: string): Promise<string> {
    try {
      const { exec } = require('child_process')
      return await new Promise((resolve) => {
        exec(cmd, (_error: any, stdout: string) => resolve(stdout || ''))
      })
    } catch {
      return 'unknown'
    }
  }
}
