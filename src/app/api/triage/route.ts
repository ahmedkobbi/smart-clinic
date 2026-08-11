import { NextRequest, NextResponse } from 'next/server'
import { appendAuditLog } from '@/lib/queries'

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

    const systemPrompt = locale === 'fr'
      ? `Tu es un assistant de pré-triage médical NON DIAGNOSTIQUE pour un cabinet médical français.
Ton rôle: orienter le patient vers le bon type de rendez-vous, SANS POSER DE DIAGNOSTIC.

RÈGLES:
- Tu NE DIAGNOSTIQUES JAMAIS. Tu orientes uniquement.
- En cas de symptômes d'urgence (douleur thoracique intense, difficulté respiratoire, perte de conscience, hémorragie, AVC), réponds "emergency".
- Pour symptômes nécessitant une consultation sous 24-48h (fièvre élevée, douleur aiguë), réponds "urgent".
- Pour suivi ou symptômes modérés, réponds "scheduled".
- Pour routine/bilan, réponds "routine".

Réponds UNIQUEMENT en JSON valide:
{
  "urgencyLevel": "emergency|urgent|scheduled|routine",
  "recommendedAction": "Action recommandée (appeler 15, venir au cabinet, prendre RDV...)",
  "recommendedSpecialty": "Spécialité recommandée",
  "suggestedTimeframe": "Délai suggéré",
  "redFlags": ["Signes d'alerte à surveiller"],
  "recommendation": "Recommandation détaillée",
  "disclaimer": "Pré-triage IA non diagnostique. En cas de doute, appeler le 15 (SAMU)."
}`
      : `You are a NON-DIAGNOSTIC medical pre-triage assistant for a clinical practice.
Your role: route the patient to the right type of appointment, WITHOUT DIAGNOSING.

RULES:
- You NEVER DIAGNOSE. You only orient.
- For emergency symptoms (severe chest pain, breathing difficulty, loss of consciousness, hemorrhage, stroke), respond "emergency".
- For symptoms needing consultation within 24-48h (high fever, acute pain), respond "urgent".
- For follow-up or moderate symptoms, respond "scheduled".
- For routine/checkup, respond "routine".

Respond ONLY in valid JSON:
{
  "urgencyLevel": "emergency|urgent|scheduled|routine",
  "recommendedAction": "Recommended action (call 911, come to clinic, book appointment...)",
  "recommendedSpecialty": "Recommended specialty",
  "suggestedTimeframe": "Suggested timeframe",
  "redFlags": ["Warning signs to watch for"],
  "recommendation": "Detailed recommendation",
  "disclaimer": "Non-diagnostic AI pre-triage. In case of doubt, call emergency services."
}`

    const userPrompt = locale === 'fr'
      ? `Symptômes décrits par le patient: ${symptoms}

Contexte: ${age ? `${age} ans` : 'âge inconnu'}, ${sex || 'sexe non précisé'}

Effectue un pré-triage.`
      : `Symptoms described by patient: ${symptoms}

Context: ${age ? `${age} years old` : 'age unknown'}, ${sex || 'sex unspecified'}

Perform pre-triage.`

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
        recommendedAction: locale === 'fr' ? 'Prendre rendez-vous' : 'Book appointment',
        recommendedSpecialty: 'Médecine générale',
        suggestedTimeframe: 'Sous 1 semaine',
        redFlags: [],
        recommendation: raw,
        disclaimer: locale === 'fr' ? 'Pré-triage IA. En cas de doute, appeler le 15.' : 'AI pre-triage. In case of doubt, call emergency services.',
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
