// Smart Clinic — Server-side auth helpers
// Per master prompt §9: defense-in-depth, zero-trust. Admin APIs MUST verify
// session + role server-side, not trust client-side checks.

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export interface AdminSession {
  user: {
    id: string
    email: string
    name: string
    role: string
    tenantId: string
    tenantName: string
  }
}

/**
 * Verify that the request has a valid admin session.
 * Returns the session if authorized, or a 401/403 NextResponse if not.
 *
 * Usage in API routes:
 * ```
 * const sessionOrError = await requireAdmin(req)
 * if (sessionOrError instanceof NextResponse) return sessionOrError
 * const session = sessionOrError
 * ```
 */
export async function requireAdmin(req: NextRequest): Promise<AdminSession | NextResponse> {
  const session = await getServerSession(authOptions) as any

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'NO_SESSION' },
      { status: 401 }
    )
  }

  if (session.user.role !== 'superadmin') {
    return NextResponse.json(
      { error: 'Forbidden — superadmin access required', code: 'NOT_SUPERADMIN', user: session.user.email, role: session.user.role },
      { status: 403 }
    )
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name || '',
      role: session.user.role,
      tenantId: session.user.tenantId || '',
      tenantName: session.user.tenantName || '',
    },
  }
}

/**
 * Verify that the request has any valid session (not necessarily admin).
 * Used for desktop-facing APIs that authenticate via license key instead.
 */
export async function requireSession(req: NextRequest) {
  const session = await getServerSession(authOptions) as any
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'NO_SESSION' },
      { status: 401 }
    )
  }
  return session
}
