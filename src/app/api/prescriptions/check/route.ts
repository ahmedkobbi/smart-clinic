import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Drug-allergy interaction checker
// Returns warnings when a prescription matches a patient's known allergies
// Per master prompt §11 e-Prescriptions: drug-interaction checks

interface AllergyCheckResult {
  hasWarnings: boolean
  warnings: Array<{
    type: 'allergy_match' | 'interaction'
    severity: 'severe' | 'moderate' | 'mild'
    substance: string
    matchedAllergy: string
    message: string
  }>
}

// Drug-to-allergen mapping (simplified clinical knowledge base)
// Maps medication names to allergen families they belong to
const DRUG_ALLERGEN_MAP: Record<string, string[]> = {
  // Penicillins
  'amoxicilline': ['Pénicilline', 'Amoxicilline'],
  'amoxicillin': ['Pénicilline', 'Amoxicilline'],
  'augmentin': ['Pénicilline', 'Amoxicilline'],
  'clamoxyl': ['Pénicilline', 'Amoxicilline'],
  'pénicilline': ['Pénicilline'],
  'penicillin': ['Pénicilline'],

  // Cephalosporins (cross-reactivity with penicillin)
  'céphalosporine': ['Pénicilline', 'Céphalosporine'],

  // Sulfonamides
  'sulfamide': ['Sulfamides'],
  'sulfaméthoxazole': ['Sulfamides'],
  'bactrim': ['Sulfamides'],

  // Aspirin/NSAIDs
  'aspirine': ['Aspirine', 'AAS'],
  'aspirin': ['Aspirine'],
  'kardegic': ['Aspirine'],
  'ibuprofène': ['Aspirine', 'AINS'],
  'ibuprofen': ['Aspirine', 'AINS'],
  'voltarène': ['AINS'],
  'diclofenac': ['AINS'],

  // Iodinated contrast
  'iode': ['Iode'],
  'iodine': ['Iode'],

  // Codeine/opioids
  'codéine': ['Codéine'],
  'codeine': ['Codéine'],
  'tramadol': ['Codéine', 'Opiacés'],

  // Latex (in some packaging)
  'latex': ['Latex'],
}

export async function POST(req: NextRequest) {
  try {
    const { patientId, medication } = await req.json() as { patientId: string; medication: string }

    if (!patientId || !medication) {
      return NextResponse.json({ error: 'patientId and medication required' }, { status: 400 })
    }

    // Get patient's allergies
    const allergies = await db.allergy.findMany({ where: { patientId } })
    const allergySubstances = allergies.map(a => a.substance.toLowerCase())

    const result: AllergyCheckResult = { hasWarnings: false, warnings: [] }

    // Check medication against drug-allergen map
    const medLower = medication.toLowerCase()
    for (const [drugKey, allergens] of Object.entries(DRUG_ALLERGEN_MAP)) {
      if (medLower.includes(drugKey)) {
        for (const allergen of allergens) {
          const matchedAllergy = allergies.find(a => a.substance.toLowerCase() === allergen.toLowerCase())
          if (matchedAllergy) {
            result.hasWarnings = true
            result.warnings.push({
              type: 'allergy_match',
              severity: matchedAllergy.severity as 'severe' | 'moderate' | 'mild',
              substance: allergen,
              matchedAllergy: matchedAllergy.substance,
              message: `⚠️ ALERTE: ${medication} contient/appartient à ${allergen} — patient allergique (${matchedAllergy.severity})`,
            })
          }
        }
      }
    }

    // Direct match check (medication name = allergy substance)
    if (allergySubstances.some(s => medLower.includes(s))) {
      const matched = allergies.find(a => medLower.includes(a.substance.toLowerCase()))
      if (matched && !result.warnings.some(w => w.substance === matched.substance)) {
        result.hasWarnings = true
        result.warnings.push({
          type: 'allergy_match',
          severity: matched.severity as 'severe' | 'moderate' | 'mild',
          substance: matched.substance,
          matchedAllergy: matched.substance,
          message: `⚠️ ALERTE: ${medication} — patient allergique à ${matched.substance} (${matched.severity})`,
        })
      }
    }

    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
