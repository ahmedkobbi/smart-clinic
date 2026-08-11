import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const db = new PrismaClient()
async function main() {
  const u = await db.user.findUnique({ where: { email: 'admin@cabinet-lumiere.fr' } })
  if (!u) { console.log('User not found'); return }
  console.log('Email:', u.email)
  console.log('Hash prefix:', u.passwordHash.slice(0, 10))
  console.log('Hash length:', u.passwordHash.length)
  const valid = await bcrypt.compare('smartclinic2026', u.passwordHash)
  console.log('bcrypt verify:', valid)
}
main().finally(() => db.$disconnect())
