import { NextRequest, NextResponse } from 'next/server'
import { appendAuditLog } from '@/lib/queries'

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
    const systemPrompt = locale === 'fr'
      ? `Tu es un assistant de transcription médicale (scribe ambiant IA) pour un cabinet médical français.
Tu aides le praticien en rédigeant un BROUILLON de note de consultation structurée selon le format SOAP.

RÈGLES IMPÉRATIVES:
- Tu NE POSES AUCUN DIAGNOSTIC. Tu proposes des hypothèses différentielles uniquement.
- Tu NE PRESCRIS RIEN. Tu suggères des options thérapeutiques pour que le praticien choisisse.
- Ton output est un BROUILLON qui DOIT être validé et signé par le praticien.
- Utilise la terminologie médicale française correcte.
- Sois concis, factuel, professionnel.
- Si les informations sont insuffisantes, indique-le clairement.

Réponds UNIQUEMENT en JSON valide avec cette structure:
{
  "history": "Histoire de la maladie (HPI) — narration structurée",
  "examination": "Examen clinique suggéré — éléments à vérifier",
  "assessment": "Évaluation — hypothèses diagnostiques (précise: HYPOTHÈSE, pas diagnostic)",
  "plan": "Plan thérapeutique — investigations et options de traitement à discuter",
  "differentialDiagnoses": ["ICD-10 code", "..."],
  "suggestedProcedures": ["CCAM code", "..."],
  "confidence": 0.0-1.0,
  "disclaimer": "Brouillon IA — validation médicale obligatoire"
}`
      : `You are a medical ambient scribe AI assistant for a clinical practice.
You help the practitioner by drafting a STRUCTURED consultation note in SOAP format.

STRICT RULES:
- You DO NOT DIAGNOSE. You propose differential hypotheses only.
- You DO NOT PRESCRIBE. You suggest therapeutic options for the practitioner to choose.
- Your output is a DRAFT that MUST be reviewed and signed by the practitioner.
- Use correct medical terminology.
- Be concise, factual, professional.
- If information is insufficient, say so explicitly.

Respond ONLY in valid JSON with this structure:
{
  "history": "History of present illness — structured narrative",
  "examination": "Suggested clinical examination — elements to verify",
  "assessment": "Assessment — diagnostic hypotheses (state: HYPOTHESIS, not diagnosis)",
  "plan": "Therapeutic plan — investigations and treatment options to discuss",
  "differentialDiagnoses": ["ICD-10 code", "..."],
  "suggestedProcedures": ["CCAM code", "..."],
  "confidence": 0.0-1.0,
  "disclaimer": "AI draft — medical validation required"
}`

    const userPrompt = locale === 'fr'
      ? `Motif de consultation: ${chiefComplaint}

Contexte patient:
${patientContext?.age ? `- Âge: ${patientContext.age} ans` : ''}
${patientContext?.sex ? `- Sexe: ${patientContext.sex}` : ''}
${patientContext?.allergies?.length ? `- Allergies: ${patientContext.allergies.join(', ')}` : '- Allergies: aucune connue'}
${patientContext?.history ? `- Antécédents: ${patientContext.history}` : ''}

Rédige un brouillon de note de consultation SOAP.`
      : `Chief complaint: ${chiefComplaint}

Patient context:
${patientContext?.age ? `- Age: ${patientContext.age} years` : ''}
${patientContext?.sex ? `- Sex: ${patientContext.sex}` : ''}
${patientContext?.allergies?.length ? `- Allergies: ${patientContext.allergies.join(', ')}` : '- Allergies: none known'}
${patientContext?.history ? `- History: ${patientContext.history}` : ''}

Draft a SOAP consultation note.`

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
