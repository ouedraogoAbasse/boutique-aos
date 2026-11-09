import { Router } from 'express';
import { query, queryOne, scalar, execute } from '../../db.js';
import { asyncHandler, imageUrl } from '../../lib/helpers.js';
import { requireVendeur, publicAdmin } from '../../middleware/auth.js';
import { validerNumeros } from '../auth.js';
import { HttpError } from '../../lib/helpers.js';
import { SQL_STATS_ADMIN } from './index.js';

const router = Router();

router.get('/profil', asyncHandler(async (req, res) => {
  const id = req.admin.id;
  const stats = await queryOne(`${SQL_STATS_ADMIN} WHERE a.id = ?`, [id]);
  const stats_mensuelles = await query(`SELECT strftime('%Y-%m', date_creation) AS mois, COUNT(*) AS nb_commandes, SUM(total) AS ca, SUM(commission_admin) AS commissions
    FROM commandes_admins WHERE admin_id = ? GROUP BY strftime('%Y-%m', date_creation) ORDER BY mois DESC LIMIT 12`, [id]);
  const top_produits = (await query(`SELECT p.id, p.nom, p.image, p.prix, COUNT(ca.id) AS nb_ventes, SUM(ca.quantite) AS quantite_totale, SUM(ca.total) AS ca_total
    FROM commandes_admins ca JOIN produits p ON ca.produit_id = p.id WHERE ca.admin_id = ? GROUP BY p.id, p.nom, p.image, p.prix ORDER BY nb_ventes DESC LIMIT 5`, [id]))
    .map((p) => ({ ...p, image_url: imageUrl(p.image) }));
  const stats_mois = await queryOne(`SELECT COUNT(*) AS nb_commandes, COALESCE(SUM(total),0) AS ca, COALESCE(SUM(commission_admin),0) AS commissions
    FROM commandes_admins WHERE admin_id = ? AND strftime('%Y-%m', date_creation) = strftime('%Y-%m', 'now')`, [id]);
  const repartition_statuts = await query('SELECT statut, COUNT(*) AS nb, SUM(total) AS montant FROM commandes_admins WHERE admin_id = ? GROUP BY statut', [id]);
  const stock_faible = (await query('SELECT * FROM produits WHERE admin_id = ? AND stock < 5 AND stock > 0 ORDER BY stock ASC LIMIT 10', [id])).map((p) => ({ ...p, image_url: imageUrl(p.image) }));
  const dernieres_commandes = await query(`SELECT c.id AS commande_id, c.id, c.date_commande, c.total AS total_commande, SUM(ca.total) AS total, MIN(ca.statut) AS statut,
      u.nom AS client_nom, u.email AS client_email FROM commandes_admins ca JOIN commandes c ON ca.commande_id = c.id JOIN utilisateurs u ON c.utilisateur_id = u.id
      WHERE ca.admin_id = ? GROUP BY c.id, c.date_commande, c.total, u.nom, u.email ORDER BY c.date_commande DESC LIMIT 5`, [id]);
  let tendance_ca = 0, tendance_commandes = 0;
  if (stats_mensuelles.length >= 2) {
    const [a, b] = stats_mensuelles;
    if (b.ca > 0) tendance_ca = ((a.ca - b.ca) / b.ca) * 100;
    if (b.nb_commandes > 0) tendance_commandes = ((a.nb_commandes - b.nb_commandes) / b.nb_commandes) * 100;
  }
  res.json({ admin: publicAdmin(req.admin), stats, stats_mensuelles, top_produits, stats_mois, repartition_statuts, stock_faible, dernieres_commandes, tendance_ca, tendance_commandes });
}));

router.get('/commissions', requireVendeur, asyncHandler(async (req, res) => {
  const id = req.admin.id;
  const stats_mensuelles = await query(`SELECT strftime('%Y-%m', date_creation) AS mois, COUNT(*) AS nb_commandes, SUM(total) AS ca_total, SUM(commission_admin) AS commission_total
    FROM commandes_admins WHERE admin_id = ? AND statut != 'annulee' GROUP BY strftime('%Y-%m', date_creation) ORDER BY mois DESC LIMIT 12`, [id]);
  const toutes_commissions = await query(`SELECT ca.commande_id, ca.date_creation, ca.total, ca.commission_admin, ca.statut, u.nom AS client_nom, u.email AS client_email
    FROM commandes_admins ca LEFT JOIN commandes c ON ca.commande_id = c.id LEFT JOIN utilisateurs u ON c.utilisateur_id = u.id
    WHERE ca.admin_id = ? ORDER BY ca.date_creation DESC`, [id]);
  const parStatut = await query('SELECT statut, COUNT(*) AS nb, SUM(commission_admin) AS total_commission FROM commandes_admins WHERE admin_id = ? GROUP BY statut', [id]);
  res.json({
    stats_mensuelles, toutes_commissions,
    total_commissions: await scalar("SELECT COALESCE(SUM(commission_admin),0) FROM commandes_admins WHERE admin_id = ? AND statut != 'annulee'", [id]),
    total_ca: await scalar("SELECT COALESCE(SUM(total),0) FROM commandes_admins WHERE admin_id = ? AND statut != 'annulee'", [id]),
    stats_par_statut: Object.fromEntries(parStatut.map(({ statut, ...r }) => [statut, r])),
  });
}));

router.get('/mes-numeros', asyncHandler(async (req, res) => {
  const { numero_orange_money, numero_moov_money, numero_coris_money } = req.admin;
  res.json({ numero_orange_money, numero_moov_money, numero_coris_money });
}));
router.put('/mes-numeros', asyncHandler(async (req, res) => {
  const n = validerNumeros(req.body || {});
  if (n.error) throw new HttpError(400, n.error);
  await execute('UPDATE admins SET numero_orange_money=?, numero_moov_money=?, numero_coris_money=? WHERE id=?', [n.orange, n.moov, n.coris, req.admin.id]);
  res.json({ success: true, message: 'Vos numéros de paiement ont été mis à jour avec succès !' });
}));
export default router;
