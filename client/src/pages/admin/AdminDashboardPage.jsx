import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api.js';
import { formatDateHeure, formatDate, formatNombre, numeroPad, NOTIF_ICONS, NOTIF_COLORS, tempsNotification } from '../../lib/utils.js';
import { Spinner } from '../../components/guards.jsx';
import StatutBadge from '../../components/admin/StatutBadge.jsx';

export default function AdminDashboardPage() {
  const [d, setD] = useState(null);
  const [erreur, setErreur] = useState('');
  useEffect(() => { api.get('/admin/dashboard').then(setD).catch((e) => setErreur(e.message)); }, []);
  if (erreur) return <div className="alert alert-danger">{erreur}</div>;
  if (!d) return <Spinner />;
  const sa = d.est_super_admin;
  const col = sa ? '3' : '4';

  return (
    <>
      {d.notifications?.length > 0 && (
        <div className="notifications-container">
          <h5 className="mb-3"><i className="bi bi-bell-fill text-primary"></i> Notifications</h5>
          {d.notifications.map((n) => (
            <div key={n.id} className={`notification-item ${NOTIF_COLORS[n.importance] === 'danger' ? 'danger' : NOTIF_COLORS[n.importance] === 'primary' ? 'info' : 'secondary'}`}>
              <i className={`bi bi-${NOTIF_ICONS[n.type] || 'info-circle'} me-2`}></i>
              <strong>{n.titre} - {n.message}</strong> <small className="text-muted ms-2">{tempsNotification(n.date_creation)}</small>
            </div>
          ))}
        </div>
      )}

      <div className="row g-3 mb-4">
        {sa && <div className="col-12 col-sm-6 col-lg-3"><div className="stat-card users position-relative"><i className="bi bi-people icon text-primary"></i><h6>Utilisateurs</h6><div className="number">{formatNombre(d.nb_utilisateurs)}</div><div className="subtitle">Clients inscrits</div></div></div>}
        <div className={`col-12 col-sm-6 col-lg-${col}`}><div className="stat-card products position-relative"><i className="bi bi-box-seam icon text-success"></i><h6>{sa ? 'Tous les Produits' : 'Mes Produits'}</h6><div className="number">{formatNombre(d.nb_produits)}</div><div className="subtitle">En catalogue</div></div></div>
        <div className={`col-12 col-sm-6 col-lg-${col}`}><div className="stat-card orders position-relative"><i className="bi bi-cart-check icon text-warning"></i><h6>{sa ? 'Toutes les Commandes' : 'Mes Commandes'}</h6><div className="number">{formatNombre(d.nb_commandes)}</div><div className="subtitle">Total à ce jour</div></div></div>
        <div className={`col-12 col-sm-6 col-lg-${col}`}><div className="stat-card revenue position-relative"><i className="bi bi-cash-stack icon text-danger"></i><h6>{sa ? 'CA Total' : 'Mon CA'}</h6><div className="number">{formatNombre(d.chiffre_affaires)}</div><div className="subtitle">FCFA</div></div></div>
        {!sa && <div className="col-12 col-sm-6 col-lg-4"><div className="stat-card commission position-relative"><i className="bi bi-cash-coin icon text-info"></i><h6>Mes Commissions</h6><div className="number">{formatNombre(d.commissions)}</div><div className="subtitle">FCFA ({d.taux_commission}%)</div></div></div>}
      </div>

      <div className="row"><div className="col-12"><div className="table-container">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h4 mb-0"><i className="bi bi-clock-history text-primary"></i> Dernières Commandes</h2>
          <Link to="/admin/commandes" className="btn btn-sm btn-primary">Voir tout <i className="bi bi-arrow-right"></i></Link>
        </div>
        <div className="table-responsive"><table className="table table-hover">
          <thead><tr>
            <th>N° Commande</th><th>Client</th>{sa && <th className="d-none d-lg-table-cell">Vendeur</th>}
            <th className="d-none d-md-table-cell">Date</th><th className="text-end">Total</th>
            {!sa && <th className="text-end d-none d-lg-table-cell">Commission</th>}<th className="text-center">Statut</th>
          </tr></thead>
          <tbody>
            {d.dernieres_commandes.length === 0 ? (
              <tr><td colSpan={sa ? 6 : 7} className="text-center py-4"><i className="bi bi-inbox fs-1 text-muted"></i><p className="text-muted mt-2">Aucune commande pour le moment</p></td></tr>
            ) : d.dernieres_commandes.map((c) => (
              <tr key={c.id ?? c.commande_id}>
                <td><Link to={`/admin/commandes/${c.id ?? c.commande_id}`} className="fw-bold text-primary text-decoration-none">#{numeroPad(c.id ?? c.commande_id)}</Link></td>
                <td>{c.client_nom}<br className="d-md-none" /><small className="text-muted d-md-none">{formatDate(c.date_commande)}</small></td>
                {sa && <td className="d-none d-lg-table-cell"><small>{c.vendeur_nom}</small></td>}
                <td className="d-none d-md-table-cell">{formatDateHeure(c.date_commande)}</td>
                <td className="text-end"><strong>{formatNombre(c.total)} FCFA</strong></td>
                {!sa && <td className="text-end d-none d-lg-table-cell"><span className="text-info">{formatNombre(c.commission_admin)} FCFA</span></td>}
                <td className="text-center"><StatutBadge statut={c.statut} /></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div></div></div>

      {sa && d.stats_admins?.length > 0 && (
        <div className="table-container mt-4">
          <h2 className="h4 mb-3"><i className="bi bi-person-badge text-primary"></i> Performance des vendeurs</h2>
          <div className="table-responsive"><table className="table table-hover">
            <thead><tr><th>Vendeur</th><th>Boutique</th><th className="text-end">Produits</th><th className="text-end">Commandes</th><th className="text-end">CA</th><th className="text-end">Commissions</th></tr></thead>
            <tbody>{d.stats_admins.map((a, i) => (
              <tr key={a.admin_id ?? a.id ?? i}><td>{a.nom ?? a.admin_nom}</td><td>{a.boutique}</td><td className="text-end">{formatNombre(a.nb_produits)}</td>
                <td className="text-end">{formatNombre(a.nb_commandes)}</td><td className="text-end">{formatNombre(a.chiffre_affaires ?? a.ca_total)} FCFA</td>
                <td className="text-end">{formatNombre(a.commission_totale ?? a.total_commissions)} FCFA</td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}
    </>
  );
}
