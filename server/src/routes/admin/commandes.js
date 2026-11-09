import { Router } from 'express';
import { query, queryOne, scalar, execute, transaction } from '../../db.js';
import { asyncHandler, HttpError, toInt, str, STATUTS_COMMANDE, imageUrl } from '../../lib/helpers.js';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { genererRecu, recuHeaders } from '../../lib/pdf.js';

const router = Router();

async function chargerCommande(req, id) {
  const sql = `SELECT c.*, u.nom AS client_nom, u.email AS client_email, u.telephone AS client_tel, u.telephone
    FROM commandes c JOIN utilisateurs u ON c.utilisateur_id = u.id`;
  const c = req.isSuperAdmin
    ? await queryOne(`${sql} WHERE c.id = ?`, [id])
    : await queryOne(`${sql} WHERE c.id = ? AND EXISTS (SELECT 1 FROM commandes_admins ca WHERE ca.commande_id = c.id AND ca.admin_id = ?)`, [id, req.admin.id]);
  if (!c) throw new HttpError(404, 'Commande introuvable ou accès non autorisé.');
  return c;
}

router.get('/', asyncHandler(async (req, res) => {
  const search = str(req.query.search), statut = str(req.query.statut), dd = str(req.query.date_debut), df = str(req.query.date_fin);
  const where = [], params = [];
  let commandes, stats;
  if (req.isSuperAdmin) {
    if (search) { where.push('(u.nom LIKE ? OR u.email LIKE ? OR c.id = ?)'); params.push(`%${search}%`, `%${search}%`, toInt(search, -1)); }
    if (statut) { where.push('c.statut = ?'); params.push(statut); }
    if (dd) { where.push('date(c.date_commande) >= ?'); params.push(dd); }
    if (df) { where.push('date(c.date_commande) <= ?'); params.push(df); }
    commandes = await query(`SELECT c.*, u.nom AS client_nom, u.email AS client_email, l.nom AS livreur_nom FROM commandes c
      JOIN utilisateurs u ON c.utilisateur_id = u.id LEFT JOIN livreurs l ON c.livreur_id = l.id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY c.date_commande DESC`, params);
    stats = {
      total_commandes: await scalar('SELECT COUNT(*) FROM commandes'),
      ca_total: await scalar("SELECT COALESCE(SUM(total),0) FROM commandes WHERE statut != 'annulee'"),
      en_attente: await scalar("SELECT COUNT(*) FROM commandes WHERE statut = 'en_attente'"),
      livrees: await scalar("SELECT COUNT(*) FROM commandes WHERE statut = 'livree'"),
      aujourdhui: await scalar('SELECT COUNT(*) FROM commandes WHERE date(date_commande) = date(CURRENT_TIMESTAMP)'),
    };
  } else {
    const id = req.admin.id; where.push('ca.admin_id = ?'); params.push(id);
    if (search) { where.push('(u.nom LIKE ? OR u.email LIKE ? OR ca.commande_id = ?)'); params.push(`%${search}%`, `%${search}%`, toInt(search, -1)); }
    if (statut) { where.push('ca.statut = ?'); params.push(statut); }
    if (dd) { where.push('date(c.date_commande) >= ?'); params.push(dd); }
    if (df) { where.push('date(c.date_commande) <= ?'); params.push(df); }
    commandes = await query(`SELECT ca.commande_id, ca.commande_id AS id, ca.admin_id, SUM(ca.commission_admin) AS commission_admin, MIN(ca.statut) AS statut,
        MIN(ca.date_creation) AS date_creation, c.total, SUM(ca.total) AS total_vendeur, c.date_commande, c.adresse_livraison, c.code_postal, c.ville,
        c.mode_paiement, u.nom AS client_nom, u.email AS client_email, l.nom AS livreur_nom
      FROM commandes_admins ca JOIN commandes c ON ca.commande_id = c.id JOIN utilisateurs u ON c.utilisateur_id = u.id
      LEFT JOIN livreurs l ON c.livreur_id = l.id WHERE ${where.join(' AND ')}
      GROUP BY ca.commande_id, ca.admin_id, c.total, c.date_commande, c.adresse_livraison, c.code_postal, c.ville, c.mode_paiement, u.nom, u.email, l.nom
      ORDER BY c.date_commande DESC`, params);
    stats = {
      total_commandes: await scalar('SELECT COUNT(DISTINCT commande_id) FROM commandes_admins WHERE admin_id = ?', [id]),
      ca_total: await scalar("SELECT COALESCE(SUM(total),0) FROM commandes_admins WHERE admin_id = ? AND statut != 'annulee'", [id]),
      en_attente: await scalar("SELECT COUNT(DISTINCT commande_id) FROM commandes_admins WHERE admin_id = ? AND statut = 'en_attente'", [id]),
      livrees: await scalar("SELECT COUNT(DISTINCT commande_id) FROM commandes_admins WHERE admin_id = ? AND statut = 'livree'", [id]),
      aujourdhui: await scalar('SELECT COUNT(DISTINCT commande_id) FROM commandes_admins WHERE admin_id = ? AND date(date_creation) = date(CURRENT_TIMESTAMP)', [id]),
      commissions: await scalar("SELECT COALESCE(SUM(commission_admin),0) FROM commandes_admins WHERE admin_id = ? AND statut != 'annulee'", [id]),
    };
  }
  res.json({ commandes, stats });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = toInt(req.params.id), commande = await chargerCommande(req, id);
  const base = `SELECT dc.*, p.nom AS produit_nom, p.image AS produit_image, p.admin_id, a.nom AS vendeur_nom FROM details_commande dc
    JOIN produits p ON dc.produit_id = p.id LEFT JOIN admins a ON p.admin_id = a.id WHERE dc.commande_id = ?`;
  const details = (req.isSuperAdmin ? await query(base, [id]) : await query(`${base} AND p.admin_id = ?`, [id, req.admin.id]))
    .map((d) => ({ ...d, image_url: imageUrl(d.produit_image) }));
  const subtotal = details.reduce((s, d) => s + d.quantite * d.prix_unitaire, 0);
  res.json({
    commande, details, est_super_admin: req.isSuperAdmin, subtotal,
    commission_vendeur: req.isSuperAdmin ? 0 : subtotal * 0.10, // 10 % affiché comme dans commande-detail.php
    livreurs_actifs: await query('SELECT * FROM livreurs WHERE actif = 1 ORDER BY nom'),
    livreur_assigne: commande.livreur_id ? await queryOne('SELECT * FROM livreurs WHERE id = ?', [commande.livreur_id]) : null,
  });
}));

router.put('/:id/statut', asyncHandler(async (req, res) => {
  const id = toInt(req.params.id), statut = str(req.body?.statut);
  if (!STATUTS_COMMANDE.includes(statut)) throw new HttpError(400, 'Statut invalide.');
  await chargerCommande(req, id);
  await transaction(async (tx) => {
    if (req.isSuperAdmin) {
      await tx.execute('UPDATE commandes SET statut = ? WHERE id = ?', [statut, id]);
      await tx.execute('UPDATE commandes_admins SET statut = ? WHERE commande_id = ?', [statut, id]);
    } else {
      await tx.execute('UPDATE commandes_admins SET statut = ? WHERE commande_id = ? AND admin_id = ?', [statut, id, req.admin.id]);
    }
  });
  res.json({ success: true, message: 'Statut de la commande mis à jour avec succès !' });
}));

router.put('/:id/livreur', requireSuperAdmin, asyncHandler(async (req, res) => {
  const id = toInt(req.params.id), lid = toInt(req.body?.livreur_id);
  if (!lid) {
    await execute('UPDATE commandes SET livreur_id = NULL, date_assignation_livreur = NULL WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Livreur retiré de la commande.' });
  }
  if (!(await queryOne('SELECT id FROM livreurs WHERE id = ?', [lid]))) throw new HttpError(404, 'Livreur introuvable.');
  await execute('UPDATE commandes SET livreur_id = ?, date_assignation_livreur = CURRENT_TIMESTAMP WHERE id = ?', [lid, id]);
  res.json({ success: true, message: 'Livreur assigné avec succès !' });
}));

router.delete('/:id', requireSuperAdmin, asyncHandler(async (req, res) => {
  const id = toInt(req.params.id);
  await transaction(async (tx) => {
    await tx.execute('DELETE FROM details_commande WHERE commande_id = ?', [id]);
    await tx.execute('DELETE FROM commandes_admins WHERE commande_id = ?', [id]);
    await tx.execute('DELETE FROM commandes WHERE id = ?', [id]);
  });
  res.json({ success: true, message: 'Commande supprimée avec succès !' });
}));

router.get('/:id/recu', asyncHandler(async (req, res) => {
  const id = toInt(req.params.id), commande = await chargerCommande(req, id);
  const base = `SELECT dc.*, p.nom, p.marque, p.image, p.admin_id, a.nom AS vendeur_nom, a.email AS vendeur_email, a.telephone AS vendeur_tel, a.boutique AS vendeur_boutique
    FROM details_commande dc JOIN produits p ON dc.produit_id = p.id LEFT JOIN admins a ON p.admin_id = a.id WHERE dc.commande_id = ?`;
  const details = req.isSuperAdmin ? await query(`${base} ORDER BY a.id, p.nom`, [id]) : await query(`${base} AND p.admin_id = ? ORDER BY p.nom`, [id, req.admin.id]);
  if (!details.length) throw new HttpError(404, 'Aucun produit trouvé pour cette commande.');
  recuHeaders(res, id);
  genererRecu(res, { commande, details, role: req.isSuperAdmin ? 'super_admin' : 'vendeur', adminNom: req.admin.nom, adminId: req.admin.id });
}));
export default router;
