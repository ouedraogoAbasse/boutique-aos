import { Router } from 'express';
import { query, queryOne, execute } from '../db.js';
import { asyncHandler, HttpError, toInt, str } from '../lib/helpers.js';
import { requireUser } from '../middleware/auth.js';
import { creerNotification } from '../lib/notifications.js';

const router = Router();
router.use(requireUser);

export async function envoyerMessage(convId, type, expId, message) {
  const m = str(message);
  if (!m) return false;
  await execute('INSERT INTO messages (conversation_id, expediteur_type, expediteur_id, message) VALUES (?,?,?,?)', [convId, type, expId, m]);
  await execute('UPDATE conversations SET derniere_activite = CURRENT_TIMESTAMP WHERE id = ?', [convId]);
  return true;
}
export const getMessages = (convId) => query(
  `SELECT m.*, CASE WHEN m.expediteur_type = 'client' THEN u.nom WHEN m.expediteur_type = 'vendeur' THEN a.nom END AS expediteur_nom
   FROM messages m LEFT JOIN utilisateurs u ON m.expediteur_type = 'client' AND m.expediteur_id = u.id
   LEFT JOIN admins a ON m.expediteur_type = 'vendeur' AND m.expediteur_id = a.id
   WHERE m.conversation_id = ? ORDER BY m.date_envoi ASC`, [convId]);
export const marquerLus = (convId, lecteur) => execute(
  `UPDATE messages SET lu = 1, date_lecture = CURRENT_TIMESTAMP WHERE conversation_id = ? AND expediteur_type = ? AND lu = 0`,
  [convId, lecteur === 'client' ? 'vendeur' : 'client']);

async function notifierVendeur(conv, user, texte) {
  await creerNotification(conv.admin_id, 'message', 'Nouveau message', `${user.prenom} ${user.nom} : ${texte.slice(0, 100)}`, `/admin/messagerie/${conv.id}`, 'medium');
}

router.get('/', asyncHandler(async (req, res) => {
  const statut = ['ouvert', 'ferme', 'tous'].includes(req.query.statut) ? req.query.statut : 'ouvert';
  let sql = `SELECT c.id, c.sujet, c.produit_id, c.admin_id, c.statut, c.derniere_activite,
      a.nom AS vendeur_nom, a.email AS vendeur_email, a.telephone AS vendeur_telephone, a.boutique AS vendeur_boutique,
      p.nom AS produit_nom, p.image AS produit_image,
      (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.expediteur_type = 'vendeur' AND m.lu = 0) AS messages_non_lus,
      (SELECT m.message FROM messages m WHERE m.conversation_id = c.id ORDER BY m.date_envoi DESC LIMIT 1) AS dernier_message
    FROM conversations c LEFT JOIN admins a ON c.admin_id = a.id LEFT JOIN produits p ON c.produit_id = p.id WHERE c.utilisateur_id = ?`;
  const params = [req.user.id];
  if (statut !== 'tous') { sql += ' AND c.statut = ?'; params.push(statut); }
  const conversations = await query(sql + ' ORDER BY c.derniere_activite DESC', params);
  res.json({ conversations, nb_non_lus: conversations.reduce((s, c) => s + Number(c.messages_non_lus), 0) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const b = req.body || {}, uid = req.user.id;
  const produitId = toInt(b.produit_id), sujet = str(b.sujet), message = str(b.message);
  const produit = await queryOne('SELECT id, admin_id FROM produits WHERE id = ?', [produitId]);
  if (!produit) throw new HttpError(404, 'Produit introuvable');
  const adminId = toInt(b.admin_id) || produit.admin_id;
  if (!adminId) throw new HttpError(400, 'Aucun vendeur associé à ce produit.');
  if (!sujet || !message) throw new HttpError(400, 'Veuillez remplir tous les champs.');
  let conv = await queryOne(`SELECT id, admin_id FROM conversations WHERE utilisateur_id = ? AND admin_id = ? AND statut = 'ouvert' AND produit_id = ? LIMIT 1`, [uid, adminId, produitId]);
  if (!conv) {
    const r = await execute('INSERT INTO conversations (utilisateur_id, admin_id, produit_id, sujet) VALUES (?,?,?,?)', [uid, adminId, produitId, sujet]);
    conv = { id: r.insertId, admin_id: adminId };
  }
  await envoyerMessage(conv.id, 'client', uid, message);
  await notifierVendeur(conv, req.user, message);
  res.status(201).json({ success: true, conversation_id: conv.id });
}));

async function conversationClient(id, uid) {
  const c = await queryOne(`SELECT c.*, a.nom AS vendeur_nom, a.email AS vendeur_email, a.boutique AS boutique_nom, a.telephone AS vendeur_telephone,
      p.nom AS produit_nom, p.image AS produit_image FROM conversations c LEFT JOIN admins a ON c.admin_id = a.id
      LEFT JOIN produits p ON c.produit_id = p.id WHERE c.id = ?`, [id]);
  if (!c) throw new HttpError(404, 'Conversation introuvable');
  if (c.utilisateur_id !== uid) throw new HttpError(403, 'Accès non autorisé');
  return c;
}

router.get('/:id', asyncHandler(async (req, res) => {
  const conversation = await conversationClient(toInt(req.params.id), req.user.id);
  await marquerLus(conversation.id, 'client');
  res.json({ conversation, messages: await getMessages(conversation.id) });
}));

router.post('/:id/messages', asyncHandler(async (req, res) => {
  const conv = await conversationClient(toInt(req.params.id), req.user.id);
  if (!str(req.body?.message)) throw new HttpError(400, 'Le message ne peut pas être vide.');
  await envoyerMessage(conv.id, 'client', req.user.id, req.body.message);
  await notifierVendeur(conv, req.user, str(req.body.message));
  res.json({ success: true, messages: await getMessages(conv.id) });
}));

export default router;
