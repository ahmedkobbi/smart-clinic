import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/queries'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const tenantId = await getTenantId()

    // Calculate paper savings from digitization
    // Assumptions (conservative, based on French cabinet médical averages):
    // - Each consultation generates ~4 sheets of paper (note, prescription, invoice, lab req)
    // - Each prescription sent electronically saves 1 sheet
    // - Each invoice emailed saves 1 sheet + 1 envelope
    // - 1 ream (500 sheets) = 2.3 kg CO2 (production + transport + disposal)

    const [consultations, prescriptions, invoices] = await Promise.all([
      db.consultation.count({ where: { tenantId } }),
      db.prescription.count({ where: { tenantId } }),
      db.invoice.count({ where: { tenantId } }),
    ])

    const SHEETS_PER_CONSULTATION = 4
    const sheetsSavedConsultations = consultations * SHEETS_PER_CONSULTATION
    const sheetsSavedPrescriptions = prescriptions * 1
    const sheetsSavedInvoices = invoices * 2 // sheet + envelope

    const totalSheetsSaved = sheetsSavedConsultations + sheetsSavedPrescriptions + sheetsSavedInvoices
    const totalReamsSaved = totalSheetsSaved / 500
    const totalCo2KgSaved = totalReamsSaved * 2.3 // kg CO2

    // Trees saved: 1 tree ≈ 8333 sheets (per ADEME)
    const treesSaved = totalSheetsSaved / 8333

    // Water saved: 10L per sheet (production)
    const waterLitersSaved = totalSheetsSaved * 10

    // Monthly trend (last 6 months)
    const now = new Date()
    const monthlyData = []
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const [monthConsults, monthPresc, monthInv] = await Promise.all([
        db.consultation.count({ where: { tenantId, startAt: { gte: start, lt: end } } }),
        db.prescription.count({ where: { tenantId, createdAt: { gte: start, lt: end } } }),
        db.invoice.count({ where: { tenantId, issueDate: { gte: start, lt: end } } }),
      ])
      const sheets = monthConsults * SHEETS_PER_CONSULTATION + monthPresc + monthInv * 2
      monthlyData.push({
        month: start.toLocaleDateString('fr-FR', { month: 'short' }),
        sheets,
        co2: (sheets / 500) * 2.3,
      })
    }

    return NextResponse.json({
      totalSheetsSaved,
      totalReamsSaved: Math.round(totalReamsSaved * 10) / 10,
      totalCo2KgSaved: Math.round(totalCo2KgSaved * 10) / 10,
      treesSaved: Math.round(treesSaved * 100) / 100,
      waterLitersSaved,
      breakdown: {
        consultations: sheetsSavedConsultations,
        prescriptions: sheetsSavedPrescriptions,
        invoices: sheetsSavedInvoices,
      },
      monthlyData,
      equivalences: {
        kmDriven: Math.round(totalCo2KgSaved / 0.12), // avg car emits 120g CO2/km
        phoneCharges: Math.round(totalCo2KgSaved / 0.00822), // charging a phone ≈ 8.22g CO2
        treesPlantedEquivalent: Math.round(treesSaved * 10) / 10,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
