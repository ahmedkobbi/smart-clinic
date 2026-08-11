import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'
const db = new PrismaClient()

async function main() {
  const tenantId = await db.tenant.findFirst({ where: { slug: 'cabinet-lumiere' } })
  const logs = await db.auditLog.findMany({
    where: { tenantId: tenantId!.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, prevHash: true, hash: true, action: true, entity: true, entityId: true, payload: true, createdAt: true },
  })
  console.log('Total logs:', logs.length)
  console.log('First log:', JSON.stringify(logs[0], null, 2))
  
  let prevHash = '0'.repeat(64)
  for (let i = 0; i < Math.min(3, logs.length); i++) {
    const log = logs[i]
    console.log(`--- Log ${i} ---`)
    console.log('expected prevHash:', prevHash.slice(0, 20))
    console.log('actual prevHash:  ', log.prevHash.slice(0, 20))
    console.log('match prevHash:', log.prevHash === prevHash)
    const expectedInput = `${prevHash}|${log.action}|${log.entity}|${log.entityId || ''}|${log.payload}|${log.createdAt.toISOString()}`
    const expectedHash = createHash('sha256').update(expectedInput, 'utf8').digest('hex')
    console.log('expected hash:', expectedHash.slice(0, 20))
    console.log('actual hash:   ', log.hash.slice(0, 20))
    console.log('match hash:', log.hash === expectedHash)
    prevHash = log.hash
  }
}
main().finally(() => db.$disconnect())
