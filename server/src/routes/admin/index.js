import { Router } from 'express';
import { query, queryOne, scalar, execute } from '../../db.js';
import { asyncHandler, HttpError, toInt, str } from '../../lib/helpers.js';
import { ADMIN_COOKIE, signSession, clearSession, loadAdmin, requireAdmin, publicAdmin } from '../../middleware/auth.js';
import { verifyPassword, loginLimiter } from '../auth.js';
import produits from './produits.js';
import commandes from './commandes.js';
import gestion from './gestion.js';
import profil from './profil.js';
import messagerie from './messagerie.js';

const router = Router();

export const compterMessagesNonLusAdmin = (req) => req.isSuperAdmin
  ? scalar(`SELECT COUNT(*) FROM messages WHERE expediteur_type = 'client' AND lu = 0`)
  : scalar(`SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.admin_id = ? AND m.expediteur_type = 'client' AND m.lu = 0`, [req.admin.id]);

// ---------- Auth ----------
router.post('/auth/login', loginLimiter, asyncHandler(async (req, res) => {
  const email = str(req.body?.email), mdp = req.body?.mot_de_passe ?? '';
  if (!email || !mdp) throw new HttpError(400, 'Veuillez remplir tous les champs.');
  const a = await queryOne('SELECT * FROM admins WHERE email = ?', [email]);
  if (!a || !(await verifyPassword(mdp, a.mot_de_passe))) throw new HttpError(401, 'Email ou mot de passe incorrect.');
  if (a.role !== 'super_admin' && a.actif === 0) throw new HttpError(403, 'Votre compte vendeur est désactivé.');
  signSession(res, ADMIN_COOKIE, a.id);
  res.json({ success: true, admin: publicAdmin(a) });
}));
router.post('/auth/logout', (_req, res) => { clearSession(res, ADMIN_COOKIE); res.json({ success: true }); });
router.get('/auth/me', loadAdmin, asyncHandler(async (req, res) => {
  if (!req.admin) return res.json({ admin: null, est_super_admin: false, messages_non_lus: 0, notifications_non_lues: 0 });
  res.json({
    admin: publicAdmin(req.admin), est_super_admin: req.isSuperAdmin,
    messages_non_lus: Number(await compterMessagesNonLusAdmin(req)),
    notifications_non_lues: Number(await scalar('SELECT COUNT(*) FROM notifications WHERE admin_id = ? AND lu = 0', [req.admin.id])),
  });
}));

router.use(requireAdmin);

// ---------- Statistiques (équivalent de la vue stats_par_admin) ----------
export const SQL_STATS_ADMIN = `SELECT a.id AS admin_id, a.nom AS admin_nom, a.email, a.boutique, a.telephone, a.commission, a.actif, a.role,
    a.numero_orange_money, a.numero_moov_money, a.numero_coris_money,
    (SELECT COUNT(*) FROM produits p WHERE p.admin_id = a.id) AS nb_produits,
    (SELECT COUNT(DISTINCT ca.commande_id) FROM commandes_admins ca WHERE ca.admin_id = a.id) AS nb_commandes,
    (SELECT COALESCE(SUM(ca.total),0) FROM commandes_admins ca WHERE ca.admin_id = a.id AND ca.statut != 'annulee') AS chiffre_affaires,
    (SELECT COALESCE(SUM(ca.commission_admin),0) FROM commandes_admins ca WHERE ca.admin_id = a.id AND ca.statut != 'annulee') AS total_commissions
  FROM admins a`;

// ---------- Dashboard ----------
router.get('/dashboard', asyncHandler(async (req, res) => {
  const sup = req.isSuperAdmin, id = req.admin.id;
  const data = {
    admin: publicAdmin(req.admin), est_super_admin: sup,
    nb_utilisateurs: await scalar('SELECT COUNT(*) FROM utilisateurs'),
    nb_produits: sup ? await scalar('SELECT COUNT(*) FROM produits') : await scalar('SELECT COUNT(*) FROM produits WHERE admin_id = ?', [id]),
    nb_commandes: sup ? await scalar('SELECT COUNT(*) FROM commandes') : await scalar('SELECT COUNT(DISTINCT commande_id) FROM commandes_admins WHERE admin_id = ?', [id]),
    chiffre_affaires: sup ? await scalar("SELECT COALESCE(SUM(total),0) FROM commandes WHERE statut != 'annulee'")
      : await scalar("SELECT COALESCE(SUM(total),0) FROM commandes_admins WHERE admin_id = ? AND statut != 'annulee'", [id]),
    dernieres_commandes: sup
      ? await query(`SELECT c.*, u.nom AS client_nom, u.email AS client_email, COUNT(dc.id) AS nb_articles FROM commandes c
          JOIN utilisateurs u ON c.utilisateur_id = u.id LEFT JOIN details_commande dc ON c.id = dc.commande_id
          GROUP BY c.id ORDER BY c.date_commande DESC LIMIT 10`)
      : await query(`SELECT c.id AS commande_id, c.id, c.date_commande, c.total AS total_commande, SUM(ca.total) AS total, SUM(ca.commission_admin) AS commission_admin,
          MIN(ca.statut) AS statut, u.nom AS client_nom, u.email AS client_email FROM commandes_admins ca
          JOIN commandes c ON ca.commande_id = c.id JOIN utilisateurs u ON c.utilisateur_id = u.id
          WHERE ca.admin_id = ? GROUP BY c.id, c.date_commande, c.total, u.nom, u.email ORDER BY c.date_commande DESC LIMIT 10`, [id]),
    messages_non_lus: Number(await compterMessagesNonLusAdmin(req)),
    notifications: await query('SELECT * FROM notifications WHERE admin_id = ? AND lu = 0 ORDER BY importance DESC, date_creation DESC LIMIT 5', [id]),
  };
  if (!sup) {
    data.commissions = await scalar("SELECT COALESCE(SUM(commission_admin),0) FROM commandes_admins WHERE admin_id = ? AND statut != 'annulee'", [id]);
    data.taux_commission = req.admin.commission;
  } else {
    data.tous_admins = (await query('SELECT * FROM admins ORDER BY nom')).map(publicAdmin);
    data.stats_admins = await query(`${SQL_STATS_ADMIN} WHERE a.role = 'vendeur' ORDER BY a.nom`);
  }
  res.json(data);
}));

// ---------- Notifications ----------
router.get('/notifications', asyncHandler(async (req, res) => {
  let sql = 'SELECT * FROM notifications WHERE admin_id = ?';
  if (req.query.non_lues) sql += ' AND lu = 0';
  sql += ' ORDER BY importance DESC, date_creation DESC';
  if (req.query.limite) sql += ` LIMIT ${toInt(req.query.limite, 50)}`;
  res.json({ notifications: await query(sql, [req.admin.id]), nb_non_lues: await scalar('SELECT COUNT(*) FROM notifications WHERE admin_id = ? AND lu = 0', [req.admin.id]) });
}));
// polling du toast (check_notifications.php) : "nouvelles" = non lues arrivées depuis le dernier appel de cet admin
const lastCheck = new Map();
router.get('/notifications/check', asyncHandler(async (req, res) => {
  const id = req.admin.id, since = lastCheck.get(id);
  const total = await scalar('SELECT COUNT(*) FROM notifications WHERE admin_id = ? AND lu = 0', [id]);
  const derniere = await queryOne(`SELECT * FROM notifications WHERE admin_id = ? AND lu = 0 AND date_creation > datetime(CURRENT_TIMESTAMP, '-1 minute') ORDER BY date_creation DESC LIMIT 1`, [id]);
  const nouvelles = since ? await scalar('SELECT COUNT(*) FROM notifications WHERE admin_id = ? AND lu = 0 AND date_creation > ?', [id, since]) : 0;
  lastCheck.set(id, new Date().toISOString().slice(0, 19).replace('T', ' '));
  res.json({ total, nouvelles, derniere });
}));
router.post('/notifications/lire-toutes', asyncHandler(async (req, res) => {
  await execute('UPDATE notifications SET lu = 1, date_lecture = CURRENT_TIMESTAMP WHERE admin_id = ? AND lu = 0', [req.admin.id]);
  res.json({ success: true });
}));
router.post('/notifications/:id/lire', asyncHandler(async (req, res) => {
  await execute('UPDATE notifications SET lu = 1, date_lecture = CURRENT_TIMESTAMP WHERE id = ? AND admin_id = ?', [toInt(req.params.id), req.admin.id]);
  res.json({ success: true });
}));
router.delete('/notifications/:id', asyncHandler(async (req, res) => {
  await execute('DELETE FROM notifications WHERE id = ? AND admin_id = ?', [toInt(req.params.id), req.admin.id]);
  res.json({ success: true });
}));

router.use('/', produits);
router.use('/commandes', commandes);
router.use('/', gestion);
router.use('/', profil);
router.use('/', messagerie);

export default router;
