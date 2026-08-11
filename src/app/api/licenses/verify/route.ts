import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signLease, verifyLicenseKey, generateFingerprint } from '@/lib/crypto'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Desktop calls this with license key + machine info to get a signed JWT lease
const VerifySchema = z.object({
  licenseKey: z.string().min(1),
  machineInfo: z.object({
    hostname: z.string(),
    mac: z.string(),
    cpuId: z.string(),
    diskSerial: z.string(),
  }),
  appVersion: z.string().optional(),
  os: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = VerifySchema.parse(body)

    // Verify license key format
    if (!verifyLicenseKey(parsed.licenseKey)) {
      return NextResponse.json(
        { error: 'Invalid license key format', code: 'INVALID_KEY_FORMAT' },
        { status: 400 }
      )
    }

    // Find license in DB
    const license = await db.license.findUnique({
      where: { licenseKey: parsed.licenseKey },
      include: { featureFlags: true },
    })

    if (!license) {
      return NextResponse.json(
        { error: 'License not found', code: 'LICENSE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check license status
    if (license.status === 'revoked') {
      return NextResponse.json(
        { error: 'License revoked', code: 'LICENSE_REVOKED', reason: license.revocationReason },
        { status: 403 }
      )
    }

    if (license.status === 'suspended') {
      return NextResponse.json(
        { error: 'License suspended', code: 'LICENSE_SUSPENDED' },
        { status: 403 }
      )
    }

    // Check expiry
    if (new Date(license.expiresAt) < new Date()) {
      await db.license.update({
        where: { id: license.id },
        data: { status: 'expired' },
      })
      // Emergency read-only mode — patient safety requires data be readable
      // Desktop can still READ patient data but cannot create new records
      return NextResponse.json(
        {
          error: 'License expired',
          code: 'LICENSE_EXPIRED',
          expiredAt: license.expiresAt,
          emergencyMode: 'read_only',
          emergencyReason: 'License expired — patient data readable for safety, new writes blocked',
          gracePeriodEnds: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { status: 403 }
      )
    }

    // Generate machine fingerprint
    const fingerprint = generateFingerprint(parsed.machineInfo)

    // Find or create instance
    let instance = await db.instance.findUnique({
      where: { fingerprint },
    })

    if (instance) {
      // Check if instance is blocked
      if (instance.status === 'blocked') {
        return NextResponse.json(
          { error: 'Instance blocked', code: 'INSTANCE_BLOCKED' },
          { status: 403 }
        )
      }
      // Check if instance belongs to this license
      if (instance.licenseId !== license.id) {
        return NextResponse.json(
          { error: 'Instance licensed to different key', code: 'LICENSE_MISMATCH' },
          { status: 403 }
        )
      }
      // Update last seen
      instance = await db.instance.update({
        where: { id: instance.id },
        data: {
          lastSeenAt: new Date(),
          hostname: parsed.machineInfo.hostname,
          os: parsed.os || instance.os,
          appVersion: parsed.appVersion || instance.appVersion,
        },
      })
    } else {
      // Check device limit
      const activeInstances = await db.instance.count({
        where: { licenseId: license.id, status: 'active' },
      })

      if (activeInstances >= license.maxDevices) {
        return NextResponse.json(
          {
            error: 'Device limit reached',
            code: 'DEVICE_LIMIT',
            maxDevices: license.maxDevices,
            currentDevices: activeInstances,
          },
          { status: 403 }
        )
      }

      // Create new instance
      instance = await db.instance.create({
        data: {
          licenseId: license.id,
          fingerprint,
          hostname: parsed.machineInfo.hostname,
          os: parsed.os,
          appVersion: parsed.appVersion,
          status: 'active',
        },
      })
    }

    // Sign JWT lease
    const leasePayload = {
      licenseId: license.id,
      instanceId: instance.id,
      licenseKey: license.licenseKey,
      customerName: license.customerName,
      plan: license.plan,
      modules: JSON.parse(license.modules),
      maxPractitioners: license.maxPractitioners,
      maxDevices: license.maxDevices,
      features: license.featureFlags.reduce((acc: any, f) => {
        acc[f.flagKey] = f.enabled
        return acc
      }, {}),
    }

    const leaseDurationDays = 30
    const jwt = await signLease(leasePayload, leaseDurationDays)
    const expiresAt = new Date(Date.now() + leaseDurationDays * 24 * 60 * 60 * 1000)

    // Store lease in DB
    await db.lease.create({
      data: {
        licenseId: license.id,
        instanceId: instance.id,
        jwt,
        expiresAt,
      },
    })

    // Update instance lease expiry
    await db.instance.update({
      where: { id: instance.id },
      data: { leaseExpiry: expiresAt },
    })

    // Log admin action
    await db.adminAction.create({
      data: {
        adminEmail: 'system',
        action: 'lease_issued',
        target: 'license',
        targetId: license.id,
        payload: JSON.stringify({ instanceId: instance.id, fingerprint: fingerprint.slice(0, 8) + '...' }),
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      },
    })

    return NextResponse.json({
      lease: jwt,
      expiresAt: expiresAt.toISOString(),
      license: {
        customerName: license.customerName,
        plan: license.plan,
        modules: JSON.parse(license.modules),
        maxPractitioners: license.maxPractitioners,
        features: leasePayload.features,
      },
      instance: {
        id: instance.id,
        hostname: instance.hostname,
      },
    })
  } catch (e) {
    console.error('[LICENSES/VERIFY] Error:', e)
    return NextResponse.json(
      { error: (e as Error).message, code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
