// Smart Clinic — Database seed script
// Seeds a single tenant (Cabinet Médical Lumière, Paris) with realistic French clinical data.
// Run: bun run db:seed

import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex')
}

// Use bcrypt for proper password hashing (NextAuth compatible)
async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(plain, salt)
}

// Verify password (used by NextAuth credentials provider)
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  // Support both old sha256 format and new bcrypt
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
    return bcrypt.compare(plain, hash)
  }
  if (hash.startsWith('sha256$')) {
    const [, salt, stored] = hash.split('$')
    const check = createHash('sha256').update(salt + plain).digest('hex')
    return check === stored
  }
  return false
}

const PATIENTS = [
  { firstName: 'Camille', lastName: 'Dupont', sex: 'female', birthDate: '1987-03-12', postal: '75011', city: 'Paris', bloodType: 'A+', mutuelle: 'CPAM + MGEN' },
  { firstName: 'Lucas', lastName: 'Martin', sex: 'male', birthDate: '1975-07-23', postal: '75011', city: 'Paris', bloodType: 'O+', mutuelle: 'CPAM + Harmonie Mutuelle' },
  { firstName: 'Sophie', lastName: 'Bernard', sex: 'female', birthDate: '1992-11-05', postal: '75012', city: 'Paris', bloodType: 'B+', mutuelle: 'CPAM + Aesio' },
  { firstName: 'Hugo', lastName: 'Petit', sex: 'male', birthDate: '2001-04-18', postal: '75020', city: 'Paris', bloodType: 'A-', mutuelle: 'CPAM' },
  { firstName: 'Léa', lastName: 'Robert', sex: 'female', birthDate: '1968-09-30', postal: '93100', city: 'Montreuil', bloodType: 'O-', mutuelle: 'CPAM + MGEN' },
  { firstName: 'Gabriel', lastName: 'Richard', sex: 'male', birthDate: '1955-12-02', postal: '75013', city: 'Paris', bloodType: 'AB+', mutuelle: 'CPAM + Apivia' },
  { firstName: 'Manon', lastName: 'Durand', sex: 'female', birthDate: '1995-06-15', postal: '75014', city: 'Paris', bloodType: 'A+', mutuelle: 'CPAM + Aesio' },
  { firstName: 'Louis', lastName: 'Leroy', sex: 'male', birthDate: '1983-01-08', postal: '92100', city: 'Boulogne', bloodType: 'B-', mutuelle: 'CPAM + Alan' },
  { firstName: 'Emma', lastName: 'Moreau', sex: 'female', birthDate: '2015-08-22', postal: '75015', city: 'Paris', bloodType: 'O+', mutuelle: 'CPAM + MGEN' },
  { firstName: 'Jules', lastName: 'Simon', sex: 'male', birthDate: '1948-02-14', postal: '75016', city: 'Paris', bloodType: 'A+', mutuelle: 'CPAM + MGEN' },
  { firstName: 'Chloé', lastName: 'Michel', sex: 'female', birthDate: '1990-05-19', postal: '75017', city: 'Paris', bloodType: 'AB-', mutuelle: 'CPAM + Harmonie' },
  { firstName: 'Nathan', lastName: 'Garcia', sex: 'male', birthDate: '1979-10-27', postal: '92200', city: 'Neuilly', bloodType: 'O+', mutuelle: 'CPAM + Apivia' },
  { firstName: 'Sarah', lastName: 'Roux', sex: 'female', birthDate: '2003-03-03', postal: '75018', city: 'Paris', bloodType: 'A+', mutuelle: 'CPAM + LMDE' },
  { firstName: 'Adam', lastName: 'David', sex: 'male', birthDate: '1962-07-11', postal: '75019', city: 'Paris', bloodType: 'B+', mutuelle: 'CPAM + MGEN' },
  { firstName: 'Inès', lastName: 'Bertrand', sex: 'female', birthDate: '1988-12-25', postal: '75010', city: 'Paris', bloodType: 'O+', mutuelle: 'CPAM + Aesio' },
  { firstName: 'Raphaël', lastName: 'Thomas', sex: 'male', birthDate: '1971-04-09', postal: '93100', city: 'Montreuil', bloodType: 'A-', mutuelle: 'CPAM + Alan' },
  { firstName: 'Anna', lastName: 'Lefebvre', sex: 'female', birthDate: '1998-09-17', postal: '75011', city: 'Paris', bloodType: 'AB+', mutuelle: 'CPAM + Harmonie' },
  { firstName: 'Tom', lastName: 'Mercier', sex: 'male', birthDate: '2010-06-21', postal: '75012', city: 'Paris', bloodType: 'O-', mutuelle: 'CPAM + MGEN' },
  { firstName: 'Jade', lastName: 'Blanc', sex: 'female', birthDate: '1976-02-28', postal: '75013', city: 'Paris', bloodType: 'A+', mutuelle: 'CPAM + Aesio' },
  { firstName: 'Mohamed', lastName: 'Benali', sex: 'male', birthDate: '1965-11-13', postal: '93000', city: 'Saint-Denis', bloodType: 'B+', mutuelle: 'CPAM + MGEN' },
  { firstName: 'Fatima', lastName: 'Zahra', sex: 'female', birthDate: '1993-08-04', postal: '93000', city: 'Saint-Denis', bloodType: 'O+', mutuelle: 'CPAM + Aesio' },
  { firstName: 'Yacine', lastName: 'Belkacem', sex: 'male', birthDate: '1985-05-26', postal: '94000', city: 'Créteil', bloodType: 'A+', mutuelle: 'CPAM + Harmonie' },
  { firstName: 'Amina', lastName: 'Khelifi', sex: 'female', birthDate: '1958-01-19', postal: '94000', city: 'Créteil', bloodType: 'AB+', mutuelle: 'CPAM + MGEN' },
  { firstName: 'Théo', lastName: 'Girard', sex: 'male', birthDate: '2005-10-30', postal: '75020', city: 'Paris', bloodType: 'O+', mutuelle: 'CPAM + LMDE' },
]

const PRACTITIONERS = [
  { name: 'Dr. Élise Moreau', specialty: 'general', rpps: '100000000001', color: '#0ea5e9' },
  { name: 'Dr. Antoine Lefèvre', specialty: 'general', rpps: '100000000002', color: '#06b6d4' },
  { name: 'Dr. Nathalie Rousseau', specialty: 'gyn', rpps: '100000000003', color: '#eab308' },
  { name: 'Dr. Karim Benali', specialty: 'ped', rpps: '100000000004', color: '#3b82f6' },
  { name: 'Dr. Sophie Lambert', specialty: 'derm', rpps: '100000000005', color: '#f97316' },
  { name: 'Dr. Mehdi Cherif', specialty: 'psych', rpps: '100000000006', color: '#ec4899' },
  { name: 'Dr. Laurent Faure', specialty: 'ophthal', rpps: '100000000007', color: '#22c55e' },
  { name: 'Dr. Julie Vincent', specialty: 'dental', rpps: '100000000008', color: '#14b8a6' },
  { name: 'Marc Dubois (Kiné)', specialty: 'physio', rpps: '100000000009', color: '#a855f7' },
]

const CCAM_CODES = [
  { code: 'DQPM003', label: 'Consultation médecin généraliste (cotation CS)', price: 25 },
  { code: 'DQPM001', label: 'Consultation médecin généraliste majorée', price: 30 },
  { code: 'CSCNAA01', label: 'Consultation cardiologie', price: 50 },
  { code: 'JQHP018', label: 'Électrocardiogramme (ECG)', price: 18 },
  { code: 'ZQPK004', label: 'Vaccination anti-grippale', price: 8 },
  { code: 'DDFA001', label: 'Examen dermatologique complet', price: 46 },
  { code: 'QYFA004', label: 'Extraction dentaire simple', price: 33 },
  { code: 'QYFA015', label: 'Détartrage dentaire complet', price: 28 },
  { code: 'YHFA003', label: 'Séance kinésithérapie (acte masso-kiné)', price: 19 },
  { code: 'MQFA008', label: 'Consultation gynécologique', price: 46 },
  { code: 'NQFA002', label: 'Consultation pédiatrique', price: 30 },
  { code: 'BHFA003', label: 'Fond d’œil (examen ophtalmologique)', price: 28 },
  { code: 'BLFA002', label: 'Tonometrie oculaire', price: 16 },
  { code: 'DQPX004', label: 'Consultation psychiatrique 30 min', price: 39 },
  { code: 'DQPX002', label: 'Suivi psychiatrique 15 min', price: 23 },
  { code: 'QQFA006', label: 'Injection intra-musculaire', price: 6 },
  { code: 'QZFA010', label: 'Pansement lésion étendue', price: 12 },
  { code: 'JQHD002', label: 'Spirométrie', price: 22 },
  { code: 'YHFA006', label: 'Examen ophtalmologique complet', price: 45 },
  { code: 'DDPC001', label: 'Biopsie cutanée', price: 65 },
]

const MEDICATIONS = [
  { name: 'Doliprane 1000mg (paracétamol)', dosage: '1000 mg', frequency: '3x/jour', duration: '5 jours', qty: 15 },
  { name: 'Ibuprofène 400mg', dosage: '400 mg', frequency: '3x/jour', duration: '7 jours', qty: 21 },
  { name: 'Amoxicilline 500mg', dosage: '500 mg', frequency: '3x/jour', duration: '7 jours', qty: 21 },
  { name: 'Spasfon (phloroglucinol)', dosage: '80 mg', frequency: '4x/jour', duration: '5 jours', qty: 20 },
  { name: 'Levothyrox 50µg', dosage: '50 µg', frequency: '1x/jour', duration: '30 jours', qty: 30 },
  { name: 'Kardegic 75mg (AAS)', dosage: '75 mg', frequency: '1x/jour', duration: '30 jours', qty: 30 },
  { name: 'Inexium 20mg (ésoméprazole)', dosage: '20 mg', frequency: '1x/jour', duration: '14 jours', qty: 14 },
  { name: 'Metformine 500mg', dosage: '500 mg', frequency: '2x/jour', duration: '30 jours', qty: 60 },
  { name: 'Ventoline (salbutamol)', dosage: '100 µg/pulsion', frequency: 'Si besoin', duration: 'PRN', qty: 1 },
  { name: 'Crestor 10mg (rosuvastatine)', dosage: '10 mg', frequency: '1x/jour', duration: '30 jours', qty: 30 },
  { name: 'Xanax 0.5mg (alprazolam)', dosage: '0.5 mg', frequency: '2x/jour', duration: '14 jours', qty: 28 },
  { name: 'Augmentin 1g (amoxicilline+acide clavulanique)', dosage: '1 g', frequency: '2x/jour', duration: '7 jours', qty: 14 },
]

const ALLERGIES = [
  { substance: 'Pénicilline', severity: 'severe' },
  { substance: 'Aspirine', severity: 'mild' },
  { substance: 'Iode', severity: 'moderate' },
  { substance: 'Arachide', severity: 'severe' },
  { substance: 'Pollen de bouleau', severity: 'mild' },
  { substance: 'Latex', severity: 'moderate' },
  { substance: 'Sulfamides', severity: 'moderate' },
  { substance: 'Codéine', severity: 'mild' },
]

const DIAGNOSES = [
  { code: 'J00', label: 'Rhinite aiguë (rhume)' },
  { code: 'J06.9', label: 'Infection aiguë des voies respiratoires supérieures' },
  { code: 'J20.9', label: 'Bronchite aiguë' },
  { code: 'K02.9', label: 'Caries dentaires' },
  { code: 'M54.5', label: 'Lombalgie' },
  { code: 'M25.5', label: 'Douleur articulaire' },
  { code: 'I10', label: 'Hypertension essentielle' },
  { code: 'E11.9', label: 'Diabète de type 2' },
  { code: 'E78.5', label: 'Hyperlipidémie' },
  { code: 'N39.0', label: 'Infection urinaire' },
  { code: 'L20.9', label: 'Dermatite atopique' },
  { code: 'L70.0', label: 'Acné' },
  { code: 'F41.1', label: 'Trouble anxieux généralisé' },
  { code: 'F32.9', label: 'Épisode dépressif' },
  { code: 'H52.4', label: 'Presbytie' },
  { code: 'N92.0', label: 'Cycle menstruel irrégulier' },
  { code: 'Z00.0', label: 'Examen médical général de routine' },
  { code: 'Z23', label: 'Vaccination' },
  { code: 'S93.4', label: 'Entorse de la cheville' },
  { code: 'S06.0', label: 'Commotion cérébrale' },
]

const slugify = (s: string) => s.toLowerCase()
  .replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[îï]/g, 'i')
  .replace(/[ôö]/g, 'o').replace(/[ûü]/g, 'u').replace(/[ç]/g, 'c')
  .replace(/[^a-z0-9.]/g, '.')

async function seed() {
  console.log('🌱 Seeding Smart Clinic database…')

  // Clean slate
  await db.auditLog.deleteMany()
  await db.consentRecord.deleteMany()
  await db.timelineEvent.deleteMany()
  await db.invoiceItem.deleteMany()
  await db.invoice.deleteMany()
  await db.prescription.deleteMany()
  await db.consultation.deleteMany()
  await db.vital.deleteMany()
  await db.allergy.deleteMany()
  await db.appointment.deleteMany()
  await db.resource.deleteMany()
  await db.practitioner.deleteMany()
  await db.patient.deleteMany()
  await db.user.deleteMany()
  await db.branch.deleteMany()
  await db.inventoryItem.deleteMany()
  await db.tenant.deleteMany()

  const tenant = await db.tenant.create({
    data: {
      slug: 'cabinet-lumiere',
      legalName: 'Cabinet Médical Lumière SAS',
      displayName: 'Cabinet Médical Lumière',
      specialty: 'multi',
      country: 'FR',
      timezone: 'Europe/Paris',
      locale: 'fr',
      addressLine: '24 Rue de la Roquette',
      postalCode: '75011',
      city: 'Paris',
      phone: '+33 1 42 38 90 12',
      email: 'contact@cabinet-lumiere.fr',
      siret: '89341205700018',
      adeli: '750011010247',
      plan: 'cloud-saas',
      densityMode: 'comfortable',
    },
  })
  console.log(`  ✓ Tenant: ${tenant.displayName}`)

  const bastille = await db.branch.create({
    data: {
      tenantId: tenant.id,
      name: 'Bastille',
      addressLine: '24 Rue de la Roquette',
      postalCode: '75011',
      city: 'Paris',
      phone: '+33 1 42 38 90 12',
    },
  })

  const nation = await db.branch.create({
    data: {
      tenantId: tenant.id,
      name: 'Nation',
      addressLine: '8 Avenue Philippe Auguste',
      postalCode: '75011',
      city: 'Paris',
      phone: '+33 1 43 72 45 88',
    },
  })
  console.log(`  ✓ Branches: ${bastille.name}, ${nation.name}`)

  const passwordHash = await hashPassword('smartclinic2026')
  const users = await db.$transaction([
    db.user.create({ data: { tenantId: tenant.id, email: 'admin@cabinet-lumiere.fr', name: 'Claire Fontaine', role: 'admin', passwordHash } }),
    db.user.create({ data: { tenantId: tenant.id, email: 'reception@cabinet-lumiere.fr', name: 'Marie Lefort', role: 'receptionist', passwordHash } }),
    db.user.create({ data: { tenantId: tenant.id, email: 'billing@cabinet-lumiere.fr', name: 'Paul Girard', role: 'billing', passwordHash } }),
    db.user.create({ data: { tenantId: tenant.id, email: 'auditor@cabinet-lumiere.fr', name: 'Sylvie Aumont', role: 'auditor', passwordHash } }),
  ])
  console.log(`  ✓ Users: ${users.length} staff accounts (password: smartclinic2026)`)

  const practitioners = await Promise.all(
    PRACTITIONERS.map((p, i) =>
      db.practitioner.create({
        data: {
          tenantId: tenant.id,
          branchId: i < 5 ? bastille.id : nation.id,
          name: p.name,
          specialty: p.specialty,
          rpps: p.rpps,
          color: p.color,
          adeli: `7500${String(i + 1).padStart(2, '0')}01${String(i + 1).padStart(3, '0')}`,
        },
      })
    )
  )
  console.log(`  ✓ Practitioners: ${practitioners.length}`)

  const resources = await Promise.all([
    db.resource.create({ data: { tenantId: tenant.id, branchId: bastille.id, name: 'Salle 1 — Consultation', type: 'room' } }),
    db.resource.create({ data: { tenantId: tenant.id, branchId: bastille.id, name: 'Salle 2 — Consultation', type: 'room' } }),
    db.resource.create({ data: { tenantId: tenant.id, branchId: bastille.id, name: 'Salle 3 — Urgences', type: 'room' } }),
    db.resource.create({ data: { tenantId: tenant.id, branchId: bastille.id, name: 'Fauteuil Dentaire A', type: 'chair' } }),
    db.resource.create({ data: { tenantId: tenant.id, branchId: bastille.id, name: 'ECG', type: 'equipment' } }),
    db.resource.create({ data: { tenantId: tenant.id, branchId: nation.id, name: 'Salle A — Consultation', type: 'room' } }),
    db.resource.create({ data: { tenantId: tenant.id, branchId: nation.id, name: 'Salle B — Kiné', type: 'room' } }),
    db.resource.create({ data: { tenantId: tenant.id, branchId: nation.id, name: 'Spiromètre', type: 'equipment' } }),
  ])

  const patients = await Promise.all(
    PATIENTS.map((p, i) =>
      db.patient.create({
        data: {
          tenantId: tenant.id,
          branchId: i % 2 === 0 ? bastille.id : nation.id,
          firstName: p.firstName,
          lastName: p.lastName,
          birthDate: new Date(p.birthDate),
          sex: p.sex,
          phone: `+33 6 ${String(10 + i).padStart(2, '0')} ${String(20 + i).padStart(2, '0')} ${String(30 + i).padStart(2, '0')} ${String(40 + i).padStart(2, '0')}`,
          email: `${slugify(p.firstName)}.${slugify(p.lastName)}@email.fr`,
          addressLine: `${10 + i} Rue de la Paix`,
          postalCode: p.postal,
          city: p.city,
          country: 'FR',
          ssn: `1${p.sex === 'male' ? '' : '2'}${String(87 + i % 10).padStart(2, '0')}11${String(100 + i).padStart(3, '0')}${String(100 + i).padStart(3, '0')}${String(i * 7).padStart(2, '0')}`,
          mutuelle: p.mutuelle,
          insuranceNumber: `CPAM-${String(10000 + i).padStart(5, '0')}`,
          bloodType: p.bloodType,
          heightCm: p.sex === 'male' ? 170 + (i % 20) : 160 + (i % 15),
          weightKg: p.sex === 'male' ? 70 + (i % 20) : 55 + (i % 15),
          tags: i % 5 === 0 ? JSON.stringify(['chronique', 'prioritaire']) : i % 3 === 0 ? JSON.stringify(['nouveau']) : null,
        },
      })
    )
  )
  console.log(`  ✓ Patients: ${patients.length}`)

  for (let i = 0; i < patients.length; i++) {
    if (i % 4 === 0) {
      const allergy = ALLERGIES[i % ALLERGIES.length]
      await db.allergy.create({ data: { patientId: patients[i].id, substance: allergy.substance, severity: allergy.severity } })
    }
  }

  for (let i = 0; i < patients.length; i++) {
    const bp = `${110 + (i % 30)}/${70 + (i % 20)}`
    await db.vital.create({ data: { patientId: patients[i].id, type: 'blood_pressure', value: bp, unit: 'mmHg', recordedBy: practitioners[i % practitioners.length].name } })
    await db.vital.create({ data: { patientId: patients[i].id, type: 'heart_rate', value: String(60 + (i % 30)), unit: 'bpm', recordedBy: practitioners[i % practitioners.length].name } })
    if (i % 3 === 0) {
      await db.vital.create({ data: { patientId: patients[i].id, type: 'temperature', value: String(36.5 + (i % 10) / 10), unit: '°C', recordedBy: practitioners[i % practitioners.length].name } })
    }
  }

  const now = new Date()
  const appointments = []
  for (let dayOffset = -14; dayOffset <= 14; dayOffset++) {
    const day = new Date(now)
    day.setDate(day.getDate() + dayOffset)
    const dayOfWeek = day.getDay()
    if (dayOfWeek === 0) continue
    const apptsPerDay = dayOffset === 0 ? 8 : 5 + (dayOffset % 3)
    for (let i = 0; i < apptsPerDay; i++) {
      const patient = patients[Math.abs(dayOffset + i + 3) % patients.length]
      const practitioner = practitioners[Math.abs(i + dayOffset) % practitioners.length]
      const resource = resources[Math.abs(i + dayOffset) % resources.length]
      const hour = 9 + Math.floor(i / 2)
      const minute = (i % 2) * 30
      const startAt = new Date(day)
      startAt.setHours(hour, minute, 0, 0)
      const duration = practitioner.specialty === 'physio' ? 30 : 30
      const endAt = new Date(startAt)
      endAt.setMinutes(endAt.getMinutes() + duration)

      let status = 'scheduled'
      if (dayOffset < 0) status = i % 7 === 0 ? 'no_show' : 'completed'
      else if (dayOffset === 0) status = i < 3 ? 'completed' : i === 3 ? 'in_session' : i === 4 ? 'checked_in' : 'scheduled'
      else status = i % 9 === 0 ? 'cancelled' : 'scheduled'

      const noShowRisk = status === 'no_show' ? 0.85 : status === 'cancelled' ? 0.6 : (i * 13 + dayOffset * 7) % 100 / 100

      const appt = await db.appointment.create({
        data: {
          tenantId: tenant.id,
          branchId: practitioner.branchId,
          patientId: patient.id,
          practitionerId: practitioner.id,
          resourceId: resource.id,
          startAt,
          endAt,
          status,
          type: i % 7 === 0 ? 'follow_up' : i % 11 === 0 ? 'telemedicine' : 'consultation',
          reason: ['Consultation de routine', 'Suivi pathologie chronique', 'Symptômes grippaux', 'Douleur', 'Vaccination', 'Bilan annuel'][i % 6],
          noShowRisk: Math.round(noShowRisk * 100) / 100,
        },
      })
      appointments.push(appt)
    }
  }
  console.log(`  ✓ Appointments: ${appointments.length} (over 28 days)`)

  const completedAppts = appointments.filter(a => a.status === 'completed')
  const consultations = []
  for (let idx = 0; idx < Math.min(40, completedAppts.length); idx++) {
    const appt = completedAppts[idx]
    const dx = DIAGNOSES[idx % DIAGNOSES.length]
    const ccam = CCAM_CODES[idx % CCAM_CODES.length]
    const aiDrafted = idx % 5 === 0
    const consultation = await db.consultation.create({
      data: {
        tenantId: tenant.id,
        patientId: appt.patientId,
        practitionerId: appt.practitionerId,
        appointmentId: appt.id,
        startAt: appt.startAt,
        durationMin: 30,
        chiefComplaint: appt.reason || 'Consultation',
        history: `Patient rapporte des symptômes évoluant depuis quelques jours. Antécédents ${dx.label.toLowerCase()} notés.`,
        examination: 'Examen clinique: état général conservé, pas de signe de gravité. Auscultation cardiaque et pulmonaire sans anomalie.',
        assessment: `Diagnostic retenu: ${dx.label} (ICD-10: ${dx.code}).`,
        plan: `Prescription médicamenteuse. Surveillance clinique. Reconsultation si aggravation ou absence d'amélioration sous 7 jours.`,
        diagnosisCodes: JSON.stringify([dx]),
        procedureCodes: JSON.stringify([ccam]),
        aiDrafted,
        aiConfidence: aiDrafted ? 0.78 + (idx % 20) / 100 : 0,
        signedBy: practitioners.find(p => p.id === appt.practitionerId)?.name,
        signedAt: appt.startAt,
      },
    })
    consultations.push(consultation)

    if (idx % 2 === 0) {
      const med = MEDICATIONS[idx % MEDICATIONS.length]
      await db.prescription.create({
        data: {
          tenantId: tenant.id,
          patientId: appt.patientId,
          consultationId: consultation.id,
          practitionerId: appt.practitionerId,
          medication: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          quantity: med.qty,
          instructions: 'À prendre avec un grand verre d\'eau. Ne pas dépasser la dose prescrite.',
          status: 'active',
        },
      })
    }
  }
  console.log(`  ✓ Consultations: ${consultations.length} (with prescriptions)`)

  let invoiceCounter = 1
  for (const appt of completedAppts) {
    const ccam = CCAM_CODES[invoiceCounter % CCAM_CODES.length]
    const subtotal = ccam.price
    const insuranceCovered = Math.round(subtotal * 0.7 * 100) / 100
    const patientShare = Math.round((subtotal - insuranceCovered) * 100) / 100
    const status = invoiceCounter % 5 === 0 ? 'pending' : invoiceCounter % 7 === 0 ? 'partial' : 'paid'
    const invoice = await db.invoice.create({
      data: {
        tenantId: tenant.id,
        patientId: appt.patientId,
        number: `FAC-2026-${String(invoiceCounter).padStart(5, '0')}`,
        issueDate: appt.startAt,
        dueDate: new Date(appt.startAt.getTime() + 30 * 24 * 60 * 60 * 1000),
        status,
        subtotal,
        taxRate: 0,
        taxAmount: 0,
        total: subtotal,
        paidAmount: status === 'paid' ? subtotal : status === 'partial' ? patientShare : 0,
        tiersPayant: true,
        insuranceCovered,
        patientShare,
        paymentMethod: status === 'paid' ? 'card' : null,
        paidAt: status === 'paid' ? appt.startAt : null,
      },
    })
    await db.invoiceItem.create({
      data: {
        invoiceId: invoice.id,
        description: ccam.label,
        code: ccam.code,
        codeType: 'ccam',
        quantity: 1,
        unitPrice: ccam.price,
        total: ccam.price,
      },
    })
    invoiceCounter++
  }
  console.log(`  ✓ Invoices: ${invoiceCounter - 1}`)

  for (const patient of patients) {
    const patientAppts = appointments.filter(a => a.patientId === patient.id)
    const patientConsults = consultations.filter(c => c.patientId === patient.id)
    const patientInvoices = await db.invoice.findMany({ where: { patientId: patient.id } })

    for (const appt of patientAppts.slice(0, 5)) {
      await db.timelineEvent.create({
        data: {
          patientId: patient.id,
          type: 'appointment',
          title: `Rendez-vous — ${practitioners.find(p => p.id === appt.practitionerId)?.name || 'Praticien'}`,
          description: `${appt.reason || 'Consultation'} (${appt.status})`,
          occurredAt: appt.startAt,
        }
      })
    }
    for (const c of patientConsults.slice(0, 3)) {
      const dx = c.diagnosisCodes ? JSON.parse(c.diagnosisCodes) : []
      await db.timelineEvent.create({
        data: {
          patientId: patient.id,
          type: 'consultation',
          title: `Consultation — ${dx[0]?.label || 'Diagnostic'}`,
          description: c.assessment,
          occurredAt: c.startAt,
        }
      })
    }
    for (const inv of patientInvoices.slice(0, 3)) {
      await db.timelineEvent.create({
        data: {
          patientId: patient.id,
          type: 'invoice',
          title: `Facture ${inv.number}`,
          description: `${inv.total.toFixed(2)} € — ${inv.status}`,
          occurredAt: inv.issueDate,
        }
      })
    }
  }

  for (const patient of patients) {
    await db.consentRecord.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        type: 'treatment',
        status: 'granted',
        grantedAt: patient.createdAt,
      }
    })
    const idx = patients.indexOf(patient)
    if (idx % 3 === 0) {
      await db.consentRecord.create({
        data: {
          tenantId: tenant.id,
          patientId: patient.id,
          type: 'ai_scribe',
          status: 'granted',
          grantedAt: patient.createdAt,
          notes: 'Consentement pour la transcription ambiante IA',
        }
      })
    } else if (idx % 5 === 0) {
      await db.consentRecord.create({
        data: {
          tenantId: tenant.id,
          patientId: patient.id,
          type: 'ai_scribe',
          status: 'pending',
        }
      })
    }
    if (idx % 4 === 0) {
      await db.consentRecord.create({
        data: {
          tenantId: tenant.id,
          patientId: patient.id,
          type: 'telemedicine',
          status: 'granted',
          grantedAt: patient.createdAt,
        }
      })
    }
  }

  const inventory = [
    { name: 'Masques chirurgicaux (boîte de 50)', category: 'consumable', unit: 'box', stock: 24, reorderAt: 5, unitPrice: 12 },
    { name: 'Gants nitrile M (boîte de 100)', category: 'consumable', unit: 'box', stock: 8, reorderAt: 5, unitPrice: 9 },
    { name: 'Compresses stériles 7.5x7.5', category: 'consumable', unit: 'pack', stock: 30, reorderAt: 10, unitPrice: 4 },
    { name: 'Seringues 5ml', category: 'consumable', unit: 'box', stock: 12, reorderAt: 5, unitPrice: 6 },
    { name: 'Aiguilles 21G', category: 'consumable', unit: 'box', stock: 4, reorderAt: 5, unitPrice: 8 },
    { name: 'Doliprane 1000mg (boîte de 16)', category: 'medication', unit: 'box', stock: 40, reorderAt: 10, unitPrice: 2.5, expiry: '2027-06-30' },
    { name: 'Amoxicilline 500mg (boîte de 12)', category: 'medication', unit: 'box', stock: 15, reorderAt: 5, unitPrice: 3.2, expiry: '2027-03-15' },
    { name: 'Vaccin antigrippal', category: 'medication', unit: 'vial', stock: 6, reorderAt: 10, unitPrice: 9.5, expiry: '2026-12-31' },
    { name: 'Insuline Lantus', category: 'medication', unit: 'vial', stock: 3, reorderAt: 5, unitPrice: 18, expiry: '2026-11-30' },
    { name: 'Alcool 70° (1L)', category: 'consumable', unit: 'unit', stock: 18, reorderAt: 5, unitPrice: 4.5 },
    { name: 'Tensiomètre électronique', category: 'equipment', unit: 'unit', stock: 3, reorderAt: 1, unitPrice: 89 },
    { name: 'Oxymètre de pouls', category: 'equipment', unit: 'unit', stock: 2, reorderAt: 1, unitPrice: 35 },
  ]
  for (const item of inventory) {
    await db.inventoryItem.create({
      data: {
        tenantId: tenant.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        stock: item.stock,
        reorderAt: item.reorderAt,
        unitPrice: item.unitPrice,
        expiryDate: item.expiry ? new Date(item.expiry) : null,
      },
    })
  }
  console.log(`  ✓ Inventory: ${inventory.length} items`)

  console.log('  Building hash-chained audit log…')
  const auditActions = [
    { userId: users[0].id, action: 'login', entity: 'user', entityId: users[0].id, payload: { email: users[0].email }, ip: '82.65.12.4' },
    { userId: users[1].id, action: 'view', entity: 'patient', entityId: patients[0].id, payload: { patient: `${patients[0].firstName} ${patients[0].lastName}` } },
    { userId: users[1].id, action: 'create', entity: 'appointment', entityId: appointments[0]?.id, payload: { patient: patients[0].id, practitioner: practitioners[0].id } },
    { userId: users[0].id, action: 'view', entity: 'patient', entityId: patients[1].id, payload: { patient: `${patients[1].firstName} ${patients[1].lastName}` } },
    { userId: users[2].id, action: 'create', entity: 'invoice', payload: { number: 'FAC-2026-00001' } },
    { userId: users[1].id, action: 'update', entity: 'appointment', entityId: appointments[1]?.id, payload: { field: 'status', from: 'scheduled', to: 'checked_in' } },
    { userId: users[0].id, action: 'export', entity: 'patient', entityId: patients[2].id, payload: { format: 'pdf', reason: 'transfer' } },
    { userId: users[1].id, action: 'view', entity: 'patient', entityId: patients[3].id, payload: { patient: `${patients[3].firstName} ${patients[3].lastName}` } },
    { userId: users[3].id, action: 'view', entity: 'audit_log', payload: { filter: 'last_24h' } },
    { userId: users[1].id, action: 'break_glass', entity: 'patient', entityId: patients[5].id, payload: { reason: 'Urgence vitale — patient inconscient' }, ip: '82.65.12.4' },
    { userId: users[0].id, action: 'update', entity: 'user', entityId: users[1].id, payload: { field: 'role' } },
    { userId: users[2].id, action: 'create', entity: 'invoice', payload: { number: 'FAC-2026-00002' } },
    { userId: users[1].id, action: 'view', entity: 'patient', entityId: patients[6].id, payload: {} },
    { userId: users[0].id, action: 'login', entity: 'user', entityId: users[0].id, payload: { ip: '82.65.12.4' } },
    { userId: users[1].id, action: 'create', entity: 'appointment', entityId: appointments[2]?.id, payload: {} },
  ]
  for (let i = 0; i < 50; i++) {
    auditActions.push({
      userId: users[i % users.length].id,
      action: ['view', 'update', 'create'][i % 3],
      entity: ['patient', 'appointment', 'consultation', 'invoice'][i % 4],
      entityId: i % 2 === 0 ? patients[i % patients.length].id : appointments[i % appointments.length].id,
      payload: { note: `Action #${i}` },
    })
  }

  let prevHash = '0'.repeat(64)
  // Make timestamps strictly increasing with insertion order so ASC ordering matches chain order
  const baseTime = now.getTime() - auditActions.length * 60000
  for (let idx = 0; idx < auditActions.length; idx++) {
    const entry = auditActions[idx]
    const createdAt = new Date(baseTime + idx * 60000)
    const payload = JSON.stringify(entry.payload || {})
    const hashInput = `${prevHash}|${entry.action}|${entry.entity}|${entry.entityId || ''}|${payload}|${createdAt.toISOString()}`
    const hash = sha256(hashInput)
    await db.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        prevHash,
        hash,
        ipAddress: entry.ip || null,
        userAgent: 'SmartClinic/1.0 (Web)',
        payload,
        reason: entry.action === 'break_glass' ? (entry.payload as any)?.reason : null,
        createdAt,
      }
    })
    prevHash = hash
  }
  console.log(`  ✓ Audit log: ${auditActions.length} hash-chained entries`)

  console.log('\n✅ Seed complete. Database ready.')
  console.log(`\nLogin: admin@cabinet-lumiere.fr / smartclinic2026`)
}

seed()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
