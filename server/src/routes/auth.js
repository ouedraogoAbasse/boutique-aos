import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { query, queryOne, scalar, execute } from '../db.js';
import { asyncHandler, HttpError, str, isEmail, is8Digits } from '../lib/helpers.js';
import { USER_COOKIE, signSession, clearSession, loadUser, requireUser, publicUser } from '../middleware/auth.js';

const router = Router();
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Trop de tentatives, réessayez dans quelques minutes.' },
});
/** password_verify() PHP : les hash $2y$ sont lus comme $2a$ par bcryptjs */
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, String(hash || '').replace(/^\$2y\$/, '$2a$'));
export const hashPassword = (plain) => bcrypt.hash(plain, 10);

router.post('/register', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const nom = str(b.nom), prenom = str(b.prenom), email = str(b.email);
  const mdp = b.mot_de_passe ?? '', conf = b.confirmer_mdp ?? '';
  if (!nom || !prenom || !email || !mdp) throw new HttpError(400, 'Tous les champs obligatoires doivent être remplis.');
  if (!isEmail(email)) throw new HttpError(400, "L'adresse email n'est pas valide.");
  if (String(mdp).length < 6) throw new HttpError(400, 'Le mot de passe doit contenir au moins 6 caractères.');
  if (mdp !== conf) throw new HttpError(400, 'Les mots de passe ne correspondent pas.');
  if (await queryOne('SELECT id FROM utilisateurs WHERE email = ?', [email])) throw new HttpError(409, 'Cette adresse email est déjà utilisée.');
  await execute(
    'INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, telephone, adresse, ville, code_postal) VALUES (?,?,?,?,?,?,?,?)',
    [nom, prenom, email, await hashPassword(mdp), str(b.telephone), str(b.adresse), str(b.ville), str(b.code_postal)]
  );
  res.status(201).json({ success: true, message: 'Votre compte a été créé avec succès ! Redirection vers la connexion...' });
}));

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const email = str(req.body?.email), mdp = req.body?.mot_de_passe ?? '';
  if (!email || !mdp) throw new HttpError(400, 'Veuillez remplir tous les champs.');
  const u = await queryOne('SELECT * FROM utilisateurs WHERE email = ?', [email]);
  if (!u || !(await verifyPassword(mdp, u.mot_de_passe))) throw new HttpError(401, 'Email ou mot de passe incorrect.');
  if (u.statut === 'bloqué') throw new HttpError(403, 'Votre compte est bloqué. Contactez le support.');
  signSession(res, USER_COOKIE, u.id);
  res.json({ success: true, user: publicUser(u) });
}));

router.post('/logout', (_req, res) => { clearSession(res, USER_COOKIE); res.json({ success: true }); });

router.get('/me', loadUser, asyncHandler(async (req, res) => {
  if (!req.user || req.user.statut === 'bloqué') return res.json({ user: null, cart_count: 0, messages_non_lus: 0 });
  const cart = await scalar('SELECT COALESCE(SUM(quantite),0) FROM panier WHERE utilisateur_id = ?', [req.user.id]);
  const nl = await scalar(
    `SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id
     WHERE c.utilisateur_id = ? AND m.expediteur_type = 'vendeur' AND m.lu = 0`, [req.user.id]);
  res.json({ user: publicUser(req.user), cart_count: Number(cart), messages_non_lus: Number(nl) });
}));

router.put('/profil', requireUser, asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!str(b.nom) || !str(b.prenom)) throw new HttpError(400, 'Nom et prénom obligatoires.');
  await execute('UPDATE utilisateurs SET nom=?, prenom=?, telephone=?, adresse=?, ville=?, code_postal=? WHERE id=?',
    [str(b.nom), str(b.prenom), str(b.telephone), str(b.adresse), str(b.ville), str(b.code_postal), req.user.id]);
  res.json({ success: true, message: 'Profil mis à jour.', user: publicUser(await queryOne('SELECT * FROM utilisateurs WHERE id=?', [req.user.id])) });
}));

/** Validation commune des numéros mobile money (inscription vendeur, admin vendeurs, mes-numéros) */
export function validerNumeros(b) {
  const o = str(b.numero_orange_money), m = str(b.numero_moov_money), c = str(b.numero_coris_money);
  if (!o && !m && !c) return { error: 'Vous devez renseigner au moins un numéro de paiement mobile.' };
  if ((o && !is8Digits(o)) || (m && !is8Digits(m)) || (c && !is8Digits(c)))
    return { error: 'Les numéros de téléphone doivent contenir exactement 8 chiffres (ex: 70123456).' };
  return { orange: o || null, moov: m || null, coris: c || null };
}

router.post('/vendeur/register', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const nom = str(b.nom), email = str(b.email), boutique = str(b.boutique), tel = str(b.telephone);
  const pwd = b.password ?? '';
  if (!nom || !email || !boutique || !tel || !pwd) throw new HttpError(400, 'Tous les champs obligatoires doivent être remplis.');
  if (!isEmail(email)) throw new HttpError(400, 'Adresse email invalide.');
  if (pwd !== b.confirm_password) throw new HttpError(400, 'Les mots de passe ne correspondent pas.');
  if (String(pwd).length < 6) throw new HttpError(400, 'Le mot de passe doit contenir au moins 6 caractères.');
  const n = validerNumeros(b);
  if (n.error) throw new HttpError(400, n.error);
  if (await queryOne('SELECT id FROM admins WHERE email = ?', [email])) throw new HttpError(409, 'Cette adresse email est déjà utilisée.');
  await execute(
    `INSERT INTO admins (nom, email, boutique, telephone, numero_orange_money, numero_moov_money, numero_coris_money, mot_de_passe, role)
     VALUES (?,?,?,?,?,?,?,?, 'vendeur')`,
    [nom, email, boutique, tel, n.orange, n.moov, n.coris, await hashPassword(pwd)]);
  res.status(201).json({ success: true, message: 'Inscription réussie ! Vous pouvez maintenant vous connecter à l\'espace vendeur.' });
}));

export default router;
