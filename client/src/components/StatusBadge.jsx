const CFG = {
  en_attente: ['bi-hourglass-split', 'En attente'], en_preparation: ['bi-box-seam', 'En préparation'], confirmee: ['bi-check-circle-fill', 'Confirmée'],
  expediee: ['bi-truck', 'Expédiée'], livree: ['bi-box-seam', 'Livrée'], annulee: ['bi-x-circle-fill', 'Annulée'],
};
/** Badge de statut de commande côté client : classes status-* définies dans le CSS de chaque page */
export default function StatusBadge({ statut, large = false }) {
  const [icon, label] = CFG[statut] || ['bi-question-circle', 'Statut inconnu'];
  return <span className={`${large ? 'status-badge-large' : 'status-badge'} status-${statut}`}><i className={`bi ${icon}`}></i> {label}</span>;
}
