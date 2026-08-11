import { NextRequest, NextResponse } from 'next/server'
import { getTenant, getBranches, getPractitioners, getResources, getUsers, getConsentRecords } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const section = url.searchParams.get('section') || 'tenant'
    if (section === 'tenant') {
      const tenant = await getTenant()
      const branches = await getBranches()
      return NextResponse.json({ tenant, branches })
    }
    if (section === 'staff') {
      const practitioners = await getPractitioners()
      const users = await getUsers()
      return NextResponse.json({ practitioners, users })
    }
    if (section === 'resources') {
      const resources = await getResources()
      const branches = await getBranches()
      return NextResponse.json({ resources, branches })
    }
    if (section === 'consents') {
      const consents = await getConsentRecords()
      return NextResponse.json({ consents })
    }
    return NextResponse.json({ error: 'Unknown section' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
