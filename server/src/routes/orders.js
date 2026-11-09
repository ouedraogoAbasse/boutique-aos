import { Router } from 'express';
import { query, queryOne, transaction } from '../db.js';
import { asyncHandler, HttpError, toInt, str, is8Digits, MODES_PAIEMENT, getVendeurNumeros, getVendeurNumerosFormats, imageUrl } from '../lib/helpers.js';
import { requireUser, publicUser } from '../middleware/auth.js';
import { chargerPanier } from './cart.js';
import { envoyerEmailConfirmation } from '../lib/email.js';
import { notifierVendeurEtSuperAdmins } from '../lib/notifications.js';
import { genererRecu, recuHeaders } from '../lib/pdf.js';

const router = Router();
router.use(['/commander', '/commandes'], requireUser);

async function vendeursSauvegardes(uid) {
  return query(`SELECT a.id, a.nom, a.boutique, COUNT(*) AS nb_produits,
      SUM((CASE WHEN p.promo = 1 THEN p.prix * (1 - p.pourcentage_promo / 100.0) ELSE p.prix END) * ps.quantite) AS total
    FROM panier_sauvegarde ps JOIN produits p ON ps.produit_id = p.id LEFT JOIN admins a ON ps.admin_id = a.id
    WHERE ps.utilisateur_id = ? GROUP BY a.id, a.nom, a.boutique`, [uid]);
}

router.get('/commander/prepare', asyncHandler(async (req, res) => {
  const panier = await chargerPanier(req.user.id);
  for (const g of panier.groupes) {
    const n = (await getVendeurNumeros(g.vendeur.id)) || {};
    Object.assign(g.vendeur, { numero_orange_money: n.numero_orange_money ?? null, numero_moov_money: n.numero_moov_money ?? null, numero_coris_money: n.numero_coris_money ?? null });
  }
  const principal = !panier.plusieurs_vendeurs && panier.groupes[0] ? panier.groupes[0].vendeur : null;
  res.json({
    ...panier, panier_vide: panier.articles.length === 0, vendeur_principal: principal,
    numeros_formats: principal ? await getVendeurNumerosFormats(principal.id) : {},
    vendeurs_sauvegardes: await vendeursSauvegardes(req.user.id), utilisateur: publicUser(req.user),
  });
}));

router.post('/commandes', asyncHandler(async (req, res) => {
  const b = req.body || {}, uid = req.user.id;
  const panier = await chargerPanier(uid);
  if (!panier.articles.length) throw new HttpError(400, 'Votre panier est vide.');
  if (panier.plusieurs_vendeurs) throw new HttpError(400, 'Impossible de passer commande : votre panier contient des produits de plusieurs vendeurs différents. Veuillez commander séparément pour chaque vendeur.');
  const adresse = str(b.adresse), ville = str(b.ville), cp = str(b.code_postal), pays = str(b.pays);
  const mode = str(b.mode_paiement), num = str(b.numero_paiement);
  if (!adresse || !ville || !cp || !pays) throw new HttpError(400, "Veuillez remplir tous les champs d'adresse de livraison.");
  if (!mode || !MODES_PAIEMENT.includes(mode)) throw new HttpError(400, 'Veuillez sélectionner un mode de paiement.');
  if (!num) throw new HttpError(400, 'Veuillez saisir votre numéro de téléphone pour le paiement.');
  if (!is8Digits(num)) throw new HttpError(400, 'Le numéro de téléphone doit contenir 8 chiffres (ex: 12345678).');

  const vendeur = panier.groupes[0].vendeur;
  let commandeId; const stocksFaibles = [];
  try {
    commandeId = await transaction(async (tx) => {
      const r = await tx.execute(
        `INSERT INTO commandes (utilisateur_id, admin_id, total, adresse_livraison, ville, code_postal, pays, mode_paiement, numero_paiement, statut_paiement)
         VALUES (?,?,?,?,?,?,?,?,?, 'en_attente')`, [uid, vendeur.id || null, panier.total_final, adresse, ville, cp, pays, mode, num]);
      const id = r.insertId;
      for (const a of panier.articles) {
        const p = await tx.queryOne('SELECT stock FROM produits WHERE id = ?', [a.id]);
        if (!p || p.stock < a.quantite) throw new HttpError(400, `Erreur lors de la commande : Stock insuffisant pour ${a.nom}`);
        await tx.execute('INSERT INTO details_commande (commande_id, produit_id, quantite, prix_unitaire) VALUES (?,?,?,?)', [id, a.id, a.quantite, a.prix_final]);
        await tx.execute('UPDATE produits SET stock = stock - ? WHERE id = ?', [a.quantite, a.id]);
        if (p.stock - a.quantite < 5) stocksFaibles.push({ nom: a.nom, stock: p.stock - a.quantite });
      }
      await tx.execute('DELETE FROM panier WHERE utilisateur_id = ?', [uid]);
      await tx.execute('DELETE FROM panier_sauvegarde WHERE utilisateur_id = ? AND admin_id = ?', [uid, vendeur.id]);
      // lignes commandes_admins (sauf si un trigger MySQL les a déjà créées)
      const deja = await tx.queryOne('SELECT COUNT(*) AS n FROM commandes_admins WHERE commande_id = ?', [id]);
      if (!deja.n && vendeur.id) {
        const adm = await tx.queryOne('SELECT commission FROM admins WHERE id = ?', [vendeur.id]);
        const taux = Number(adm?.commission ?? 0);
        for (const a of panier.articles) {
          const t = a.prix_final * a.quantite;
          await tx.execute('INSERT INTO commandes_admins (commande_id, admin_id, produit_id, quantite, total, commission_admin, statut) VALUES (?,?,?,?,?,?, \'en_attente\')',
            [id, vendeur.id, a.id, a.quantite, t, Math.round(t * taux) / 100]);
        }
      }
      return id;
    });
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(500, `Erreur lors de la commande : ${e.message}`);
  }

  const lien = `/admin/commandes/${commandeId}`;
  await notifierVendeurEtSuperAdmins(vendeur.id, 'commande', `Nouvelle commande #${String(commandeId).padStart(6, '0')}`,
    `${req.user.prenom} ${req.user.nom} a commandé pour ${Math.round(panier.total_final)} FCFA.`, lien, 'high');
  for (const s of stocksFaibles)
    await notifierVendeurEtSuperAdmins(vendeur.id, 'stock', 'Stock faible', `${s.nom} : il ne reste que ${s.stock} en stock.`, '/admin/produits', 'medium');

  let email = { success: false, message: 'non envoyé' };
  try {
    email = await envoyerEmailConfirmation(req.user.email, commandeId, panier.total, mode, panier.articles, { adresse, ville, code_postal: cp, pays }, vendeur.id);
  } catch (e) { console.error('email:', e.message); }
  res.status(201).json({
    success: true, commande_id: commandeId, mode_paiement: mode, numero_paiement: num, total: panier.total,
    total_final: panier.total_final, frais_livraison: panier.frais_livraison, vendeur_principal: vendeur,
    numeros_formats: await getVendeurNumerosFormats(vendeur.id), email,
  });
}));

router.get('/commandes', asyncHandler(async (req, res) => res.json(await query(
  `SELECT c.*, COUNT(dc.id) AS nb_articles, l.nom AS livreur_nom, l.telephone AS livreur_telephone
   FROM commandes c LEFT JOIN details_commande dc ON c.id = dc.commande_id LEFT JOIN livreurs l ON c.livreur_id = l.id
   WHERE c.utilisateur_id = ? GROUP BY c.id ORDER BY c.date_commande DESC`, [req.user.id]))));

async function commandeClient(id, uid) {
  return queryOne(`SELECT c.*, a.nom AS vendeur_nom, a.boutique, a.email AS vendeur_email, a.telephone AS vendeur_telephone,
      l.nom AS livreur_nom, l.telephone AS livreur_telephone, l.vehicule AS livreur_vehicule
    FROM commandes c LEFT JOIN admins a ON c.admin_id = a.id LEFT JOIN livreurs l ON c.livreur_id = l.id
    WHERE c.id = ? AND c.utilisateur_id = ?`, [id, uid]);
}

router.get('/commandes/:id', asyncHandler(async (req, res) => {
  const id = toInt(req.params.id);
  const commande = await commandeClient(id, req.user.id);
  if (!commande) throw new HttpError(404, 'Commande introuvable.');
  const details = (await query(`SELECT dc.*, p.nom, p.marque, p.image FROM details_commande dc JOIN produits p ON dc.produit_id = p.id WHERE dc.commande_id = ?`, [id]))
    .map((d) => ({ ...d, image_url: imageUrl(d.image) }));
  res.json({ commande, details, utilisateur: publicUser(req.user), numeros_formats: await getVendeurNumerosFormats(commande.admin_id) });
}));

router.get('/commandes/:id/recu', asyncHandler(async (req, res) => {
  const id = toInt(req.params.id);
  const commande = await queryOne(`SELECT c.*, u.nom AS client_nom, u.email AS client_email, u.telephone FROM commandes c
    JOIN utilisateurs u ON c.utilisateur_id = u.id WHERE c.id = ? AND c.utilisateur_id = ?`, [id, req.user.id]);
  if (!commande) throw new HttpError(404, 'Commande introuvable.');
  const details = await query(`SELECT dc.*, p.nom, p.marque, p.image, p.admin_id, a.nom AS vendeur_nom, a.email AS vendeur_email,
      a.telephone AS vendeur_tel, a.boutique AS vendeur_boutique
    FROM details_commande dc JOIN produits p ON dc.produit_id = p.id LEFT JOIN admins a ON p.admin_id = a.id
    WHERE dc.commande_id = ? ORDER BY a.id, p.nom`, [id]);
  recuHeaders(res, id);
  genererRecu(res, { commande, details, role: 'client' });
}));

export default router;
