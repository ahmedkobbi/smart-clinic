import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const prescription = await db.prescription.findUnique({
    where: { id },
    include: { patient: true, practitioner: true, tenant: true },
  })

  if (!prescription) return new Response('Not found', { status: 404 })

  const tenant = prescription.tenant
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Ordonnance — ${prescription.patient.firstName} ${prescription.patient.lastName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; padding: 50px; background: white; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px double #0ea5e9; }
  .doctor h1 { color: #0ea5e9; font-size: 22px; }
  .doctor h2 { font-size: 16px; margin-top: 4px; }
  .doctor p { font-size: 11px; color: #64748b; line-height: 1.5; margin-top: 4px; }
  .doctor .ids { font-family: 'Courier New', monospace; font-size: 10px; color: #475569; }
  .date { text-align: right; }
  .date p { font-size: 11px; color: #64748b; }
  .date .big { font-size: 14px; font-weight: 600; color: #1a1a2e; }
  .patient-box { background: #f8fafc; border-radius: 8px; padding: 12px 16px; margin-bottom: 30px; border-left: 4px solid #0ea5e9; }
  .patient-box .label { font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
  .patient-box .name { font-size: 16px; font-weight: 600; margin: 2px 0; }
  .patient-box .details { font-size: 11px; color: #475569; }
  .section-title { font-size: 12px; text-transform: uppercase; color: #0ea5e9; letter-spacing: 1px; margin-bottom: 16px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
  .medication { margin-bottom: 20px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; }
  .medication .name { font-size: 14px; font-weight: 600; color: #1a1a2e; }
  .medication .dosage { font-size: 13px; margin-top: 4px; color: #475569; }
  .medication .instructions { font-size: 11px; color: #64748b; margin-top: 6px; font-style: italic; }
  .signature { margin-top: 60px; display: flex; justify-content: space-between; }
  .signature-box { text-align: center; }
  .signature-line { border-top: 1px solid #1a1a2e; width: 200px; margin-top: 60px; padding-top: 6px; font-size: 10px; color: #64748b; }
  .security { margin-top: 30px; padding: 10px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; font-size: 9px; color: #991b1b; text-align: center; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; text-align: center; }
  .print-btn { position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #0ea5e9; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Imprimer / PDF</button>

  <div class="header">
    <div class="doctor">
      <h1>${prescription.practitioner.name}</h1>
      <h2>${prescription.practitioner.specialty}</h2>
      <p>${tenant.displayName}<br>${tenant.addressLine}, ${tenant.postalCode} ${tenant.city}<br>Tel: ${tenant.phone}</p>
      <div class="ids">
        RPPS: ${prescription.practitioner.rpps || '—'}<br>
        ADELI: ${prescription.practitioner.adeli || '—'}<br>
        SIRET: ${tenant.siret || '—'}
      </div>
    </div>
    <div class="date">
      <p>Le</p>
      <p class="big">${new Date(prescription.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
    </div>
  </div>

  <div class="patient-box">
    <p class="label">Patient</p>
    <p class="name">${prescription.patient.firstName} ${prescription.patient.lastName}</p>
    <p class="details">
      ${prescription.patient.birthDate ? 'Né(e) le ' + new Date(prescription.patient.birthDate).toLocaleDateString('fr-FR') : ''}
      ${prescription.patient.birthDate ? ' · ' : ''}
      ${prescription.patient.city || ''}
    </p>
  </div>

  <div class="section-title">Prescription</div>

  <div class="medication">
    <p class="name">${prescription.medication}</p>
    <p class="dosage">
      <strong>${prescription.dosage || ''}</strong> — ${prescription.frequency || ''}
      ${prescription.duration ? ' · ' + prescription.duration : ''}
      ${prescription.quantity ? ' · Qté: ' + prescription.quantity : ''}
    </p>
    ${prescription.instructions ? `<p class="instructions">${prescription.instructions}</p>` : ''}
  </div>

  <div class="security">
    ⚠️ ORDONNANCE SÉCURISÉE — Document généré électroniquement via Smart Clinic<br>
    Vérification d'authenticité: scanner le QR code ou contacter ${tenant.phone}<br>
    Prescription à usage unique — ne pas réutiliser sans avis médical
  </div>

  <div class="signature">
    <div class="signature-box">
      <div class="signature-line">${prescription.practitioner.name}<br>${prescription.practitioner.specialty}</div>
    </div>
  </div>

  <div class="footer">
    ${tenant.legalName} · ${tenant.siret}<br>
    Document généré le ${new Date().toLocaleString('fr-FR')} · Smart Clinic — Conforme RGPD/HDS<br>
    Ordonnance électronique — Article L.5112-1 du Code de la santé publique
  </div>

  <script>
    setTimeout(() => { if (!window.location.search.includes('autoprint=false')) window.print(); }, 500);
  </script>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
