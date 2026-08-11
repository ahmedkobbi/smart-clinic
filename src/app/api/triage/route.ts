import { NextRequest, NextResponse } from 'next/server'
import { appendAuditLog } from '@/lib/queries'
import { getDict, type Locale } from '@/lib/i18n'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface TriageRequest {
  symptoms: string
  age?: number
  sex?: string
  locale?: 'fr' | 'en'
}

interface TriageResponse {
  urgencyLevel: 'emergency' | 'urgent' | 'scheduled' | 'routine'
  recommendedAction: string
  recommendedSpecialty: string
  suggestedTimeframe: string
  redFlags: string[]
  recommendation: string
  disclaimer: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TriageRequest
    const { symptoms, age, sex, locale = 'fr' } = body

    if (!symptoms?.trim()) {
      return NextResponse.json({ error: 'Symptoms required' }, { status: 400 })
    }

    const t = getDict(locale as Locale)
    const systemPrompt = t.ai.prompts.triageSystem

    const agePart = age ? `${age} ${t.ai.labels.yearsOld}` : t.ai.labels.ageUnknown
    const sexPart = sex || t.ai.labels.sexUnspecified
    const contextStr = `${agePart}, ${sexPart}`
    const userPrompt = t.ai.prompts.triageUser
      .replace('{symptoms}', symptoms)
      .replace('{context}', contextStr)

    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    })

    const raw = completion.choices[0]?.message?.content || '{}'

    let parsed: TriageResponse
    try {
      const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      parsed = {
        urgencyLevel: 'scheduled',
        recommendedAction: t.triage.bookAppointment,
        recommendedSpecialty: 'Médecine générale',
        suggestedTimeframe: 'Sous 1 semaine',
        redFlags: [],
        recommendation: raw,
        disclaimer: t.triage.disclaimer,
      }
    }

    await appendAuditLog({
      action: 'create',
      entity: 'consultation',
      payload: { action: 'ai_triage', symptoms, urgency: parsed.urgencyLevel },
    })

    return NextResponse.json(parsed)
  } catch (e) {
    console.error('Triage error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
