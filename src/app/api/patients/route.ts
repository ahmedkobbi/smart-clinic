import { NextRequest, NextResponse } from 'next/server'
import { getPatients, getTenantId, appendAuditLog } from '@/lib/queries'
import { db } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const PatientCreateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  birthDate: z.string().optional(),
  sex: z.enum(['male', 'female', 'other', 'unknown']).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  addressLine: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('FR'),
  ssn: z.string().optional(),
  mutuelle: z.string().optional(),
  insuranceNumber: z.string().optional(),
  bloodType: z.string().optional(),
  heightCm: z.number().int().optional(),
  weightKg: z.number().optional(),
  notes: z.string().optional(),
  branchId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const search = url.searchParams.get('search') || undefined
    const branchId = url.searchParams.get('branchId') || undefined
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const result = await getPatients({ search, branchId, limit, offset })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = PatientCreateSchema.parse(body)
    const tenantId = await getTenantId()
    const patient = await db.patient.create({
      data: {
        tenantId,
        branchId: parsed.branchId || null,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        birthDate: parsed.birthDate ? new Date(parsed.birthDate) : null,
        sex: parsed.sex || null,
        phone: parsed.phone || null,
        email: parsed.email || null,
        addressLine: parsed.addressLine || null,
        postalCode: parsed.postalCode || null,
        city: parsed.city || null,
        country: parsed.country,
        ssn: parsed.ssn || null,
        mutuelle: parsed.mutuelle || null,
        insuranceNumber: parsed.insuranceNumber || null,
        bloodType: parsed.bloodType || null,
        heightCm: parsed.heightCm || null,
        weightKg: parsed.weightKg || null,
        notes: parsed.notes || null,
      },
    })
    await appendAuditLog({
      action: 'create',
      entity: 'patient',
      entityId: patient.id,
      payload: { name: `${patient.firstName} ${patient.lastName}` },
    })
    // Seed a timeline event
    await db.timelineEvent.create({
      data: {
        patientId: patient.id,
        type: 'note',
        title: 'Patient créé',
        description: `Dossier patient initialisé`,
        occurredAt: new Date(),
      },
    })
    return NextResponse.json(patient, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
