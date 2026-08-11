import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Telemetry ingestion — STRICTLY anonymized operational metrics
// NO PHI. Schema is fixed and validated.
const TelemetrySchema = z.object({
  instanceFingerprint: z.string().min(1),
  events: z.array(z.object({
    eventType: z.enum(['heartbeat', 'error', 'feature_usage', 'backup', 'update_check', 'app_launch', 'app_exit']),
    payload: z.record(z.unknown()).refine((val) => {
      // Validate no PHI fields
      const forbidden = ['patientName', 'patientId', 'email', 'phone', 'ssn', 'nir']
      const keys = Object.keys(val)
      return !keys.some(k => forbidden.some(f => k.toLowerCase().includes(f.toLowerCase())))
    }, 'Payload contains forbidden PHI fields'),
    timestamp: z.string(),
  })),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = TelemetrySchema.parse(body)

    // Find instance by fingerprint
    const instance = await db.instance.findUnique({
      where: { fingerprint: parsed.instanceFingerprint },
    })

    if (!instance) {
      return NextResponse.json(
        { error: 'Instance not registered', code: 'INSTANCE_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (instance.status === 'blocked') {
      return NextResponse.json(
        { error: 'Instance blocked', code: 'INSTANCE_BLOCKED' },
        { status: 403 }
      )
    }

    // Store telemetry events
    const created = []
    for (const event of parsed.events) {
      const te = await db.telemetryEvent.create({
        data: {
          instanceId: instance.id,
          eventType: event.eventType,
          payload: JSON.stringify(event.payload),
        },
      })
      created.push(te.id)
    }

    // Update last seen
    await db.instance.update({
      where: { id: instance.id },
      data: { lastSeenAt: new Date() },
    })

    return NextResponse.json({ accepted: created.length })
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 400 }
    )
  }
}
