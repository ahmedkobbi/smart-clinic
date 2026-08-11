// Smart Clinic Owner Side — Cryptographic utilities
// Ed25519 keypair management, JWT lease signing/verification, license key generation
// Per master prompt §9: defense-in-depth, zero-trust, breach-contained-by-design

import { generateKeyPairSync, sign, verify, randomBytes, createHash } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

const KEYS_DIR = path.join(process.cwd(), '.keys')
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'ed25519-private.pem')
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'ed25519-public.pem')

let cachedPrivateKey: string | null = null
let cachedPublicKey: string | null = null

/**
 * Generate an Ed25519 keypair and store to disk (first run only).
 * In production, these keys should be stored in a HSM or KMS.
 */
export async function ensureKeypair(): Promise<void> {
  if (cachedPrivateKey && cachedPublicKey) return

  try {
    cachedPrivateKey = await fs.readFile(PRIVATE_KEY_PATH, 'utf-8')
    cachedPublicKey = await fs.readFile(PUBLIC_KEY_PATH, 'utf-8')
  } catch {
    // Generate new keypair
    const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    })

    await fs.mkdir(KEYS_DIR, { recursive: true })
    await fs.writeFile(PRIVATE_KEY_PATH, privateKey, { mode: 0o600 })
    await fs.writeFile(PUBLIC_KEY_PATH, publicKey, { mode: 0o644 })
    cachedPrivateKey = privateKey
    cachedPublicKey = publicKey
    console.log('[CRYPTO] Generated new Ed25519 keypair at', KEYS_DIR)
  }
}

export async function getPrivateKey(): Promise<string> {
  if (!cachedPrivateKey) await ensureKeypair()
  return cachedPrivateKey!
}

export async function getPublicKey(): Promise<string> {
  if (!cachedPublicKey) await ensureKeypair()
  return cachedPublicKey!
}

/**
 * Sign a JWT lease using Ed25519 (EdDSA algorithm).
 * Format: base64url(header).base64url(payload).base64url(signature)
 */
export async function signLease(payload: object, expiresInDays: number = 30): Promise<string> {
  const privateKey = await getPrivateKey()

  const header = { alg: 'EdDSA', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)

  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInDays * 86400,
    iss: 'smart-clinic-licensing',
  }

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url')
  const data = `${encodedHeader}.${encodedPayload}`

  const signature = sign(null, Buffer.from(data), privateKey)
  return `${data}.${signature.toString('base64url')}`
}

/**
 * Verify a JWT lease signature using Ed25519 public key.
 * Returns the decoded payload if valid, throws otherwise.
 */
export async function verifyLease(jwt: string): Promise<any> {
  const publicKey = await getPublicKey()

  const parts = jwt.split('.')
  if (parts.length !== 3) throw new Error('Invalid JWT format')

  const [encodedHeader, encodedPayload, encodedSignature] = parts
  const data = `${encodedHeader}.${encodedPayload}`
  const signature = Buffer.from(encodedSignature, 'base64url')

  const valid = verify(null, Buffer.from(data), publicKey, signature)
  if (!valid) throw new Error('Invalid lease signature')

  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString())

  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error('Lease expired')
  }

  return payload
}

/**
 * Generate a license key with checksum.
 * Format: SC-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XX
 * The last 2 digits are a mod-97 checksum for typo detection.
 */
export function generateLicenseKey(): string {
  const bytes = randomBytes(16)
  const hex = bytes.toString('hex').toUpperCase()
  const key = hex.slice(0, 8) + hex.slice(8, 16) + hex.slice(16, 24) + hex.slice(24, 32)

  // Mod-97 checksum (ISO 7064 style)
  const numericKey = BigInt('0x' + key)
  const checksum = Number(98n - (numericKey % 97n))
  const checksumStr = checksum.toString().padStart(2, '0')

  return `SC-${key.slice(0, 8)}-${key.slice(8, 16)}-${key.slice(16, 24)}-${key.slice(24, 32)}-${checksumStr}`
}

/**
 * Verify a license key checksum
 */
export function verifyLicenseKey(key: string): boolean {
  // Remove SC- prefix and dashes
  const cleaned = key.replace(/^SC-/, '').replace(/-/g, '').toUpperCase()
  if (cleaned.length !== 34) return false
  const body = cleaned.slice(0, 32)
  const checksum = parseInt(cleaned.slice(32), 10)
  if (isNaN(checksum)) return false
  const numericKey = BigInt('0x' + body)
  const expected = Number(98n - (numericKey % 97n))
  return checksum === expected
}

/**
 * Generate a machine fingerprint from hardware identifiers.
 * On desktop, this is called with real hardware info.
 * SHA-256 hash ensures the fingerprint is opaque (no reverse engineering of hardware IDs).
 */
export function generateFingerprint(machineInfo: {
  hostname: string
  mac: string
  cpuId: string
  diskSerial: string
}): string {
  const data = `${machineInfo.hostname}|${machineInfo.mac}|${machineInfo.cpuId}|${machineInfo.diskSerial}`
  return createHash('sha256').update(data).digest('hex')
}

/**
 * Generate a random token (for API keys, session tokens, etc.)
 */
export function generateToken(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex')
}
