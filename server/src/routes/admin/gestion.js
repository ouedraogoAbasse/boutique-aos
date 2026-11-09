import { Router } from 'express';
import { query, queryOne, scalar, execute } from '../../db.js';
import { asyncHandler, HttpError, toInt, str, is8Digits, isEmail } from '../../lib/helpers.js';
import { requireSuperAdmin, publicAdmin } from '../../middleware/auth.js';
import { hashPassword, validerNumeros } from '../auth.js';
import { SQL_STATS_ADMIN } from './index.js';

const router = Router();

// ================= Vendeurs (super admin) =================
router.get('/vendeurs', requireSuperAdmin, asyncHandler(async (_r, res) =>
  res.json(await query(`${SQL_STATS_ADMIN} WHERE a.role = 'vendeur' ORDER BY a.nom`))));
router.get('/vendeurs/:id', requireSuperAdmin, asyncHandler(async (req, res) => {
  const a = await queryOne("SELECT * FROM admins WHERE id = ? AND role = 'vendeur'", [toInt(req.params.id)]);
  if (!a) throw new HttpError(404, 'Vendeur introuvable.');
  res.json(publicAdmin(a));
}));
function lireVendeur(b, creation) {
  const v = { nom: str(b.nom), email: str(b.email), boutique: str(b.boutique), telephone: str(b.telephone), commission: parseFloat(b.commission) || 0, mdp: str(b.mot_de_passe) };
  if (!v.nom || !v.email || !v.boutique) throw new HttpError(400, 'Veuillez remplir tous les champs obligatoires.');
  if (!isEmail(v.email)) throw new HttpError(400, 'Adresse email invalide.');
  if (creation && !v.mdp) throw new HttpError(400, 'Le mot de passe est obligatoire pour un nouveau vendeur.');
  const n = validerNumeros(b);
  if (n.error) throw new HttpError(400, n.error.replace('de paiement mobile.', 'de paiement mobile pour ce vendeur.'));
  return { ...v, n };
}
router.post('/vendeurs', requireSuperAdmin, asyncHandler(async (req, res) => {
  const v = lireVendeur(req.body || {}, true);
  if (await queryOne('SELECT id FROM admins WHERE email = ?', [v.email])) throw new HttpError(409, 'Cet email est déjà utilisé.');
  await execute(`INSERT INTO admins (nom, email, mot_de_passe, role, boutique, telephone, commission, numero_orange_money, numero_moov_money, numero_coris_money)
    VALUES (?,?,?, 'vendeur', ?,?,?,?,?,?)`, [v.nom, v.email, await hashPassword(v.mdp), v.boutique, v.telephone, v.commission, v.n.orange, v.n.moov, v.n.coris]);
  res.status(201).json({ success: true, message: `Vendeur ajouté avec succès ! Email: ${v.email}` });
}));
router.put('/vendeurs/:id', requireSuperAdmin, asyncHandler(async (req, res) => {
  const id = toInt(req.params.id), v = lireVendeur(req.body || {}, false);
  if (await queryOne('SELECT id FROM admins WHERE email = ? AND id != ?', [v.email, id])) throw new HttpError(409, 'Cet email est déjà utilisé.');
  const set = 'nom=?, email=?, boutique=?, telephone=?, commission=?, numero_orange_money=?, numero_moov_money=?, numero_coris_money=?';
  const vals = [v.nom, v.email, v.boutique, v.telephone, v.commission, v.n.orange, v.n.moov, v.n.coris];
  if (v.mdp) await execute(`UPDATE admins SET ${set}, mot_de_passe=? WHERE id=? AND role='vendeur'`, [...vals, await hashPassword(v.mdp), id]);
  else await execute(`UPDATE admins SET ${set} WHERE id=? AND role='vendeur'`, [...vals, id]);
  res.json({ success: true, message: 'Vendeur modifié avec succès !' });
}));
router.post('/vendeurs/:id/toggle', requireSuperAdmin, asyncHandler(async (req, res) => {
  await execute("UPDATE admins SET actif = NOT actif WHERE id = ? AND role = 'vendeur'", [toInt(req.params.id)]);
  res.json({ success: true, message: 'Statut du vendeur modifié avec succès !' });
}));
router.delete('/vendeurs/:id', requireSuperAdmin, asyncHandler(async (req, res) => {
  const id = toInt(req.params.id), n = await scalar('SELECT COUNT(*) FROM produits WHERE admin_id = ?', [id]);
  if (n > 0) throw new HttpError(400, `Impossible de supprimer ce vendeur car il a ${n} produit(s) associé(s). Désactivez-le plutôt.`);
  await execute("DELETE FROM admins WHERE id = ? AND role = 'vendeur'", [id]);
  res.json({ success: true, message: 'Vendeur supprimé avec succès !' });
}));

// ================= Utilisateurs (admin ou vendeur, comme le PHP) =================
router.get('/utilisateurs', asyncHandler(async (req, res) => {
  const search = str(req.query.search), statut = str(req.query.statut), where = [], params = [];
  if (search) { where.push('(u.nom LIKE ? OR u.email LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  if (statut) { where.push('u.statut = ?'); params.push(statut); }
  const utilisateurs = (await query(`SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.adresse, u.ville, u.code_postal, u.statut, u.date_inscription,
      COUNT(DISTINCT c.id) AS nb_commandes, COALESCE(SUM(c.total),0) AS total_achats FROM utilisateurs u LEFT JOIN commandes c ON u.id = c.utilisateur_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''} GROUP BY u.id ORDER BY u.date_inscription DESC`, params));
  res.json({ utilisateurs, stats: {
    total: await scalar('SELECT COUNT(*) FROM utilisateurs'),
    actifs: await scalar("SELECT COUNT(*) FROM utilisateurs WHERE statut = 'actif'"),
    bloques: await scalar("SELECT COUNT(*) FROM utilisateurs WHERE statut = 'bloqué'"),
    nouveaux_aujourdhui: await scalar('SELECT COUNT(*) FROM utilisateurs WHERE date(date_inscription) = date(CURRENT_TIMESTAMP)'),
  } });
}));
router.get('/utilisateurs/:id', asyncHandler(async (req, res) => {
  const id = toInt(req.params.id), u = await queryOne('SELECT * FROM utilisateurs WHERE id = ?', [id]);
  if (!u) throw new HttpError(404, 'Utilisateur introuvable.');
  delete u.mot_de_passe;
  const commandes = await query('SELECT * FROM commandes WHERE utilisateur_id = ? ORDER BY date_commande DESC', [id]);
  const total_achats = await scalar("SELECT COALESCE(SUM(total),0) FROM commandes WHERE utilisateur_id = ? AND statut != 'annulee'", [id]);
  res.json({ utilisateur: u, commandes, nb_commandes: commandes.length, total_achats,
    articles_panier: await scalar('SELECT COUNT(*) FROM panier WHERE utilisateur_id = ?', [id]),
    moyenne_commande: commandes.length ? total_achats / commandes.length : 0 });
}));
router.post('/utilisateurs/:id/statut', asyncHandler(async (req, res) => {
  const bloquer = req.body?.action === 'bloquer';
  if (!bloquer && req.body?.action !== 'debloquer') throw new HttpError(400, 'Action invalide.');
  await execute('UPDATE utilisateurs SET statut = ? WHERE id = ?', [bloquer ? 'bloqué' : 'actif', toInt(req.params.id)]);
  res.json({ success: true, message: bloquer ? 'Utilisateur bloqué avec succès !' : 'Utilisateur débloqué avec succès !' });
}));
router.delete('/utilisateurs/:id', asyncHandler(async (req, res) => {
  const id = toInt(req.params.id);
  if (await scalar('SELECT COUNT(*) FROM commandes WHERE utilisateur_id = ?', [id])) throw new HttpError(400, 'Impossible de supprimer cet utilisateur car il a des commandes en cours.');
  await execute('DELETE FROM panier WHERE utilisateur_id = ?', [id]);
  await execute('DELETE FROM utilisateurs WHERE id = ?', [id]);
  res.json({ success: true, message: 'Utilisateur supprimé avec succès !' });
}));

// ================= Livreurs (super admin) =================
const VEH = ['moto', 'voiture', 'tricycle', 'velo'];
function lireLivreur(b) {
  const nom = str(b.nom), tel = str(b.telephone), zone = str(b.zone_livraison), veh = VEH.includes(b.vehicule) ? b.vehicule : 'moto';
  if (!nom || !tel) throw new HttpError(400, 'Le nom et le téléphone sont obligatoires.');
  if (!is8Digits(tel)) throw new HttpError(400, 'Le numéro de téléphone doit contenir exactement 8 chiffres (ex: 70123456).');
  return [nom, tel, zone, veh];
}
router.get('/livreurs', requireSuperAdmin, asyncHandler(async (_r, res) => res.json(await query('SELECT * FROM livreurs ORDER BY date_ajout DESC'))));
router.post('/livreurs', requireSuperAdmin, asyncHandler(async (req, res) => {
  await execute('INSERT INTO livreurs (nom, telephone, zone_livraison, vehicule) VALUES (?,?,?,?)', lireLivreur(req.body || {}));
  res.status(201).json({ success: true, message: 'Livreur ajouté avec succès !' });
}));
router.put('/livreurs/:id', requireSuperAdmin, asyncHandler(async (req, res) => {
  await execute('UPDATE livreurs SET nom=?, telephone=?, zone_livraison=?, vehicule=? WHERE id=?', [...lireLivreur(req.body || {}), toInt(req.params.id)]);
  res.json({ success: true, message: 'Livreur modifié avec succès !' });
}));
router.post('/livreurs/:id/toggle', requireSuperAdmin, asyncHandler(async (req, res) => {
  await execute('UPDATE livreurs SET actif = NOT actif WHERE id = ?', [toInt(req.params.id)]);
  res.json({ success: true, message: 'Statut du livreur modifié avec succès !' });
}));
router.delete('/livreurs/:id', requireSuperAdmin, asyncHandler(async (req, res) => {
  await execute('UPDATE commandes SET livreur_id = NULL, date_assignation_livreur = NULL WHERE livreur_id = ?', [toInt(req.params.id)]);
  await execute('DELETE FROM livreurs WHERE id = ?', [toInt(req.params.id)]);
  res.json({ success: true, message: 'Livreur supprimé avec succès !' });
}));
export default router;
