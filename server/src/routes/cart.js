import { Router } from 'express';
import { query, queryOne, execute, transaction } from '../db.js';
import { asyncHandler, HttpError, toInt, SQL_PRIX_FINAL, calculerFraisLivraison, imageUrl } from '../lib/helpers.js';
import { requireUser } from '../middleware/auth.js';

const router = Router();
router.use(requireUser);

/** Panier groupé par vendeur (panier.php / commander.php) */
export async function chargerPanier(userId) {
  const articles = (await query(
    `SELECT p.*, pan.quantite, pan.id AS panier_id, a.id AS admin_id, a.nom AS vendeur_nom, a.boutique,
            ${SQL_PRIX_FINAL} AS prix_final
     FROM panier pan JOIN produits p ON pan.produit_id = p.id LEFT JOIN admins a ON p.admin_id = a.id
     WHERE pan.utilisateur_id = ?`, [userId])).map((a) => ({ ...a, image_url: imageUrl(a.image) }));
  const map = new Map();
  for (const a of articles) {
    const k = a.admin_id ?? 0;
    if (!map.has(k)) map.set(k, { vendeur: { id: k, nom: a.vendeur_nom ?? 'Vendeur inconnu', boutique: a.boutique ?? '' }, produits: [], total: 0 });
    const g = map.get(k); g.produits.push(a); g.total += a.prix_final * a.quantite;
  }
  const total = articles.reduce((s, a) => s + a.prix_final * a.quantite, 0);
  const frais_livraison = calculerFraisLivraison(total);
  return { articles, groupes: [...map.values()], plusieurs_vendeurs: map.size > 1, total, frais_livraison, total_final: total + frais_livraison };
}

router.get('/', asyncHandler(async (req, res) => res.json(await chargerPanier(req.user.id))));

router.post('/ajouter', asyncHandler(async (req, res) => {
  const pid = toInt(req.body?.produit_id), uid = req.user.id;
  const p = await queryOne('SELECT * FROM produits WHERE id = ? AND stock > 0', [pid]);
  if (!p) throw new HttpError(400, "Ce produit n'est pas disponible.");
  const item = await queryOne('SELECT * FROM panier WHERE utilisateur_id = ? AND produit_id = ?', [uid, pid]);
  if (item) {
    if (item.quantite >= p.stock) throw new HttpError(400, 'Stock insuffisant pour ce produit.');
    await execute('UPDATE panier SET quantite = quantite + 1 WHERE utilisateur_id = ? AND produit_id = ?', [uid, pid]);
    return res.json({ success: true, message: 'La quantité a été mise à jour dans votre panier.' });
  }
  await execute('INSERT INTO panier (utilisateur_id, produit_id, quantite) VALUES (?, ?, 1)', [uid, pid]);
  res.json({ success: true, message: 'Le produit a été ajouté à votre panier.' });
}));

router.post('/quantite', asyncHandler(async (req, res) => {
  const pid = toInt(req.body?.produit_id), uid = req.user.id;
  if (req.body?.action === 'augmenter') {
    // garde-fou stock (le PHP n'en avait pas ici ; la commande le revérifie de toute façon)
    await execute(`UPDATE panier pan JOIN produits p ON p.id = pan.produit_id SET pan.quantite = pan.quantite + 1
                   WHERE pan.utilisateur_id = ? AND pan.produit_id = ? AND pan.quantite < p.stock`, [uid, pid]);
  } else if (req.body?.action === 'diminuer') {
    await execute('UPDATE panier SET quantite = quantite - 1 WHERE utilisateur_id = ? AND produit_id = ? AND quantite > 1', [uid, pid]);
  } else throw new HttpError(400, 'Action invalide.');
  res.json({ success: true });
}));

router.delete('/vendeur/:admin_id', asyncHandler(async (req, res) => {
  await execute(`DELETE FROM panier WHERE utilisateur_id = ? AND produit_id IN (SELECT id FROM produits WHERE admin_id = ?)`,
    [req.user.id, toInt(req.params.admin_id)]);
  res.json({ success: true, message: 'Tous les produits de ce vendeur ont été retirés' });
}));

router.delete('/:produit_id', asyncHandler(async (req, res) => {
  await execute('DELETE FROM panier WHERE utilisateur_id = ? AND produit_id = ?', [req.user.id, toInt(req.params.produit_id)]);
  res.json({ success: true, message: 'Produit retiré du panier' });
}));

router.post('/garder-vendeur', asyncHandler(async (req, res) => {
  const adminId = toInt(req.body?.admin_id), uid = req.user.id;
  await transaction(async (tx) => {
    await tx.execute(`INSERT INTO panier_sauvegarde (utilisateur_id, produit_id, admin_id, quantite)
      SELECT pan.utilisateur_id, pan.produit_id, p.admin_id, pan.quantite FROM panier pan JOIN produits p ON pan.produit_id = p.id
      WHERE pan.utilisateur_id = ? AND p.admin_id != ?
      ON CONFLICT(utilisateur_id, produit_id) DO UPDATE SET quantite = excluded.quantite, date_sauvegarde = CURRENT_TIMESTAMP`, [uid, adminId]);
    await tx.execute(`DELETE FROM panier WHERE utilisateur_id = ? AND produit_id IN (SELECT id FROM produits WHERE admin_id != ?)`, [uid, adminId]);
  });
  res.json({ success: true, message: 'Panier mis à jour ! Les autres vendeurs ont été sauvegardés pour plus tard.' });
}));

router.post('/restaurer-vendeur', asyncHandler(async (req, res) => {
  const adminId = toInt(req.body?.admin_id), uid = req.user.id;
  const sauv = await query('SELECT * FROM panier_sauvegarde WHERE utilisateur_id = ? AND admin_id = ?', [uid, adminId]);
  if (!sauv.length) throw new HttpError(404, 'Aucun produit sauvegardé pour ce vendeur.');
  await transaction(async (tx) => {
    await tx.execute('DELETE FROM panier WHERE utilisateur_id = ?', [uid]);
    for (const s of sauv)
      await tx.execute(`INSERT INTO panier (utilisateur_id, produit_id, quantite) VALUES (?,?,?)
                        ON CONFLICT(utilisateur_id, produit_id) DO UPDATE SET quantite = excluded.quantite`, [uid, s.produit_id, s.quantite]);
  });
  res.json({ success: true, message: 'Panier restauré avec les produits du vendeur !' });
}));

export default router;
