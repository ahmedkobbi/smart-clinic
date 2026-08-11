import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const patient = await db.patient.findUnique({
    where: { id },
    include: {
      allergies: true,
      vitals: { orderBy: { recordedAt: 'desc' }, take: 5 },
      consultations: { include: { practitioner: true }, orderBy: { startAt: 'desc' }, take: 5 },
      prescriptions: { include: { practitioner: true }, orderBy: { createdAt: 'desc' }, take: 5 },
      invoices: { orderBy: { issueDate: 'desc' }, take: 5 },
      tenant: true,
    },
  })

  if (!patient) return new Response('Not found', { status: 404 })

  const tenant = patient.tenant
  const age = patient.birthDate ? Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${patient.firstName} ${patient.lastName} — Synthèse</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; padding: 40px; background: white; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #0ea5e9; }
  .tenant h1 { color: #0ea5e9; font-size: 20px; }
  .tenant p { font-size: 10px; color: #64748b; }
  .doc-title { text-align: right; }
  .doc-title h2 { font-size: 16px; }
  .doc-title p { font-size: 10px; color: #64748b; }
  .patient-card { background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .patient-info h3 { font-size: 14px; margin-bottom: 8px; }
  .patient-info p { font-size: 11px; color: #475569; line-height: 1.6; }
  .section { margin-bottom: 24px; }
  .section h3 { font-size: 12px; text-transform: uppercase; color: #0ea5e9; letter-spacing: 0.5px; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
  .allergy-list { display: flex; flex-wrap: wrap; gap: 6px; }
  .allergy-item { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 500; }
  .allergy-severe { background: #fee2e2; color: #dc2626; }
  .allergy-moderate { background: #fef3c7; color: #d97706; }
  .allergy-mild { background: #dbeafe; color: #2563eb; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  td { padding: 6px 8px; font-size: 11px; border-bottom: 1px solid #f1f5f9; }
  td.label { color: #64748b; width: 30%; }
  .vital-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .vital-card { background: #f8fafc; padding: 10px; border-radius: 6px; }
  .vital-card .type { font-size: 9px; text-transform: uppercase; color: #64748b; }
  .vital-card .value { font-size: 14px; font-weight: 600; font-family: 'Courier New', monospace; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; text-align: center; }
  .confidential { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 8px; border-radius: 6px; font-size: 10px; text-align: center; margin-bottom: 20px; font-weight: 500; }
  .print-btn { position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #0ea5e9; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Imprimer / PDF</button>

  <div class="confidential">⚠️ DOCUMENT CONFIDENTIEL — Données médicales à caractère personnel — RGPD/HDS</div>

  <div class="header">
    <div class="tenant">
      <h1>${tenant.displayName}</h1>
      <p>${tenant.addressLine}, ${tenant.postalCode} ${tenant.city}<br>Tel: ${tenant.phone}</p>
    </div>
    <div class="doc-title">
      <h2>Synthèse Patient</h2>
      <p>Généré le ${new Date().toLocaleString('fr-FR')}</p>
    </div>
  </div>

  <div class="patient-card">
    <div class="patient-info">
      <h3>${patient.firstName} ${patient.lastName}</h3>
      <p>${age ? age + ' ans' : ''} ${patient.sex ? '· ' + patient.sex : ''}<br>
      ${patient.birthDate ? 'Né(e) le ' + new Date(patient.birthDate).toLocaleDateString('fr-FR') : ''}<br>
      ${patient.bloodType ? 'Groupe: ' + patient.bloodType : ''}</p>
    </div>
    <div class="patient-info">
      <h3>Contact</h3>
      <p>${patient.phone || '—'}<br>${patient.email || '—'}<br>${patient.addressLine || ''}<br>${patient.postalCode || ''} ${patient.city || ''}</p>
    </div>
    <div class="patient-info">
      <h3>Assurance</h3>
      <p>${patient.mutuelle || '—'}<br>N° Sécurité sociale: ${patient.ssn ? patient.ssn.slice(0, 13) + ' ' + patient.ssn.slice(13) : '—'}<br>${patient.insuranceNumber || ''}</p>
    </div>
  </div>

  ${patient.allergies.length > 0 ? `
    <div class="section">
      <h3>⚠️ Allergies</h3>
      <div class="allergy-list">
        ${patient.allergies.map(a => `<span class="allergy-item allergy-${a.severity}">${a.substance} (${a.severity})</span>`).join('')}
      </div>
    </div>
  ` : ''}

  ${patient.vitals.length > 0 ? `
    <div class="section">
      <h3>Constantes vitales (dernières)</h3>
      <div class="vital-grid">
        ${patient.vitals.slice(0, 6).map(v => `
          <div class="vital-card">
            <div class="type">${vitalLabel(v.type)}</div>
            <div class="value">${v.value} ${v.unit}</div>
            <div style="font-size: 9px; color: #94a3b8;">${new Date(v.recordedAt).toLocaleDateString('fr-FR')}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : ''}

  ${patient.consultations.length > 0 ? `
    <div class="section">
      <h3>Dernières consultations</h3>
      ${patient.consultations.map(c => `
        <table>
          <tr><td class="label">Date</td><td>${new Date(c.startAt).toLocaleDateString('fr-FR')} — ${c.practitioner.name}</td></tr>
          ${c.chiefComplaint ? `<tr><td class="label">Motif</td><td>${c.chiefComplaint}</td></tr>` : ''}
          ${c.assessment ? `<tr><td class="label">Évaluation</td><td>${c.assessment}</td></tr>` : ''}
        </table>
      `).join('')}
    </div>
  ` : ''}

  ${patient.prescriptions.length > 0 ? `
    <div class="section">
      <h3>Ordonnances actives</h3>
      ${patient.prescriptions.map(p => `
        <table>
          <tr><td class="label">Médicament</td><td>${p.medication}</td></tr>
          <tr><td class="label">Posologie</td><td>${p.dosage} · ${p.frequency} · ${p.duration}</td></tr>
          <tr><td class="label">Prescripteur</td><td>${p.practitioner.name}</td></tr>
        </table>
      `).join('')}
    </div>
  ` : ''}

  <div class="footer">
    Document généré par Smart Clinic · ${tenant.legalName}<br>
    Confidentiel — RGPD · HDS · ISO 27001 (cible)
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

function vitalLabel(type: string): string {
  const map: Record<string, string> = {
    blood_pressure: 'Tension',
    heart_rate: 'Fréq. cardiaque',
    temperature: 'Température',
    spo2: 'Saturation',
    weight: 'Poids',
    height: 'Taille',
  }
  return map[type] || type
}
