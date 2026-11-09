const MAP = {
  en_attente: ['warning text-dark', 'En attente'], en_preparation: ['secondary', 'En préparation'], confirmee: ['success', 'Confirmée'],
  expediee: ['info', 'Expédiée'], livree: ['primary', 'Livrée'], annulee: ['danger', 'Annulée'],
};
/** Badge Bootstrap de statut de commande (back-office) */
export default function StatutBadge({ statut }) {
  const [cls, txt] = MAP[statut] || ['secondary', statut];
  return <span className={`badge bg-${cls}`}>{txt}</span>;
}
export const STATUTS_LISTE = Object.entries(MAP).map(([v, [, l]]) => [v, l]);
