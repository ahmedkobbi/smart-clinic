import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const UpdateSchema = z.object({
  channel: z.enum(['stable', 'canary', 'beta']),
  latestVersion: z.string(),
  minVersion: z.string().optional(),
  rolloutPercent: z.number().int().min(0).max(100).default(100),
  releaseNotes: z.string().optional(),
  bundleUrl: z.string().optional(),
  bundleSignature: z.string().optional(),
  adminEmail: z.string().email(),
})

export async function GET() {
  try {
    const channels = await db.updateChannel.findMany({
      orderBy: { publishedAt: 'desc' },
    })
    return NextResponse.json({ items: channels })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = UpdateSchema.parse(body)

    // Upsert by channel
    const channel = await db.updateChannel.upsert({
      where: { channel: parsed.channel },
      update: {
        latestVersion: parsed.latestVersion,
        minVersion: parsed.minVersion,
        rolloutPercent: parsed.rolloutPercent,
        releaseNotes: parsed.releaseNotes,
        bundleUrl: parsed.bundleUrl,
        bundleSignature: parsed.bundleSignature,
        publishedAt: new Date(),
      },
      create: {
        channel: parsed.channel,
        latestVersion: parsed.latestVersion,
        minVersion: parsed.minVersion,
        rolloutPercent: parsed.rolloutPercent,
        releaseNotes: parsed.releaseNotes,
        bundleUrl: parsed.bundleUrl,
        bundleSignature: parsed.bundleSignature,
      },
    })

    await db.adminAction.create({
      data: {
        adminEmail: parsed.adminEmail,
        action: 'publish_update',
        target: 'update',
        targetId: channel.id,
        payload: JSON.stringify({ channel: parsed.channel, version: parsed.latestVersion }),
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      },
    })

    return NextResponse.json(channel, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
