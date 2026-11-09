// Helpers partagés par toutes les routes
import { queryOne } from '../db.js';

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}
/** Enveloppe un handler async pour que les erreurs aillent au middleware d'erreurs */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const toInt = (v, def = 0) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};
export const str = (v) => (v === undefined || v === null ? '' : String(v).trim());
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const is8Digits = (v) => /^[0-9]{8}$/.test(v);

/** Règle de frais de livraison de commander.php : gratuit sous 4000 FCFA, sinon 1000 FCFA */
export const calculerFraisLivraison = (sousTotal) => (sousTotal < 4000 ? 0 : 1000);

/** Prix final d'un produit (promo appliquée), arrondi comme MySQL le faisait (2 décimales) */
export const prixFinal = (p) =>
  p.promo ? Math.round(p.prix * (1 - p.pourcentage_promo / 100.0) * 100) / 100 : p.prix;

/** SQL réutilisable : prix final d'un produit alias p */
export const SQL_PRIX_FINAL = '(CASE WHEN p.promo = 1 THEN p.prix * (1 - p.pourcentage_promo / 100.0) ELSE p.prix END)';

/** formaterNumero() PHP : "+226 70 12 34 56" */
export function formaterNumero(numero) {
  if (!numero) return null;
  const n = String(numero).replace(/[^0-9]/g, '');
  if (n.length === 8) return `+226 ${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4, 6)} ${n.slice(6, 8)}`;
  return `+226 ${n}`;
}

export const OPERATEURS = {
  orange: { cle: 'numero_orange_money', mode: 'orange_money', operateur: 'Orange Money', code_ussd: '#144#', couleur: '#ff6b00' },
  moov: { cle: 'numero_moov_money', mode: 'moov_money', operateur: 'Moov Money', code_ussd: '*155#', couleur: '#003d7a' },
  coris: { cle: 'numero_coris_money', mode: 'coris_money', operateur: 'Coris Money', code_ussd: '*662#', couleur: '#e31e24' },
};
export const MODES_PAIEMENT = ['orange_money', 'moov_money', 'coris_money'];
export const MODE_LABELS = { orange_money: 'Orange Money', moov_money: 'Moov Money', coris_money: 'Coris Money' };

export const STATUTS_COMMANDE = ['en_attente', 'en_preparation', 'confirmee', 'expediee', 'livree', 'annulee'];
export const STATUT_LABELS = {
  en_attente: 'En attente',
  en_preparation: 'En préparation',
  confirmee: 'Confirmée',
  expediee: 'Expédiée',
  livree: 'Livrée',
  annulee: 'Annulée',
};

/** getVendeurNumeros() PHP */
export async function getVendeurNumeros(adminId) {
  if (!adminId) return null;
  return queryOne(
    `SELECT numero_orange_money, numero_moov_money, numero_coris_money,
            nom AS vendeur_nom, boutique AS vendeur_boutique
     FROM admins WHERE id = ?`,
    [adminId]
  );
}

/** getVendeurNumerosFormats() PHP -> { orange:{numero,brut,operateur,code_ussd,couleur}, moov:{...}, coris:{...} } */
export async function getVendeurNumerosFormats(adminId) {
  const row = await getVendeurNumeros(adminId);
  const out = {};
  if (!row) return out;
  for (const [key, def] of Object.entries(OPERATEURS)) {
    if (row[def.cle]) {
      out[key] = {
        numero: formaterNumero(row[def.cle]),
        brut: row[def.cle],
        operateur: def.operateur,
        code_ussd: def.code_ussd,
        couleur: def.couleur,
      };
    }
  }
  return out;
}

/** URL publique d'une image produit : 'abc.jpg' -> '/uploads/abc.jpg' ; 'images/produits/x.jpg' (legacy) inchangé */
export const imageUrl = (image) => (!image ? null : image.includes('/') ? `/${image.replace(/^\//, '')}` : `/uploads/${image}`);
