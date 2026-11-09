import { Router } from 'express';
import { query, queryOne, execute } from '../../db.js';
import { asyncHandler, HttpError, toInt, str } from '../../lib/helpers.js';
import { envoyerMessage, getMessages, marquerLus } from '../messaging.js';

const router = Router();
const MODELES = [
  { id: 1, titre: 'Salutation', texte: "Bonjour, merci pour votre intérêt pour nos produits. Comment puis-je vous aider ?" },
  { id: 2, titre: 'Produit disponible', texte: "Bonjour, oui ce produit est actuellement disponible en stock. Vous pouvez passer commande directement sur le site." },
  { id: 3, titre: 'Produit indisponible', texte: "Bonjour, ce produit est momentanément en rupture de stock. Je vous informerai dès son retour." },
  { id: 4, titre: 'Modes de paiement', texte: "Nous acceptons Orange Money, Moov Money et Coris Money. Les numéros de paiement s'affichent au moment de la commande." },
  { id: 5, titre: 'Livraison', texte: "La livraison est assurée par nos livreurs partenaires. Elle est gratuite pour les petites commandes et à 1 000 FCFA au-delà de 4 000 FCFA d'achat." },
  { id: 6, titre: 'Remerciement', texte: "Merci pour votre confiance ! N'hésitez pas à nous recontacter pour toute autre question." },
];

async function acces(req, id) {
  const c = await queryOne(`SELECT c.*, u.nom AS client_nom, u.email AS client_email, u.telephone AS client_telephone, u.prenom AS client_prenom, u.adresse AS client_adresse, p.prix AS produit_prix, p.nom AS produit_nom, p.image AS produit_image
    FROM conversations c LEFT JOIN utilisateurs u ON c.utilisateur_id = u.id LEFT JOIN produits p ON c.produit_id = p.id WHERE c.id = ?`, [id]);
  if (!c) throw new HttpError(404, 'Conversation introuvable');
  if (!req.isSuperAdmin && c.admin_id !== req.admin.id) throw new HttpError(403, 'Accès non autorisé');
  return c;
}

router.get('/messages/modeles', (_r, res) => res.json(MODELES));

router.get('/conversations', asyncHandler(async (req, res) => {
  const statut = ['ouvert', 'ferme', 'tous'].includes(req.query.statut) ? req.query.statut : (req.isSuperAdmin ? 'tous' : 'ouvert');
  const where = [], params = [];
  if (!req.isSuperAdmin) { where.push('c.admin_id = ?'); params.push(req.admin.id); }
  if (statut !== 'tous') { where.push('c.statut = ?'); params.push(statut); }
  const conversations = await query(`SELECT c.*, u.nom AS client_nom, u.email AS client_email, p.nom AS produit_nom, p.image AS produit_image, a.nom AS vendeur_nom, a.boutique AS vendeur_boutique,
      (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.expediteur_type = 'client' AND m.lu = 0) AS messages_non_lus,
      (SELECT m.message FROM messages m WHERE m.conversation_id = c.id ORDER BY m.date_envoi DESC LIMIT 1) AS dernier_message
    FROM conversations c LEFT JOIN utilisateurs u ON c.utilisateur_id = u.id LEFT JOIN produits p ON c.produit_id = p.id LEFT JOIN admins a ON c.admin_id = a.id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY c.derniere_activite DESC`, params);
  res.json({ conversations, messages_non_lus: conversations.reduce((s, c) => s + Number(c.messages_non_lus), 0) });
}));

router.get('/conversations/:id', asyncHandler(async (req, res) => {
  const conversation = await acces(req, toInt(req.params.id));
  await marquerLus(conversation.id, 'vendeur');
  res.json({ conversation, messages: await getMessages(conversation.id) });
}));
router.post('/conversations/:id/messages', asyncHandler(async (req, res) => {
  const conv = await acces(req, toInt(req.params.id));
  if (!str(req.body?.message)) throw new HttpError(400, 'Le message ne peut pas être vide.');
  await envoyerMessage(conv.id, 'vendeur', req.admin.id, req.body.message);
  res.json({ success: true, messages: await getMessages(conv.id) });
}));
router.post('/conversations/:id/fermer', asyncHandler(async (req, res) => {
  const c = await acces(req, toInt(req.params.id));
  await execute("UPDATE conversations SET statut = 'ferme' WHERE id = ?", [c.id]);
  res.json({ success: true });
}));
router.post('/conversations/:id/rouvrir', asyncHandler(async (req, res) => {
  const c = await acces(req, toInt(req.params.id));
  await execute("UPDATE conversations SET statut = 'ouvert' WHERE id = ?", [c.id]);
  res.json({ success: true });
}));
export default router;
