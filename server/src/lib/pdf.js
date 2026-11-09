// Reçus PDF (équivalent de generer_recu.php client et admin/generer_recu.php) avec pdfkit
import fs from 'node:fs';
import PDFDocument from 'pdfkit';
import { config } from '../config.js';
import { MODE_LABELS, STATUT_LABELS } from './helpers.js';

const fmt = (n) => Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const COL = { statut: { en_attente: '#fbbf24', en_preparation: '#3b82f6', confirmee: '#10b981', expediee: '#3b82f6', livree: '#22c55e', annulee: '#ef4444' } };
const pad = (id) => String(id).padStart(6, '0');
const dateFr = (s) => { const d = new Date(String(s).replace(' ', 'T')); const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; };

/**
 * @param res flux de sortie (Express response)
 * @param o { commande, details, role:'client'|'super_admin'|'vendeur', adminNom?, adminId? }
 *  details: lignes avec nom, marque, quantite, prix_unitaire, admin_id, vendeur_nom/email/tel/boutique
 */
export function genererRecu(res, { commande, details, role, adminNom = '', adminId = null }) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true, info: { Title: `Reçu commande #${pad(commande.id)}` } });
  doc.pipe(res);
  const L = 40, W = 515;

  // ---- En-tête
  doc.rect(0, 0, 595, 110).fill('#f9fafb');
  if (fs.existsSync(config.logoPath)) { try { doc.image(config.logoPath, L, 22, { width: 62 }); } catch { /* logo illisible */ } }
  doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(17).text('AOS MULTI-SERVICE International', 115, 26);
  doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text('Burkina Faso', 115, 50)
    .text('Email: contact@aos-multiservice.bf', 115, 63).text('Tél: +226 64 55 38 70', 115, 75);
  if (role !== 'client') {
    const sup = role === 'super_admin';
    doc.roundedRect(440, 24, 115, 16, 3).fill(sup ? '#dc2626' : '#fbbf24');
    doc.fillColor(sup ? '#ffffff' : '#92400e').font('Helvetica-Bold').fontSize(8).text(sup ? 'SUPER ADMINISTRATEUR' : 'VENDEUR', 440, 29, { width: 115, align: 'center' });
    doc.fillColor('#4b5563').font('Helvetica').fontSize(8).text(adminNom, 440, 45, { width: 115, align: 'center' });
  }
  doc.moveTo(L, 112).lineTo(L + W, 112).strokeColor('#d1d5db').lineWidth(0.5).stroke();

  doc.y = 130;
  doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(20).text('REÇU DE COMMANDE', L, 130, { width: W, align: 'center' });
  doc.fillColor('#6b7280').font('Helvetica').fontSize(10).text(`Commande #${pad(commande.id)}`, L, 156, { width: W, align: 'center' });

  const box = (label, value, x, y, w) => {
    doc.rect(x, y, w, 40).fillAndStroke('#f9fafb', '#e5e7eb');
    doc.fillColor('#6b7280').font('Helvetica').fontSize(7).text(label, x + 6, y + 6, { width: w - 12 });
    doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(10).text(String(value ?? ''), x + 6, y + 18, { width: w - 12, height: 20, ellipsis: true });
  };
  let y = 185;
  box('CLIENT', commande.client_nom, L, y, 250); box('DATE', dateFr(commande.date_commande), L + 265, y, 250); y += 48;
  box('TÉLÉPHONE', commande.telephone || 'N/A', L, y, 250); box('EMAIL', commande.client_email, L + 265, y, 250); y += 48;
  box('ADRESSE DE LIVRAISON', `${commande.adresse_livraison || ''}, ${commande.ville || ''} ${commande.code_postal || ''}`, L, y, W); y += 52;

  doc.fillColor('#4b5563').font('Helvetica-Bold').fontSize(10).text('STATUT:', L, y + 3);
  const st = STATUT_LABELS[commande.statut] || commande.statut; const sw = doc.widthOfString(st) + 20;
  doc.roundedRect(L + 60, y, sw, 16, 4).fill(COL.statut[commande.statut] || '#6b7280');
  doc.fillColor('#ffffff').fontSize(9).text(st, L + 60, y + 4, { width: sw, align: 'center' });
  y += 26;
  if (commande.mode_paiement) {
    doc.fillColor('#4b5563').font('Helvetica-Bold').fontSize(10).text('PAIEMENT:', L, y);
    doc.fillColor('#1f2937').font('Helvetica').fontSize(9).text(`${MODE_LABELS[commande.mode_paiement] || commande.mode_paiement}${commande.numero_paiement ? ' - +226 ' + commande.numero_paiement : ''}`, L + 60, y + 1);
    y += 22;
  }
  doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(12).text('DÉTAILS DE LA COMMANDE', L, y); y += 22;

  // ---- Détails par vendeur
  const groupes = new Map();
  for (const d of details) {
    const k = d.admin_id ?? 0;
    if (!groupes.has(k)) groupes.set(k, { nom: d.vendeur_nom || 'AOS Multi-Service', boutique: d.vendeur_boutique, tel: d.vendeur_tel, email: d.vendeur_email, lignes: [] });
    groupes.get(k).lignes.push(d);
  }
  const need = (h) => { if (y + h > 760) { doc.addPage(); y = 50; } };
  const cols = [{ w: 255, a: 'left' }, { w: 40, a: 'center' }, { w: 100, a: 'right' }, { w: 120, a: 'right' }];
  const row = (cells, bold, fill) => {
    need(20); let x = L;
    if (fill) doc.rect(L, y, W, 18).fill(fill);
    doc.fillColor('#1f2937').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5);
    cells.forEach((c, i) => { doc.text(String(c), x + 4, y + 5, { width: cols[i].w - 8, align: cols[i].a, height: 12, ellipsis: true }); x += cols[i].w; });
    doc.rect(L, y, W, 18).strokeColor('#e5e7eb').lineWidth(0.5).stroke(); y += 18;
  };
  let sousTotal = 0;
  for (const [k, g] of groupes) {
    const mine = role === 'vendeur' && k === adminId;
    need(70);
    doc.roundedRect(L, y, W, 36, 4).fillAndStroke(mine ? '#ecfdf5' : '#fefce8', mine ? '#10b981' : '#fbbf24');
    doc.fillColor(mine ? '#10b981' : '#fbbf24').rect(L + 8, y + 8, 50, 12).fill();
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7).text('VENDEUR', L + 8, y + 11, { width: 50, align: 'center' });
    doc.fillColor('#1f2937').fontSize(9).text(g.nom, L + 68, y + 8);
    doc.fillColor('#6b7280').font('Helvetica').fontSize(7).text([g.boutique, g.tel && `Tel: ${g.tel}`, g.email].filter(Boolean).join('  |  '), L + 68, y + 21, { width: W - 80 });
    y += 44;
    row(['Produit', 'Qté', 'Prix Unit.', 'Total'], true, '#f9fafb');
    let tv = 0;
    for (const d of g.lignes) {
      const t = d.prix_unitaire * d.quantite; tv += t;
      row([`${d.nom}${d.marque ? ' - ' + d.marque : ''}`.slice(0, 55), d.quantite, `${fmt(d.prix_unitaire)} F`, `${fmt(t)} F`]);
    }
    sousTotal += tv; need(24);
    doc.rect(L, y, W, 18).fill(mine ? '#ecfdf5' : '#fefce8');
    doc.fillColor(mine ? '#10b981' : '#92400e').font('Helvetica-Bold').fontSize(9).text('Sous-total vendeur:', L, y + 5, { width: 395, align: 'right' }).text(`${fmt(tv)} FCFA`, L + 395, y + 5, { width: 120, align: 'right' });
    y += 30;
  }

  // ---- Totaux
  need(110);
  doc.moveTo(L, y).lineTo(L + W, y).strokeColor('#e5e7eb').stroke(); y += 12;
  if (role === 'vendeur') {
    doc.rect(L, y, W, 26).fill('#10b981');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11).text('VOTRE PART', L, y + 8, { width: 395, align: 'right' }).text(`${fmt(sousTotal)} FCFA`, L + 395, y + 8, { width: 120, align: 'right' });
    y += 40;
    doc.roundedRect(L, y, W, 52, 4).fillAndStroke('#ecfdf5', '#10b981');
    doc.fillColor('#059669').font('Helvetica-Bold').fontSize(8).text('IMPORTANT VENDEUR', L + 8, y + 7);
    doc.fillColor('#374151').font('Helvetica').fontSize(7.5).text('- Ce reçu affiche uniquement VOS produits de cette commande\n- Contactez le client pour organiser la livraison de vos articles\n- Le montant indiqué représente votre part à percevoir', L + 8, y + 19, { width: W - 16 });
  } else {
    const frais = Math.max(0, (Number(commande.total) || 0) - sousTotal);
    doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text('Sous-total articles:', L, y, { width: 395, align: 'right' });
    doc.fillColor('#1f2937').font('Helvetica-Bold').text(`${fmt(sousTotal)} FCFA`, L + 395, y, { width: 120, align: 'right' }); y += 16;
    doc.fillColor('#4b5563').font('Helvetica').text('Frais de livraison:', L, y, { width: 395, align: 'right' });
    doc.fillColor(frais ? '#1f2937' : '#10b981').font('Helvetica-Bold').text(frais ? `${fmt(frais)} FCFA` : 'GRATUIT', L + 395, y, { width: 120, align: 'right' }); y += 22;
    doc.rect(L, y, W, 26).fill('#4f46e5');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11).text('TOTAL', L, y + 8, { width: 395, align: 'right' }).text(`${fmt(commande.total)} FCFA`, L + 395, y + 8, { width: 120, align: 'right' });
  }

  // ---- Pied de page sur chaque page
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i); doc.page.margins.bottom = 0;
    doc.fillColor('#9ca3af').font('Helvetica').fontSize(7)
      .text('Document administratif confidentiel', L, 790, { width: W, align: 'center', lineBreak: false })
      .text(`AOS Multi-Service International - Ouagadougou, Burkina Faso  |  Page ${i + 1}/${range.count}`, L, 800, { width: W, align: 'center', lineBreak: false });
  }
  doc.end();
}
export const recuHeaders = (res, id) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="Recu_Commande_${pad(id)}.pdf"`);
};
