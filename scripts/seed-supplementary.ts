// Smart Clinic — Supplementary seed for new models
// Adds: LabResults, PatientDocuments, WaitlistEntries, StaffCredentials

import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

const LAB_TESTS = [
  { testName: 'Glycémie', unit: 'g/L', refRangeLow: 0.7, refRangeHigh: 1.1, category: 'biochemistry' },
  { testName: 'Hémoglobine A1c', unit: '%', refRangeLow: 4.0, refRangeHigh: 5.7, category: 'biochemistry' },
  { testName: 'Créatinine', unit: 'mg/L', refRangeLow: 6, refRangeHigh: 12, category: 'biochemistry' },
  { testName: 'Hémoglobine', unit: 'g/dL', refRangeLow: 12, refRangeHigh: 16, category: 'hematology' },
  { testName: 'Leucocytes', unit: 'G/L', refRangeLow: 4, refRangeHigh: 10, category: 'hematology' },
  { testName: 'Plaquettes', unit: 'G/L', refRangeLow: 150, refRangeHigh: 400, category: 'hematology' },
  { testName: 'Cholestérol total', unit: 'g/L', refRangeLow: 1.0, refRangeHigh: 2.0, category: 'biochemistry' },
  { testName: 'LDL Cholestérol', unit: 'g/L', refRangeLow: 0.0, refRangeHigh: 1.6, category: 'biochemistry' },
  { testName: 'TSH', unit: 'mUI/L', refRangeLow: 0.4, refRangeHigh: 4.0, category: 'endocrinology' },
  { testName: 'Vitamine D', unit: 'ng/mL', refRangeLow: 30, refRangeHigh: 100, category: 'endocrinology' },
  { testName: 'CRP', unit: 'mg/L', refRangeLow: 0, refRangeHigh: 5, category: 'biochemistry' },
  { testName: 'Sodium', unit: 'mmol/L', refRangeLow: 135, refRangeHigh: 145, category: 'biochemistry' },
  { testName: 'Potassium', unit: 'mmol/L', refRangeLow: 3.5, refRangeHigh: 5.0, category: 'biochemistry' },
  { testName: 'Fer sérique', unit: 'µg/dL', refRangeLow: 60, refRangeHigh: 170, category: 'hematology' },
  { testName: 'Ferritine', unit: 'ng/mL', refRangeLow: 30, refRangeHigh: 300, category: 'hematology' },
]

function generateLabValue(test: typeof LAB_TESTS[0]) {
  // Generate values — some normal, some abnormal
  const range = test.refRangeHigh - test.refRangeLow
  const rand = Math.random()
  if (rand < 0.6) {
    // Normal
    const value = test.refRangeLow + Math.random() * range
    return { value: value.toFixed(test.unit === '%' ? 1 : 2), flag: 'normal' }
  } else if (rand < 0.8) {
    // High
    const value = test.refRangeHigh + Math.random() * range * 0.3
    return { value: value.toFixed(test.unit === '%' ? 1 : 2), flag: 'high' }
  } else if (rand < 0.95) {
    // Low
    const value = test.refRangeLow - Math.random() * range * 0.3
    return { value: value.toFixed(test.unit === '%' ? 1 : 2), flag: 'low' }
  } else {
    // Critical
    const value = test.refRangeHigh + Math.random() * range * 0.8
    return { value: value.toFixed(test.unit === '%' ? 1 : 2), flag: 'critical' }
  }
}

const DOCUMENT_CATEGORIES = ['lab_report', 'imaging', 'consent_form', 'prescription', 'referral']

async function main() {
  const tenant = await db.tenant.findFirst({ where: { slug: 'cabinet-lumiere' } })
  if (!tenant) { console.error('Tenant not found'); process.exit(1) }
  const patients = await db.patient.findMany({ where: { tenantId: tenant.id, active: true } })
  const practitioners = await db.practitioner.findMany({ where: { tenantId: tenant.id } })

  // Clean previous
  await db.patientDocument.deleteMany({ where: { tenantId: tenant.id } })
  await db.labResult.deleteMany({ where: { tenantId: tenant.id } })
  await db.waitlistEntry.deleteMany({ where: { tenantId: tenant.id } })
  await db.staffCredential.deleteMany({ where: { tenantId: tenant.id } })

  console.log('🔬 Seeding lab results…')
  let labCount = 0
  for (const patient of patients) {
    // 3-6 lab results per patient
    const numTests = 3 + Math.floor(Math.random() * 4)
    const selectedTests = [...LAB_TESTS].sort(() => Math.random() - 0.5).slice(0, numTests)
    for (const test of selectedTests) {
      const { value, flag } = generateLabValue(test)
      const collectedAt = new Date()
      collectedAt.setDate(collectedAt.getDate() - Math.floor(Math.random() * 60))
      await db.labResult.create({
        data: {
          tenantId: tenant.id,
          patientId: patient.id,
          testName: test.testName,
          value,
          unit: test.unit,
          refRangeLow: test.refRangeLow,
          refRangeHigh: test.refRangeHigh,
          flag,
          category: test.category,
          collectedAt,
          resultedAt: new Date(collectedAt.getTime() + 24 * 60 * 60 * 1000),
          performedBy: 'Laboratoire Cerba',
        },
      })
      labCount++
    }
  }
  console.log(`  ✓ Lab results: ${labCount}`)

  console.log('📄 Seeding patient documents (metadata only, no content for now)…')
  let docCount = 0
  for (const patient of patients.slice(0, 12)) {
    const numDocs = 1 + Math.floor(Math.random() * 3)
    for (let i = 0; i < numDocs; i++) {
      const category = DOCUMENT_CATEGORIES[Math.floor(Math.random() * DOCUMENT_CATEGORIES.length)]
      const uploadedAt = new Date()
      uploadedAt.setDate(uploadedAt.getDate() - Math.floor(Math.random() * 90))
      const names: Record<string, string[]> = {
        lab_report: ['Bilan sanguin', 'NFS complète', 'Bilan lipidique', 'Glycémie à jeun'],
        imaging: ['Radiographie thorax', 'Échographie', 'IRM', 'Scanner'],
        consent_form: ['Consentement éclairé', 'Consentement RGPD', 'Consentement téléconsultation'],
        prescription: ['Ordonnance', 'Renouvellement', 'Arrêt de travail'],
        referral: ['Lettre d\'orientation', 'Compte-rendu spécialiste'],
      }
      const name = names[category][Math.floor(Math.random() * names[category].length)]
      await db.patientDocument.create({
        data: {
          tenantId: tenant.id,
          patientId: patient.id,
          name,
          category,
          mimeType: 'application/pdf',
          sizeBytes: 100000 + Math.floor(Math.random() * 500000),
          content: '', // metadata-only for now; upload API will store real content
          uploadedBy: practitioners[Math.floor(Math.random() * practitioners.length)].name,
          uploadedAt,
          description: `${name} — ${patient.firstName} ${patient.lastName}`,
        },
      })
      docCount++
    }
  }
  console.log(`  ✓ Documents: ${docCount}`)

  console.log('⏳ Seeding waitlist…')
  let waitCount = 0
  for (const patient of patients.slice(0, 8)) {
    await db.waitlistEntry.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        practitionerId: practitioners[Math.floor(Math.random() * practitioners.length)].id,
        reason: ['Consultation de suivi', 'Résultat d\'analyse', 'Renouvellement ordonnance', 'Consultation urgente'][Math.floor(Math.random() * 4)],
        preferredDate: new Date(Date.now() + (3 + Math.floor(Math.random() * 14)) * 24 * 60 * 60 * 1000),
        preferredTimeOfDay: ['morning', 'afternoon', 'evening'][Math.floor(Math.random() * 3)],
        priority: 1 + Math.floor(Math.random() * 10),
        status: Math.random() > 0.3 ? 'waiting' : 'notified',
      },
    })
    waitCount++
  }
  console.log(`  ✓ Waitlist entries: ${waitCount}`)

  console.log('🎓 Seeding staff credentials…')
  let credCount = 0
  const credTypes = [
    { type: 'rpps', name: 'RPPS', issuingBody: 'Agence Régionale de Santé' },
    { type: 'adeli', name: 'ADELI', issuingBody: 'ARS' },
    { type: 'medical_degree', name: 'Diplôme de médecine', issuingBody: 'Université Paris Descartes' },
    { type: 'cpr', name: 'Certificat de secourisme', issuingBody: 'Croix Rouge' },
    { type: 'specialty_board', name: 'DESC de spécialité', issuingBody: 'Ordre des Médecins' },
    { type: 'insurance', name: 'Assurance professionnelle', issuingBody: 'MACSF' },
  ]
  for (const practitioner of practitioners) {
    // 2-3 credentials per practitioner
    const numCreds = 2 + Math.floor(Math.random() * 2)
    const selectedCreds = [...credTypes].sort(() => Math.random() - 0.5).slice(0, numCreds)
    for (const cred of selectedCreds) {
      const issuedAt = new Date()
      issuedAt.setFullYear(issuedAt.getFullYear() - 5 - Math.floor(Math.random() * 15))
      const expiresAt = new Date(issuedAt)
      // Some expired, some expiring soon, some valid
      const rand = Math.random()
      if (rand < 0.15) {
        // Expired
        expiresAt.setFullYear(expiresAt.getFullYear() + 5) // 5-year validity
        expiresAt.setDate(expiresAt.getDate() - 30) // expired 30 days ago
      } else if (rand < 0.35) {
        // Expiring soon (< 90 days)
        expiresAt.setFullYear(expiresAt.getFullYear() + 5)
        expiresAt.setDate(expiresAt.getDate() + 30 + Math.floor(Math.random() * 60))
      } else {
        // Valid
        expiresAt.setFullYear(expiresAt.getFullYear() + 5 + Math.floor(Math.random() * 10))
      }

      // For permanent credentials (RPPS, ADELI), no expiry
      const hasExpiry = cred.type !== 'rpps' && cred.type !== 'adeli'

      await db.staffCredential.create({
        data: {
          tenantId: tenant.id,
          practitionerId: practitioner.id,
          type: cred.type,
          number: cred.type === 'rpps' ? practitioner.rpps || `${Math.floor(Math.random() * 999999999999)}`.padStart(12, '0')
            : cred.type === 'adeli' ? practitioner.adeli || `${Math.floor(Math.random() * 999999999)}`.padStart(9, '0')
            : `CERT-${Math.floor(Math.random() * 99999)}`.padStart(8, '0'),
          issuedAt,
          expiresAt: hasExpiry ? expiresAt : null,
          issuingBody: cred.issuingBody,
          status: !hasExpiry ? 'valid'
            : expiresAt < new Date() ? 'expired'
            : (expiresAt.getTime() - Date.now()) < 90 * 24 * 60 * 60 * 1000 ? 'expiring_soon'
            : 'valid',
        },
      })
      credCount++
    }
  }
  console.log(`  ✓ Staff credentials: ${credCount}`)

  console.log('\n✅ Supplementary seed complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
