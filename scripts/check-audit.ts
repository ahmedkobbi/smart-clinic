import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'
const db = new PrismaClient()

async function main() {
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, prevHash: true, hash: true, action: true, entity: true, entityId: true, payload: true, createdAt: true },
    take: 3,
  })
  for (const log of logs) {
    console.log('---')
    console.log('id:', log.id)
    console.log('action:', log.action)
    console.log('createdAt:', log.createdAt)
    console.log('createdAt.toISOString():', log.createdAt.toISOString())
    console.log('stored hash:', log.hash.slice(0, 20))
    const expectedInput = `${log.prevHash}|${log.action}|${log.entity}|${log.entityId || ''}|${log.payload}|${log.createdAt.toISOString()}`
    const expectedHash = createHash('sha256').update(expectedInput, 'utf8').digest('hex')
    console.log('expected hash:', expectedHash.slice(0, 20))
    console.log('match:', log.hash === expectedHash)
  }
}
main().finally(() => db.$disconnect())
