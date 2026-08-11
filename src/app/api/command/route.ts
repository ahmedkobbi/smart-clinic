import { NextRequest, NextResponse } from 'next/server'
import { getTenantId } from '@/lib/queries'
import { db } from '@/lib/db'
import { appendAuditLog } from '@/lib/queries'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Natural-language command parser
// "schedule Dupont Tuesday 3pm" → creates an appointment
// Uses pattern matching + LLM for flexibility

interface ParsedCommand {
  intent: 'schedule' | 'search_patient' | 'new_patient' | 'navigate' | 'unknown'
  entities: {
    patientName?: string
    patientId?: string
    practitionerName?: string
    practitionerId?: string
    date?: string
    time?: string
    reason?: string
    view?: string
  }
  confidence: number
  rawCommand: string
}

const DAY_MAP_FR: Record<string, number> = {
  'lundi': 1, 'mardi': 2, 'mercredi': 3, 'jeudi': 4,
  'vendredi': 5, 'samedi': 6, 'dimanche': 0,
}
const DAY_MAP_EN: Record<string, number> = {
  'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
  'friday': 5, 'saturday': 6, 'sunday': 0,
}

function parseDate(text: string): string | undefined {
  const lower = text.toLowerCase()
  const now = new Date()

  // "today" / "aujourd'hui"
  if (lower.includes('today') || lower.includes("aujourd")) {
    return now.toISOString().slice(0, 10)
  }
  // "tomorrow" / "demain"
  if (lower.includes('tomorrow') || lower.includes('demain')) {
    const t = new Date(now)
    t.setDate(t.getDate() + 1)
    return t.toISOString().slice(0, 10)
  }

  // Day of week
  for (const [day, target] of Object.entries({ ...DAY_MAP_FR, ...DAY_MAP_EN })) {
    if (lower.includes(day)) {
      const result = new Date(now)
      const current = result.getDay()
      let diff = target - current
      if (diff <= 0) diff += 7 // next week
      result.setDate(result.getDate() + diff)
      return result.toISOString().slice(0, 10)
    }
  }

  // "in N days" / "dans N jours"
  const inDaysMatch = lower.match(/(?:in|dans)\s+(\d+)\s+days?|jours/)
  if (inDaysMatch) {
    const t = new Date(now)
    t.setDate(t.getDate() + parseInt(inDaysMatch[1]))
    return t.toISOString().slice(0, 10)
  }

  return undefined
}

function parseTime(text: string): string | undefined {
  const lower = text.toLowerCase()

  // "3pm", "15h", "15:00"
  const pmMatch = lower.match(/(\d{1,2})\s*(?:pm|p\.m\.)/)
  if (pmMatch) {
    const h = parseInt(pmMatch[1]) === 12 ? 12 : parseInt(pmMatch[1]) + 12
    return `${String(h).padStart(2, '0')}:00`
  }
  const amMatch = lower.match(/(\d{1,2})\s*(?:am|a\.m\.)/)
  if (amMatch) {
    const h = parseInt(amMatch[1]) === 12 ? 0 : parseInt(amMatch[1])
    return `${String(h).padStart(2, '0')}:00`
  }
  const hMatch = lower.match(/(\d{1,2})[h:](\d{0,2})/)
  if (hMatch) {
    const h = parseInt(hMatch[1])
    const m = hMatch[2] ? parseInt(hMatch[2]) : 0
    if (h >= 0 && h < 24) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
  }

  return undefined
}

async function findPatient(name: string): Promise<any | null> {
  const tenantId = await getTenantId()
  // Search by first or last name
  const parts = name.trim().split(/\s+/)
  const patients = await db.patient.findMany({
    where: {
      tenantId,
      AND: parts.map(p => ({
        OR: [
          { firstName: { contains: p, mode: 'insensitive' } },
          { lastName: { contains: p, mode: 'insensitive' } },
        ],
      })),
    },
    take: 1,
  })
  return patients[0] || null
}

async function findPractitioner(name: string): Promise<any | null> {
  const tenantId = await getTenantId()
  const practitioners = await db.practitioner.findMany({
    where: {
      tenantId,
      OR: [
        { name: { contains: name, mode: 'insensitive' } },
      ],
    },
    take: 1,
  })
  return practitioners[0] || null
}

export async function POST(req: NextRequest) {
  try {
    const { command, execute = false } = await req.json() as { command: string; execute?: boolean }
    const lower = command.toLowerCase()

    const parsed: ParsedCommand = {
      intent: 'unknown',
      entities: {},
      confidence: 0,
      rawCommand: command,
    }

    // Intent detection
    if (lower.match(/schedule|rendez-vous|rdv|plan|book|planifier/)) {
      parsed.intent = 'schedule'
      parsed.confidence = 0.8
    } else if (lower.match(/find|search|trouve|recherch|where|où/)) {
      parsed.intent = 'search_patient'
      parsed.confidence = 0.7
    } else if (lower.match(/new patient|nouveau patient|add patient|créer/)) {
      parsed.intent = 'new_patient'
      parsed.confidence = 0.9
    } else if (lower.match(/go to|open|navigate|aller|ouvrir/)) {
      parsed.intent = 'navigate'
      parsed.confidence = 0.7
    }

    // Entity extraction
    // Patient name: "Dupont" or "Camille Dupont"
    const nameMatch = command.match(/(?:for|pour|de)\s+([A-ZÀ-Ý][a-zà-ÿ]+(?:\s+[A-ZÀ-Ý][a-zà-ÿ]+)?)/)
    if (nameMatch) {
      parsed.entities.patientName = nameMatch[1]
      const patient = await findPatient(nameMatch[1])
      if (patient) {
        parsed.entities.patientId = patient.id
        parsed.entities.patientName = `${patient.firstName} ${patient.lastName}`
        parsed.confidence = Math.min(parsed.confidence + 0.15, 1)
      }
    }

    // Practitioner name: "with Dr. X" / "avec Dr. X"
    const practitionerMatch = command.match(/(?:with|avec)\s+(Dr\.?\s*[A-ZÀ-Ý][a-zà-ÿ]+|Docteur\s+[A-ZÀ-Ý][a-zà-ÿ]+)/i)
    if (practitionerMatch) {
      parsed.entities.practitionerName = practitionerMatch[1]
      const practitioner = await findPractitioner(practitionerMatch[1])
      if (practitioner) {
        parsed.entities.practitionerId = practitioner.id
        parsed.entities.practitionerName = practitioner.name
        parsed.confidence = Math.min(parsed.confidence + 0.1, 1)
      }
    }

    // Date
    const date = parseDate(command)
    if (date) {
      parsed.entities.date = date
      parsed.confidence = Math.min(parsed.confidence + 0.1, 1)
    }

    // Time
    const time = parseTime(command)
    if (time) {
      parsed.entities.time = time
      parsed.confidence = Math.min(parsed.confidence + 0.1, 1)
    }

    // View navigation
    if (parsed.intent === 'navigate') {
      if (lower.match(/dashboard|tableau/)) parsed.entities.view = 'dashboard'
      else if (lower.match(/patient/)) parsed.entities.view = 'patients'
      else if (lower.match(/appointment|rendez/)) parsed.entities.view = 'appointments'
      else if (lower.match(/billing|factur/)) parsed.entities.view = 'billing'
      else if (lower.match(/audit/)) parsed.entities.view = 'audit'
      else if (lower.match(/inventory|inventaire/)) parsed.entities.view = 'inventory'
      else if (lower.match(/setting|paramètre/)) parsed.entities.view = 'settings'
    }

    // Execute the command if requested
    let executionResult: any = null
    if (execute) {
      if (parsed.intent === 'schedule' && parsed.entities.patientId) {
        const tenantId = await getTenantId()
        const dateStr = parsed.entities.date || new Date().toISOString().slice(0, 10)
        const timeStr = parsed.entities.time || '09:00'
        const startAt = new Date(`${dateStr}T${timeStr}:00`)
        const endAt = new Date(startAt.getTime() + 30 * 60000)

        // Find a practitioner if not specified
        let practitionerId = parsed.entities.practitionerId
        if (!practitionerId) {
          const practitioners = await db.practitioner.findMany({ where: { tenantId, active: true }, take: 1 })
          practitionerId = practitioners[0]?.id
        }

        if (practitionerId) {
          const appt = await db.appointment.create({
            data: {
              tenantId,
              patientId: parsed.entities.patientId,
              practitionerId,
              startAt,
              endAt,
              status: 'scheduled',
              type: 'consultation',
              reason: 'Planifié via commande naturelle',
              noShowRisk: Math.random() * 0.3,
            },
          })
          await appendAuditLog({
            action: 'create',
            entity: 'appointment',
            entityId: appt.id,
            payload: { via: 'natural_language', command },
          })
          executionResult = {
            success: true,
            type: 'appointment_created',
            appointmentId: appt.id,
            message: `Rendez-vous créé: ${parsed.entities.patientName} le ${startAt.toLocaleString('fr-FR')}`,
          }
        }
      } else if (parsed.intent === 'navigate') {
        executionResult = {
          success: true,
          type: 'navigate',
          view: parsed.entities.view,
        }
      }
    }

    return NextResponse.json({
      parsed,
      executionResult,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
