import { NextRequest, NextResponse } from 'next/server'
import { appendAuditLog } from '@/lib/queries'
import { getDict, type Locale } from '@/lib/i18n'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface ScribeRequest {
  chiefComplaint: string
  patientContext?: {
    age?: number
    sex?: string
    allergies?: string[]
    history?: string
  }
  locale?: 'fr' | 'en'
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ScribeRequest
    const { chiefComplaint, patientContext, locale = 'fr' } = body

    if (!chiefComplaint?.trim()) {
      return NextResponse.json({ error: 'Chief complaint required' }, { status: 400 })
    }

    // Build the prompt — strictly assistive, non-diagnostic, human-confirmed
    const t = getDict(locale as Locale)
    const systemPrompt = t.ai.prompts.scribeSystem

    const ageLine = patientContext?.age ? `- ${t.ai.labels.age}: ${patientContext.age} ${t.ai.labels.years}` : ''
    const sexLine = patientContext?.sex ? `- ${t.ai.labels.sex}: ${patientContext.sex}` : ''
    const allergiesLine = patientContext?.allergies?.length
      ? `- ${t.ai.labels.allergies}: ${patientContext.allergies.join(', ')}`
      : `- ${t.ai.labels.allergies}: ${t.ai.labels.noneKnown}`
    const historyLine = patientContext?.history ? `- ${t.ai.labels.history}: ${patientContext.history}` : ''
    const patientContextStr = [ageLine, sexLine, allergiesLine, historyLine].join('\n')
    const userPrompt = t.ai.prompts.scribeUser
      .replace('{chiefComplaint}', chiefComplaint)
      .replace('{patientContext}', patientContextStr)

    // Use z-ai-web-dev-sdk (server-side only)
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

    // Parse JSON — handle case where AI wraps in markdown
    let parsed: any
    try {
      const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      parsed = {
        history: raw,
        examination: '',
        assessment: '',
        plan: '',
        differentialDiagnoses: [],
        suggestedProcedures: [],
        confidence: 0.5,
        disclaimer: 'AI draft — validation required',
      }
    }

    await appendAuditLog({
      action: 'create',
      entity: 'consultation',
      payload: { action: 'ai_scribe_draft', chiefComplaint, confidence: parsed.confidence },
    })

    return NextResponse.json({
      ...parsed,
      aiDrafted: true,
      _meta: {
        model: 'z-ai',
        generatedAt: new Date().toISOString(),
        nonDiagnostic: true,
      },
    })
  } catch (e) {
    console.error('AI scribe error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
