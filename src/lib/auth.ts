// Smart Clinic — NextAuth configuration
// Credentials provider with bcrypt password verification
// Per master prompt §9: WebAuthn/passkeys as default second factor (roadmap),
// TOTP fallback, mandatory step-up re-auth for high-risk actions

import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'

function verifyLegacySha256(plain: string, hash: string): boolean {
  const parts = hash.split('$')
  if (parts.length !== 3) return false
  const salt = parts[1]
  const stored = parts[2]
  const check = createHash('sha256').update(salt + plain).digest('hex')
  return check === stored
}

// Extend the JWT and Session types
declare module 'next-auth' {
  interface Session {
    user: {
      id?: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
      tenantId?: string
      tenantName?: string
    }
  }
  interface User {
    role?: string
    tenantId?: string
    tenantName?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string
    role?: string
    tenantId?: string
    tenantName?: string
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: true },
        })

        if (!user || !user.active) {
          return null
        }

        let valid = false
        const hash = user.passwordHash
        if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
          valid = await bcrypt.compare(credentials.password, hash)
        } else if (hash.startsWith('sha256$')) {
          valid = verifyLegacySha256(credentials.password, hash)
        }

        if (!valid) {
          return null
        }

        // Update last login
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantName: user.tenant?.displayName || '',
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours — clinical session timeout
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.role = user.role
        token.tenantId = user.tenantId
        token.tenantName = user.tenantName
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId
        session.user.role = token.role
        session.user.tenantId = token.tenantId
        session.user.tenantName = token.tenantName
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'smart-clinic-dev-secret-change-in-production',
}
