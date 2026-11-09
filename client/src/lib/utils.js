export const formatPrix = (n) => `${new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0))} FCFA`;
export const formatNombre = (n) => new Intl.NumberFormat('fr-FR').format(Number(n) || 0);

/** URL d'une image produit renvoyée par l'API (image_url) ou reconstruite depuis `image` */
export const imageSrc = (p) => {
  if (!p) return '/logo.jpg';
  if (p.image_url) return p.image_url;
  const img = typeof p === 'string' ? p : p.image;
  if (!img) return '/logo.jpg';
  return img.includes('/') ? `/${img.replace(/^\//, '')}` : `/uploads/${img}`;
};

const pad2 = (n) => String(n).padStart(2, '0');
/** 'YYYY-MM-DD HH:MM:SS' -> Date (heure locale) */
export const parseDate = (s) => (s ? new Date(String(s).replace(' ', 'T')) : null);
export const formatDate = (s) => {
  const d = parseDate(s);
  return d ? `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}` : '';
};
export const formatDateHeure = (s) => {
  const d = parseDate(s);
  return d ? `${formatDate(s)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}` : '';
};
/** tempsEcoule() PHP */
export function tempsEcoule(s) {
  const d = parseDate(s);
  if (!d) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  const jours = Math.floor(diff / 86400);
  if (jours > 7) return formatDateHeure(s);
  if (jours > 0) return `Il y a ${jours} jour${jours > 1 ? 's' : ''}`;
  const h = Math.floor(diff / 3600);
  if (h > 0) return `Il y a ${h} heure${h > 1 ? 's' : ''}`;
  const m = Math.floor(diff / 60);
  if (m > 0) return `Il y a ${m} minute${m > 1 ? 's' : ''}`;
  return "À l'instant";
}
/** formatDateNotification() PHP */
export function tempsNotification(s) {
  const d = parseDate(s);
  if (!d) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 604800) {
    const j = Math.floor(diff / 86400);
    return `${j} jour${j > 1 ? 's' : ''}`;
  }
  return formatDate(s);
}
export const numeroPad = (id) => String(id).padStart(6, '0');

export const STATUTS_COMMANDE = {
  en_attente: { label: 'En attente', badge: 'warning' },
  en_preparation: { label: 'En préparation', badge: 'info' },
  confirmee: { label: 'Confirmée', badge: 'success' },
  expediee: { label: 'Expédiée', badge: 'primary' },
  livree: { label: 'Livrée', badge: 'success' },
  annulee: { label: 'Annulée', badge: 'danger' },
};
export const MODES_PAIEMENT = {
  orange_money: 'Orange Money',
  moov_money: 'Moov Money',
  coris_money: 'Coris Money',
};
export const VEHICULES = {
  moto: { label: 'Moto', icon: 'bi-scooter' },
  voiture: { label: 'Voiture', icon: 'bi-car-front-fill' },
  tricycle: { label: 'Tricycle', icon: 'bi-truck-front' },
  velo: { label: 'Vélo', icon: 'bi-bicycle' },
};
export const NOTIF_ICONS = {
  commande: 'cart-check',
  produit: 'box-seam',
  stock: 'exclamation-triangle',
  system: 'info-circle',
  message: 'envelope',
};
export const NOTIF_COLORS = { low: 'secondary', medium: 'primary', high: 'danger' };
