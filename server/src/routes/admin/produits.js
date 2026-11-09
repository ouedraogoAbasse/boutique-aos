import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { query, queryOne, scalar, execute } from '../../db.js';
import { asyncHandler, HttpError, toInt, str, imageUrl } from '../../lib/helpers.js';
import { config } from '../../config.js';

const router = Router();
const EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const upload = multer({
  storage: multer.diskStorage({
    destination: (_r, _f, cb) => { fs.mkdirSync(config.uploadsDir, { recursive: true }); cb(null, config.uploadsDir); },
    filename: (_r, f, cb) => cb(null, `${crypto.randomBytes(7).toString('hex')}.${path.extname(f.originalname).slice(1).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_r, f, cb) => cb(null, EXT.includes(path.extname(f.originalname).slice(1).toLowerCase()) && f.mimetype.startsWith('image/')),
});
const supprimerImage = (nom) => { if (!nom) return; try { const f = path.join(config.uploadsDir, path.basename(nom)); if (fs.existsSync(f)) fs.unlinkSync(f); } catch { /* ignore */ } };
const dec = (p) => ({ ...p, image_url: imageUrl(p.image) });

async function peutModifier(req, id) {
  const p = await queryOne('SELECT * FROM produits WHERE id = ?', [id]);
  if (!p) throw new HttpError(404, 'Produit introuvable.');
  if (!req.isSuperAdmin && p.admin_id !== req.admin.id) throw new HttpError(403, "Vous n'avez pas les permissions pour modifier ce produit.");
  return p;
}

router.get('/categories', asyncHandler(async (_r, res) => res.json(await query('SELECT * FROM categories ORDER BY nom'))));

router.get('/produits', asyncHandler(async (req, res) => {
  const produits = req.isSuperAdmin
    ? await query(`SELECT p.*, c.nom AS categorie_nom, a.nom AS vendeur_nom, a.boutique AS vendeur_boutique FROM produits p
        LEFT JOIN categories c ON p.categorie_id = c.id LEFT JOIN admins a ON p.admin_id = a.id ORDER BY p.id DESC`)
    : await query(`SELECT p.*, c.nom AS categorie_nom FROM produits p LEFT JOIN categories c ON p.categorie_id = c.id WHERE p.admin_id = ? ORDER BY p.id DESC`, [req.admin.id]);
  res.json({ produits: produits.map(dec), categories: await query('SELECT * FROM categories ORDER BY nom'), nb_produits: produits.length });
}));
router.get('/produits/:id', asyncHandler(async (req, res) => res.json(dec(await peutModifier(req, toInt(req.params.id))))));

function lire(b) {
  const nom = str(b.nom), description = str(b.description), prix = parseFloat(b.prix) || 0;
  if (!nom || !description || prix <= 0) throw new HttpError(400, 'Veuillez remplir tous les champs obligatoires.');
  const promo = b.promo === '1' || b.promo === 'true' || b.promo === 'on' || b.promo === true || b.promo === 1 ? 1 : 0;
  return { nom, description, prix, stock: Math.max(0, toInt(b.stock)), categorie_id: toInt(b.categorie_id) || null, marque: str(b.marque) || null,
    promo, pourcentage_promo: promo ? Math.min(100, Math.max(0, toInt(b.pourcentage_promo))) : 0 };
}

router.post('/produits', upload.single('image'), asyncHandler(async (req, res) => {
  try {
    const d = lire(req.body || {});
    await execute(`INSERT INTO produits (admin_id, nom, description, prix, stock, categorie_id, marque, image, promo, pourcentage_promo) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [req.admin.id, d.nom, d.description, d.prix, d.stock, d.categorie_id, d.marque, req.file?.filename ?? null, d.promo, d.pourcentage_promo]);
    res.status(201).json({ success: true, message: 'Produit ajouté avec succès !' });
  } catch (e) { if (req.file) supprimerImage(req.file.filename); throw e; }
}));
router.put('/produits/:id', upload.single('image'), asyncHandler(async (req, res) => {
  try {
    const p = await peutModifier(req, toInt(req.params.id));
    const d = lire(req.body || {});
    const image = req.file ? req.file.filename : p.image;
    await execute(`UPDATE produits SET nom=?, description=?, prix=?, stock=?, categorie_id=?, marque=?, image=?, promo=?, pourcentage_promo=? WHERE id=?`,
      [d.nom, d.description, d.prix, d.stock, d.categorie_id, d.marque, image, d.promo, d.pourcentage_promo, p.id]);
    if (req.file && p.image) supprimerImage(p.image);
    res.json({ success: true, message: 'Produit modifié avec succès !' });
  } catch (e) { if (req.file) supprimerImage(req.file.filename); throw e; }
}));
router.delete('/produits/:id', asyncHandler(async (req, res) => {
  const p = await peutModifier(req, toInt(req.params.id));
  await execute('DELETE FROM produits WHERE id = ?', [p.id]);
  supprimerImage(p.image);
  res.json({ success: true, message: 'Produit supprimé avec succès !' });
}));
export default router;
