// Smart Clinic — PGlite Database Manager
// Per ADR-001: embedded PostgreSQL via PGlite for on-prem desktop
// Per master prompt §8.3: offline-first, no external database server needed

import { PGlite } from '@electric-sql/pglite'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'

const DB_DIR = path.join(
  os.homedir(),
  process.platform === 'darwin'
    ? 'Library/Application Support/SmartClinic/data'
    : process.platform === 'win32'
    ? 'AppData/Roaming/SmartClinic/data'
    : '.config/smartclinic/data'
)

// The schema mirrors our Prisma schema but in raw SQL (PostgreSQL-compatible)
// This runs on PGlite (embedded PostgreSQL) — same SQL dialect as production
const SCHEMA_SQL = `
-- Tenant
CREATE TABLE IF NOT EXISTS "Tenant" (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  "legalName" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  specialty TEXT DEFAULT 'multi',
  country TEXT DEFAULT 'FR',
  timezone TEXT DEFAULT 'Europe/Paris',
  locale TEXT DEFAULT 'fr',
  "addressLine" TEXT,
  "postalCode" TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  siret TEXT,
  adeli TEXT,
  plan TEXT DEFAULT 'cloud-saas',
  "densityMode" TEXT DEFAULT 'comfortable',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Branch
CREATE TABLE IF NOT EXISTS "Branch" (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "addressLine" TEXT,
  "postalCode" TEXT,
  city TEXT,
  phone TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- User
CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  "passwordHash" TEXT NOT NULL,
  locale TEXT DEFAULT 'fr',
  active BOOLEAN DEFAULT TRUE,
  "lastLoginAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Practitioner
CREATE TABLE IF NOT EXISTS "Practitioner" (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "branchId" TEXT REFERENCES "Branch"(id),
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  rpps TEXT,
  adeli TEXT,
  color TEXT DEFAULT '#0ea5e9',
  active BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Patient
CREATE TABLE IF NOT EXISTS "Patient" (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "branchId" TEXT REFERENCES "Branch"(id),
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "birthDate" TIMESTAMP,
  sex TEXT,
  phone TEXT,
  email TEXT,
  "addressLine" TEXT,
  "postalCode" TEXT,
  city TEXT,
  country TEXT DEFAULT 'FR',
  ssn TEXT,
  mutuelle TEXT,
  "insuranceNumber" TEXT,
  "bloodType" TEXT,
  "heightCm" INTEGER,
  "weightKg" REAL,
  notes TEXT,
  tags TEXT,
  active BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Appointment
CREATE TABLE IF NOT EXISTS "Appointment" (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "branchId" TEXT REFERENCES "Branch"(id),
  "patientId" TEXT NOT NULL REFERENCES "Patient"(id) ON DELETE CASCADE,
  "practitionerId" TEXT NOT NULL REFERENCES "Practitioner"(id),
  "resourceId" TEXT,
  "startAt" TIMESTAMP NOT NULL,
  "endAt" TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'scheduled',
  type TEXT DEFAULT 'consultation',
  reason TEXT,
  notes TEXT,
  "noShowRisk" REAL DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Consultation
CREATE TABLE IF NOT EXISTS "Consultation" (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "patientId" TEXT NOT NULL REFERENCES "Patient"(id) ON DELETE CASCADE,
  "practitionerId" TEXT NOT NULL REFERENCES "Practitioner"(id),
  "appointmentId" TEXT UNIQUE REFERENCES "Appointment"(id),
  "startAt" TIMESTAMP DEFAULT NOW(),
  "durationMin" INTEGER DEFAULT 30,
  "chiefComplaint" TEXT,
  history TEXT,
  examination TEXT,
  assessment TEXT,
  plan TEXT,
  "diagnosisCodes" TEXT,
  "procedureCodes" TEXT,
  "aiDrafted" BOOLEAN DEFAULT FALSE,
  "aiConfidence" REAL DEFAULT 0,
  "signedBy" TEXT,
  "signedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Prescription
CREATE TABLE IF NOT EXISTS "Prescription" (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "patientId" TEXT NOT NULL REFERENCES "Patient"(id) ON DELETE CASCADE,
  "consultationId" TEXT REFERENCES "Consultation"(id),
  "practitionerId" TEXT NOT NULL REFERENCES "Practitioner"(id),
  medication TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  duration TEXT,
  quantity INTEGER,
  instructions TEXT,
  status TEXT DEFAULT 'active',
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Invoice
CREATE TABLE IF NOT EXISTS "Invoice" (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "patientId" TEXT NOT NULL REFERENCES "Patient"(id) ON DELETE CASCADE,
  number TEXT UNIQUE NOT NULL,
  "issueDate" TIMESTAMP DEFAULT NOW(),
  "dueDate" TIMESTAMP,
  status TEXT DEFAULT 'draft',
  subtotal REAL DEFAULT 0,
  "taxRate" REAL DEFAULT 0,
  "taxAmount" REAL DEFAULT 0,
  total REAL DEFAULT 0,
  "paidAmount" REAL DEFAULT 0,
  "tiersPayant" BOOLEAN DEFAULT FALSE,
  "insuranceCovered" REAL DEFAULT 0,
  "patientShare" REAL DEFAULT 0,
  "paymentMethod" TEXT,
  "paidAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Audit Log (hash-chained)
CREATE TABLE IF NOT EXISTS "AuditLog" (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "userId" TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  "entityId" TEXT,
  "prevHash" TEXT,
  hash TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  payload TEXT,
  reason TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Patient Document (base64 content stored locally)
CREATE TABLE IF NOT EXISTS "PatientDocument" (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "patientId" TEXT NOT NULL REFERENCES "Patient"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  content TEXT NOT NULL,
  "uploadedBy" TEXT,
  "uploadedAt" TIMESTAMP DEFAULT NOW(),
  description TEXT
);

-- Lab Result
CREATE TABLE IF NOT EXISTS "LabResult" (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "patientId" TEXT NOT NULL REFERENCES "Patient"(id) ON DELETE CASCADE,
  "testName" TEXT NOT NULL,
  value TEXT NOT NULL,
  unit TEXT NOT NULL,
  "refRangeLow" REAL,
  "refRangeHigh" REAL,
  flag TEXT DEFAULT 'normal',
  category TEXT DEFAULT 'general',
  "collectedAt" TIMESTAMP DEFAULT NOW(),
  "resultedAt" TIMESTAMP DEFAULT NOW(),
  "performedBy" TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_patient_tenant ON "Patient"("tenantId");
CREATE INDEX IF NOT EXISTS idx_patient_name ON "Patient"("lastName", "firstName");
CREATE INDEX IF NOT EXISTS idx_appointment_tenant ON "Appointment"("tenantId");
CREATE INDEX IF NOT EXISTS idx_appointment_start ON "Appointment"("startAt");
CREATE INDEX IF NOT EXISTS idx_consultation_patient ON "Consultation"("patientId");
CREATE INDEX IF NOT EXISTS idx_invoice_patient ON "Invoice"("patientId");
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON "AuditLog"("tenantId");
CREATE INDEX IF NOT EXISTS idx_audit_created ON "AuditLog"("createdAt");
`

export class DatabaseManager {
  private db: PGlite | null = null

  async initialize(): Promise<void> {
    await fs.mkdir(DB_DIR, { recursive: true })

    this.db = new PGlite({
      dataDir: path.join(DB_DIR, 'smartclinic-pglite'),
    })

    // Run schema migration
    await this.db.exec(SCHEMA_SQL)
    console.log('[DB] PGlite schema initialized at', DB_DIR)
  }

  async query(sql: string, params?: any[]): Promise<any> {
    if (!this.db) throw new Error('Database not initialized')

    const result = await this.db.query(sql, params || [])
    return {
      rows: result.rows || [],
      rowCount: result.rows?.length || 0,
    }
  }

  async exec(sql: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    await this.db.exec(sql)
  }

  async exportAll(): Promise<any> {
    if (!this.db) throw new Error('Database not initialized')

    const tables = [
      'Tenant', 'Branch', 'User', 'Practitioner', 'Patient',
      'Appointment', 'Consultation', 'Prescription', 'Invoice',
      'AuditLog', 'PatientDocument', 'LabResult',
    ]

    const data: Record<string, any[]> = {}
    for (const table of tables) {
      const result = await this.db.query(`SELECT * FROM "${table}"`)
      data[table] = result.rows || []
    }

    return {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      data,
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close()
      this.db = null
      console.log('[DB] PGlite closed')
    }
  }
}
