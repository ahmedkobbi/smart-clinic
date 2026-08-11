import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Returns a print-optimized HTML page for an invoice
// User can print to PDF via browser (Cmd+P). This is the most reliable
// approach in a serverless environment without heavy PDF dependencies.

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: { patient: true, items: true, tenant: true },
  })

  if (!invoice) {
    return new Response('Not found', { status: 404 })
  }

  const tenant = invoice.tenant
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Facture ${invoice.number}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; padding: 40px; background: white; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #0ea5e9; }
  .tenant h1 { color: #0ea5e9; font-size: 24px; margin-bottom: 4px; }
  .tenant p { font-size: 12px; color: #64748b; line-height: 1.5; }
  .invoice-meta { text-align: right; }
  .invoice-meta h2 { font-size: 18px; color: #1a1a2e; }
  .invoice-meta .number { font-family: 'Courier New', monospace; font-size: 14px; color: #0ea5e9; font-weight: bold; }
  .invoice-meta .date { font-size: 11px; color: #64748b; margin-top: 4px; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .party h3 { font-size: 10px; text-transform: uppercase; color: #64748b; margin-bottom: 6px; letter-spacing: 0.5px; }
  .party p { font-size: 12px; line-height: 1.5; }
  .party .name { font-weight: 600; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  thead th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
  tbody td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
  .code { font-family: 'Courier New', monospace; color: #0ea5e9; font-weight: 600; }
  .text-right { text-align: right; }
  .totals { margin-left: auto; width: 300px; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; }
  .totals .row.total { border-top: 2px solid #0ea5e9; margin-top: 8px; padding-top: 12px; font-weight: bold; font-size: 14px; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
  .status-paid { background: #dcfce7; color: #16a34a; }
  .status-pending { background: #fef3c7; color: #d97706; }
  .status-overdue { background: #fee2e2; color: #dc2626; }
  .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; line-height: 1.5; }
  .compliance { margin-top: 12px; font-size: 9px; color: #64748b; text-align: center; }
  @media print {
    body { padding: 20px; }
    .no-print { display: none; }
  }
  .print-btn { position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #0ea5e9; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; }
  .print-btn:hover { background: #0284c7; }
</style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Imprimer / PDF</button>

  <div class="header">
    <div class="tenant">
      <h1>${tenant.displayName}</h1>
      <p>${tenant.addressLine || ''}<br>${tenant.postalCode || ''} ${tenant.city || ''}<br>Tel: ${tenant.phone || ''} · ${tenant.email || ''}<br>SIRET: ${tenant.siret || ''} · ADELI: ${tenant.adeli || ''}</p>
    </div>
    <div class="invoice-meta">
      <h2>FACTURE</h2>
      <div class="number">${invoice.number}</div>
      <div class="date">Émise le ${new Date(invoice.issueDate).toLocaleDateString('fr-FR')}<br>Échéance: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-FR') : '—'}</div>
      <div style="margin-top: 8px;"><span class="status-badge status-${invoice.status}">${invoice.status}</span></div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Patiente / Patient</h3>
      <p class="name">${invoice.patient.firstName} ${invoice.patient.lastName}</p>
      <p>${invoice.patient.addressLine || ''}<br>${invoice.patient.postalCode || ''} ${invoice.patient.city || ''}<br>${invoice.patient.mutuelle || ''}</p>
    </div>
    <div class="party" style="text-align: right;">
      <h3>Assurance</h3>
      <p>${invoice.tiersPayant ? 'Tiers payant (CPAM)' : 'Non tiers payant'}<br>${invoice.patient.insuranceNumber || ''}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Code</th>
        <th>Désignation</th>
        <th class="text-right">Qté</th>
        <th class="text-right">Prix unitaire</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map(item => `
        <tr>
          <td class="code">${item.code || '—'}</td>
          <td>${item.description}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">${item.unitPrice.toFixed(2)} €</td>
          <td class="text-right">${item.total.toFixed(2)} €</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Sous-total</span><span>${invoice.subtotal.toFixed(2)} €</span></div>
    ${invoice.tiersPayant ? `
      <div class="row"><span>Assurance (CPAM)</span><span style="color: #16a34a;">- ${invoice.insuranceCovered.toFixed(2)} €</span></div>
      <div class="row"><span>Part patient</span><span>${invoice.patientShare.toFixed(2)} €</span></div>
    ` : ''}
    <div class="row total"><span>TOTAL</span><span>${invoice.total.toFixed(2)} €</span></div>
    ${invoice.paidAmount > 0 ? `<div class="row"><span>Payé</span><span style="color: #16a34a;">${invoice.paidAmount.toFixed(2)} €</span></div>` : ''}
    ${invoice.total - invoice.paidAmount > 0.01 ? `<div class="row"><span>Reste à payer</span><span style="color: #dc2626;">${(invoice.total - invoice.paidAmount).toFixed(2)} €</span></div>` : ''}
  </div>

  <div class="footer">
    ${tenant.legalName} · ${tenant.siret || ''}<br>
    ${tenant.addressLine}, ${tenant.postalCode} ${tenant.city}
  </div>
  <div class="compliance">
    Document généré le ${new Date().toLocaleString('fr-FR')} · Smart Clinic — Conforme RGPD/HDS<br>
    Facture soumise à TVA: non applicable (profession de santé)
  </div>

  <script>
    // Auto-print after load
    setTimeout(() => { if (!window.location.search.includes('autoprint=false')) window.print(); }, 500);
  </script>
</body>
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
