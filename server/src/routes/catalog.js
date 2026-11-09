import { Router } from 'express';
import { query, queryOne } from '../db.js';
import { asyncHandler, HttpError, toInt, prixFinal, imageUrl } from '../lib/helpers.js';

const router = Router();
export const decorate = (p) => ({ ...p, prix_final: prixFinal(p), image_url: imageUrl(p.image) });

router.get('/home', asyncHandler(async (_req, res) => {
  const produits = await query(`SELECT p.*, c.nom AS categorie_nom FROM produits p LEFT JOIN categories c ON p.categorie_id = c.id
    WHERE p.stock > 0 ORDER BY p.date_ajout DESC LIMIT 8`);
  const categories = await query('SELECT * FROM categories');
  res.json({ produits: produits.map(decorate), categories });
}));

router.get('/categories', asyncHandler(async (_req, res) => res.json(await query('SELECT * FROM categories ORDER BY nom'))));

router.get('/produits', asyncHandler(async (req, res) => {
  const { type, categorie, marque, promo, nouveau, recherche } = req.query;
  let sql = `SELECT p.*, c.nom AS categorie_nom, c.type AS categorie_type FROM produits p
             LEFT JOIN categories c ON p.categorie_id = c.id WHERE 1=1`;
  const params = [];
  if (type) { sql += ' AND c.type = ?'; params.push(String(type)); }
  if (categorie) { sql += ' AND p.categorie_id = ?'; params.push(toInt(categorie)); }
  if (marque) { sql += ' AND p.marque = ?'; params.push(String(marque)); }
  if (promo) sql += ' AND p.promo = 1';
  if (nouveau) sql += ' AND p.nouveau = 1';
  if (recherche) {
    sql += ' AND (p.nom LIKE ? OR p.description LIKE ? OR p.marque LIKE ?)';
    const r = `%${recherche}%`; params.push(r, r, r);
  }
  sql += ' ORDER BY p.date_ajout DESC';
  const produits = await query(sql, params);
  const categories = await query('SELECT * FROM categories ORDER BY nom');
  const marques = (await query('SELECT DISTINCT marque FROM produits ORDER BY marque')).map((m) => m.marque).filter(Boolean);
  res.json({ produits: produits.map(decorate), categories, marques });
}));

router.get('/produits/:id', asyncHandler(async (req, res) => {
  const p = await queryOne(`SELECT p.*, a.nom AS vendeur_nom, a.email AS vendeur_email, a.telephone AS vendeur_tel, a.boutique AS vendeur_boutique
    FROM produits p LEFT JOIN admins a ON p.admin_id = a.id WHERE p.id = ?`, [toInt(req.params.id)]);
  if (!p) throw new HttpError(404, 'Produit introuvable.');
  res.json({ produit: decorate(p), similaires: [] });
}));

router.get('/livreurs', asyncHandler(async (_req, res) =>
  res.json(await query('SELECT nom, zone_livraison, vehicule FROM livreurs WHERE actif = 1 ORDER BY nom'))));

export default router;
