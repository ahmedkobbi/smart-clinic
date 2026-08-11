// Smart Clinic Owner Side — Seed script
// Creates: licenses, instances, leases, telemetry events, update channels, feature flags, admin actions

import { PrismaClient } from '@prisma/client'
import { generateLicenseKey, generateFingerprint, signLease, ensureKeypair } from '../src/lib/crypto'
import { createHash } from 'crypto'

const db = new PrismaClient()

const CUSTOMERS = [
  { name: 'Cabinet Médical Lumière', email: 'contact@cabinet-lumiere.fr', org: 'Cabinet Médical Lumière SAS', country: 'FR', plan: 'professional' },
  { name: 'Clinique du Parc', email: 'admin@clinique-parc.fr', org: 'Clinique du Parc SA', country: 'FR', plan: 'enterprise' },
  { name: 'Centre Médical Bastille', email: 'it@cmb-paris.fr', org: 'CMB', country: 'FR', plan: 'professional' },
  { name: 'Cabinet Dentaire Sourire', email: 'contact@sourire-dental.fr', org: 'Sourire Dental', country: 'FR', plan: 'essential' },
  { name: 'Polyclinique Nord-Est', email: 'dsi@polyclinique-ne.fr', org: 'Polyclinique Nord-Est', country: 'FR', plan: 'enterprise' },
  { name: 'Cabinet Dr. Benali', email: 'dr.benali@cabinet-med.fr', org: null, country: 'FR', plan: 'essential' },
  { name: 'Clinique El Andalous', email: 'admin@cliniq-andalous.ma', org: 'El Andalous SARL', country: 'MA', plan: 'professional' },
  { name: 'Centre Médical Tunis', email: 'contact@cmt.tn', org: 'CMT', country: 'TN', plan: 'trial' },
]

const MODULES = [
  'scheduling', 'ehr', 'billing', 'prescriptions', 'labs', 'documents',
  'telemedicine', 'audit', 'inventory', 'triage', 'sustainability', 'ai_scribe',
]

const PLAN_CONFIG = {
  trial: { maxDevices: 1, maxPractitioners: 3, modules: ['scheduling', 'ehr', 'billing'] },
  essential: { maxDevices: 1, maxPractitioners: 5, modules: ['scheduling', 'ehr', 'billing', 'prescriptions', 'labs', 'documents', 'audit', 'inventory'] },
  professional: { maxDevices: 3, maxPractitioners: 15, modules: MODULES },
  enterprise: { maxDevices: 10, maxPractitioners: 100, modules: MODULES },
}

const HOSTNAMES = ['RECEPTION-PC', 'CONSULT-ROOM-1', 'CONSULT-ROOM-2', 'ADMIN-DESK', 'DOCTOR-LAPTOP', 'KIOSK-TABLET']
const OS_LIST = ['win32 10.0.19045', 'darwin 23.1.0', 'linux 6.5.0', 'win32 11.0.22631', 'darwin 22.6.0']
const VERSIONS = ['1.0.0', '1.0.1', '1.1.0', '1.2.0', '1.2.1']

function randomFingerprint(hostname: string) {
  const mac = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':')
  const cpuId = `CPU-${Math.random().toString(36).slice(2, 12).toUpperCase()}`
  const diskSerial = `DSK-${Math.random().toString(36).slice(2, 14).toUpperCase()}`
  return generateFingerprint({ hostname, mac, cpuId, diskSerial })
}

async function main() {
  console.log('🔐 Ensuring Ed25519 keypair...')
  await ensureKeypair()

  console.log('🧹 Cleaning owner-side tables...')
  await db.adminAction.deleteMany()
  await db.telemetryEvent.deleteMany()
  await db.lease.deleteMany()
  await db.instance.deleteMany()
  await db.featureFlag.deleteMany()
  await db.license.deleteMany()
  await db.updateChannel.deleteMany()

  console.log('📜 Creating licenses...')
  const licenses = []
  for (let i = 0; i < CUSTOMERS.length; i++) {
    const c = CUSTOMERS[i]
    const config = PLAN_CONFIG[c.plan as keyof typeof PLAN_CONFIG]
    const licenseKey = generateLicenseKey()
    const issuedAt = new Date(Date.now() - (30 + i * 15) * 24 * 60 * 60 * 1000)
    const durationDays = c.plan === 'trial' ? 30 : 365
    const expiresAt = new Date(issuedAt.getTime() + durationDays * 24 * 60 * 60 * 1000)

    // Some licenses are revoked/expired for realism
    let status = 'active'
    let revokedAt = null
    let revocationReason = null
    if (i === 6) {
      // Expired
      status = 'expired'
      expiresAt.setTime(Date.now() - 5 * 24 * 60 * 60 * 1000)
    } else if (i === 7) {
      // Trial expired
      status = 'expired'
      expiresAt.setTime(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }

    const license = await db.license.create({
      data: {
        licenseKey,
        customerName: c.name,
        customerEmail: c.email,
        customerOrg: c.org,
        customerCountry: c.country,
        plan: c.plan,
        modules: JSON.stringify(config.modules),
        maxDevices: config.maxDevices,
        maxPractitioners: config.maxPractitioners,
        issuedAt,
        expiresAt,
        status,
        revokedAt,
        revocationReason,
      },
    })

    // Create feature flags
    for (const mod of MODULES) {
      const enabled = config.modules.includes(mod)
      await db.featureFlag.create({
        data: {
          licenseId: license.id,
          flagKey: mod,
          enabled,
        },
      })
    }

    licenses.push(license)
    console.log(`  ✓ ${license.licenseKey.slice(0, 20)}... — ${c.name} (${c.plan})`)
  }

  console.log('💻 Creating instances...')
  let instanceCount = 0
  for (const license of licenses) {
    if (license.status !== 'active' && license.status !== 'expired') continue
    const config = PLAN_CONFIG[license.plan as keyof typeof PLAN_CONFIG]
    const numInstances = Math.min(config.maxDevices, 1 + Math.floor(Math.random() * 3))

    for (let i = 0; i < numInstances; i++) {
      const hostname = HOSTNAMES[i % HOSTNAMES.length] + `-${instanceCount}`
      const fingerprint = randomFingerprint(hostname)
      const os = OS_LIST[Math.floor(Math.random() * OS_LIST.length)]
      const appVersion = VERSIONS[Math.floor(Math.random() * VERSIONS.length)]
      const firstSeen = new Date(license.issuedAt.getTime() + Math.random() * 10 * 24 * 60 * 60 * 1000)
      const lastSeen = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
      const leaseExpiry = new Date(lastSeen.getTime() + 30 * 24 * 60 * 60 * 1000)

      let instanceStatus = 'active'
      if (license.status === 'expired') instanceStatus = 'inactive'
      if (Math.random() < 0.1) instanceStatus = 'inactive' // 10% inactive

      const instance = await db.instance.create({
        data: {
          licenseId: license.id,
          fingerprint,
          hostname,
          os,
          appVersion,
          firstSeenAt: firstSeen,
          lastSeenAt: lastSeen,
          status: instanceStatus,
          leaseExpiry: instanceStatus === 'active' ? leaseExpiry : null,
        },
      })

      // Create a lease for active instances
      if (instanceStatus === 'active') {
        const jwt = await signLease({
          licenseId: license.id,
          instanceId: instance.id,
          licenseKey: license.licenseKey,
          customerName: license.customerName,
          plan: license.plan,
          modules: JSON.parse(license.modules),
          maxPractitioners: license.maxPractitioners,
          maxDevices: license.maxDevices,
        }, 30)

        await db.lease.create({
          data: {
            licenseId: license.id,
            instanceId: instance.id,
            jwt,
            expiresAt: leaseExpiry,
          },
        })
      }

      // Generate telemetry events for this instance
      const numEvents = 20 + Math.floor(Math.random() * 80)
      for (let j = 0; j < numEvents; j++) {
        const eventTypes = ['heartbeat', 'feature_usage', 'backup', 'update_check', 'app_launch']
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]
        const payload: any = {}
        if (eventType === 'heartbeat') {
          payload.uptime = Math.floor(Math.random() * 86400)
          payload.memoryMb = 300 + Math.floor(Math.random() * 200)
        } else if (eventType === 'feature_usage') {
          payload.feature = MODULES[Math.floor(Math.random() * MODULES.length)]
          payload.count = 1 + Math.floor(Math.random() * 50)
        } else if (eventType === 'backup') {
          payload.size = Math.floor(Math.random() * 50000000)
          payload.success = Math.random() > 0.05
        } else if (eventType === 'update_check') {
          payload.currentVersion = appVersion
          payload.latestVersion = '1.2.1'
        } else if (eventType === 'app_launch') {
          payload.launchTime = Math.floor(Math.random() * 5000)
        }

        const receivedAt = new Date(lastSeen.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000)
        await db.telemetryEvent.create({
          data: {
            instanceId: instance.id,
            eventType,
            payload: JSON.stringify(payload),
            receivedAt,
          },
        })
      }
      instanceCount++
    }
  }
  console.log(`  ✓ Instances: ${instanceCount}`)

  console.log('📡 Creating update channels...')
  await db.updateChannel.create({
    data: {
      channel: 'stable',
      latestVersion: '1.2.1',
      minVersion: '1.0.0',
      rolloutPercent: 100,
      releaseNotes: '## Smart Clinic 1.2.1\n\n- Amélioration: performance du dashboard\n- Fix: crash rare lors de l\'export PDF\n- Sécurité: mise à jour des dépendances\n\n**Taille**: 118 MB\n**Hash**: sha256:a3f8e9...',
      bundleUrl: 'https://releases.smartclinic.app/1.2.1/smartclinic-1.2.1.dmg',
      bundleSignature: 'ed25519:8f3a2b1c...',
    },
  })
  await db.updateChannel.create({
    data: {
      channel: 'canary',
      latestVersion: '1.3.0-beta.2',
      minVersion: null,
      rolloutPercent: 10,
      releaseNotes: '## Smart Clinic 1.3.0-beta.2 (Canary)\n\n- Nouveau: module de télémédecine avec WebRTC\n- Nouveau: scribe ambiant IA\n- Expérimental: sync multi-postes CRDT\n\n⚠️ Version bêta — ne pas utiliser en production',
      bundleUrl: 'https://releases.smartclinic.app/1.3.0-beta.2/smartclinic-1.3.0-beta.2.dmg',
      bundleSignature: 'ed25519:7c2b9a1d...',
    },
  })
  await db.updateChannel.create({
    data: {
      channel: 'beta',
      latestVersion: '1.3.0-beta.1',
      minVersion: null,
      rolloutPercent: 50,
      releaseNotes: '## Smart Clinic 1.3.0-beta.1\n\n- Nouveau: module de télémédecine\n- Nouveau: scribe ambiant IA',
      bundleUrl: 'https://releases.smartclinic.app/1.3.0-beta.1/smartclinic-1.3.0-beta.1.dmg',
      bundleSignature: 'ed25519:6a1b8c2e...',
    },
  })
  console.log('  ✓ Update channels: 3 (stable, canary, beta)')

  console.log('📝 Creating admin actions...')
  const adminEmail = 'admin@smartclinic.app'
  const actions = [
    { action: 'admin_login', target: null, payload: { ip: '82.65.12.4' } },
    { action: 'issue_license', target: 'license', payload: { customer: 'Clinique du Parc', plan: 'enterprise' } },
    { action: 'issue_license', target: 'license', payload: { customer: 'Cabinet Médical Lumière', plan: 'professional' } },
    { action: 'extend_license', target: 'license', payload: { days: 30 } },
    { action: 'publish_update', target: 'update', payload: { version: '1.2.1', channel: 'stable' } },
    { action: 'block_instance', target: 'instance', payload: { reason: 'Security review' } },
    { action: 'revoke_license', target: 'license', payload: { reason: 'Non-payment' } },
    { action: 'issue_license', target: 'license', payload: { customer: 'Clinique El Andalous', plan: 'professional' } },
    { action: 'publish_update', target: 'update', payload: { version: '1.3.0-beta.2', channel: 'canary' } },
    { action: 'admin_login', target: null, payload: { ip: '82.65.12.4' } },
  ]
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i]
    await db.adminAction.create({
      data: {
        adminEmail,
        action: a.action,
        target: a.target,
        targetId: licenses[i % licenses.length]?.id || null,
        payload: JSON.stringify(a.payload),
        ipAddress: '82.65.12.4',
        createdAt: new Date(Date.now() - (actions.length - i) * 3 * 60 * 60 * 1000),
      },
    })
  }
  console.log(`  ✓ Admin actions: ${actions.length}`)

  console.log('\n✅ Owner side seed complete.')
  console.log(`\n📋 Summary:`)
  console.log(`   ${licenses.length} licenses`)
  console.log(`   ${instanceCount} instances`)
  console.log(`   3 update channels (stable/canary/beta)`)
  console.log(`   ${actions.length} admin actions`)
  console.log(`   Ed25519 keypair at .keys/`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
