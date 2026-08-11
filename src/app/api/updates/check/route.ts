import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Desktop checks for updates
// Returns latest version + download URL + signature

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const currentVersion = url.searchParams.get('version')
    const channel = url.searchParams.get('channel') || 'stable'
    const fingerprint = url.searchParams.get('fingerprint')

    if (!fingerprint) {
      return NextResponse.json(
        { error: 'fingerprint required' },
        { status: 400 }
      )
    }

    // Verify instance is registered
    const instance = await db.instance.findUnique({
      where: { fingerprint },
      include: { license: true },
    })

    if (!instance) {
      return NextResponse.json(
        { error: 'Instance not registered' },
        { status: 404 }
      )
    }

    // Get update channel
    const updateChannel = await db.updateChannel.findUnique({
      where: { channel },
    })

    if (!updateChannel) {
      return NextResponse.json({ updateAvailable: false })
    }

    // Check if update available
    const updateAvailable = currentVersion !== updateChannel.latestVersion

    // Check if force update required
    const forceUpdate = updateChannel.minVersion && currentVersion &&
      compareVersions(currentVersion, updateChannel.minVersion) < 0

    // Check rollout percentage (deterministic based on instance ID)
    const inRollout = updateChannel.rolloutPercent >= 100 ||
      hashPercent(instance.id) < updateChannel.rolloutPercent

    return NextResponse.json({
      updateAvailable: updateAvailable && inRollout,
      forceUpdate: forceUpdate || false,
      latestVersion: updateChannel.latestVersion,
      minVersion: updateChannel.minVersion,
      releaseNotes: updateChannel.releaseNotes,
      bundleUrl: updateChannel.bundleUrl,
      bundleSignature: updateChannel.bundleSignature,
      channel,
      publishedAt: updateChannel.publishedAt.toISOString(),
    })
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    )
  }
}

function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number)
  const partsB = b.split('.').map(Number)
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const va = partsA[i] || 0
    const vb = partsB[i] || 0
    if (va > vb) return 1
    if (va < vb) return -1
  }
  return 0
}

function hashPercent(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 100
}
