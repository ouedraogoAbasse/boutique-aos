import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../lib/api.js';
import { formatDate, formatDateHeure, numeroPad } from '../../lib/utils.js';
import { Spinner } from '../../components/guards.jsx';
import './AdminUserDetailPage.css';

const f0 = (n) => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const f2 = (n) => Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get(`/admin/utilisateurs/${id}`).then(setD).catch((e) => setErr(e.message)); }, [id]);
  if (err) return <div className="alert alert-danger">{err} <Link to="/admin/utilisateurs">Retour</Link></div>;
  if (!d) return <Spinner />;
  const u = d.utilisateur;
  const nomComplet = u.prenom ? `${u.prenom} ${u.nom}` : u.nom;

  return (
    <div className="adm-user-detail">
      <Link to="/admin/utilisateurs" className="text-primary text-decoration-none d-inline-block mb-3"><i className="bi bi-arrow-left me-1"></i>Retour aux utilisateurs</Link>
      <div className="row g-4">
        <div className="col-lg-4"><div className="user-profile-card">
          <div className="profile-header">
            <div className="user-avatar-large">{u.nom[0].toUpperCase()}</div>
            <h4 className="mb-1">{nomComplet}</h4><p className="mb-3 opacity-90">{u.email}</p>
            <span className={`badge badge-${u.statut} fs-6`}><i className={`bi bi-${u.statut === 'actif' ? 'check-circle' : 'shield-x'} me-1`}></i>{u.statut[0].toUpperCase() + u.statut.slice(1)}</span>
          </div>
          <div className="profile-body">
            <div className="info-group"><div className="info-label"><i className="bi bi-telephone me-2"></i>Téléphone</div><div className="info-value">{u.telephone || 'Non renseigné'}</div></div>
            <div className="info-group"><div className="info-label"><i className="bi bi-geo-alt me-2"></i>Adresse</div>
              <div className="info-value">{u.adresse ? <>{u.adresse}<br />{u.code_postal} {u.ville}<br />{u.pays || ''}</> : <span className="text-muted">Non renseignée</span>}</div></div>
            <div className="info-group"><div className="info-label"><i className="bi bi-calendar-check me-2"></i>Membre depuis</div><div className="info-value">{formatDate(u.date_inscription)}</div></div>
            <div className="info-group"><div className="info-label"><i className="bi bi-cart me-2"></i>Articles dans le panier</div><div className="info-value"><span className="badge" style={{ background: '#dbeafe', color: '#0d2a6e' }}>{d.articles_panier} article(s)</span></div></div>
          </div>
        </div></div>

        <div className="col-lg-8">
          <div className="row g-3 mb-4">
            <div className="col-md-4"><div className="stats-card-mini"><div className="stats-icon" style={{ background: '#dbeafe', color: '#0d2a6e' }}><i className="bi bi-bag-check-fill"></i></div><div className="stats-number">{d.nb_commandes}</div><div className="stats-label">Commandes</div></div></div>
            <div className="col-md-4"><div className="stats-card-mini"><div className="stats-icon" style={{ background: '#dcfce7', color: '#166534' }}><i className="bi bi-cash-stack"></i></div><div className="stats-number">{f0(d.total_achats)}FCFA</div><div className="stats-label">Total Achats</div></div></div>
            <div className="col-md-4"><div className="stats-card-mini"><div className="stats-icon" style={{ background: '#fef3c7', color: '#92400e' }}><i className="bi bi-graph-up"></i></div><div className="stats-number">{f0(d.moyenne_commande)}FCFA</div><div className="stats-label">Panier Moyen</div></div></div>
          </div>
          <div className="card">
            <div className="card-header"><h5 className="mb-0 fw-bold"><i className="bi bi-clock-history me-2"></i>Historique des Commandes</h5></div>
            <div className="card-body p-0">
              {d.commandes.length === 0 ? <div className="text-center py-5 text-muted"><i className="bi bi-inbox display-4 d-block mb-3"></i><p className="mb-0">Aucune commande pour le moment</p></div> : (
                <div className="table-responsive"><table className="table table-hover mb-0">
                  <thead><tr><th>N° Commande</th><th>Date</th><th>Montant</th><th>Statut</th><th className="text-end">Actions</th></tr></thead>
                  <tbody>{d.commandes.map((c) => {
                    const cls = c.statut === 'livree' ? 'success' : c.statut === 'annulee' ? 'danger' : 'warning';
                    return (
                      <tr key={c.id}><td className="fw-semibold">#{numeroPad(c.id)}</td><td><small>{formatDateHeure(c.date_commande)}</small></td>
                        <td><span className="fw-bold" style={{ color: 'var(--primary-color)' }}>{f2(c.total)}FCFA</span></td>
                        <td><span className={`badge badge-${cls}`}>{(c.statut[0].toUpperCase() + c.statut.slice(1)).replace('_', ' ')}</span></td>
                        <td className="text-end"><Link to={`/admin/commandes/${c.id}`} className="btn btn-sm btn-primary"><i className="bi bi-eye me-1"></i>Voir</Link></td></tr>);
                  })}</tbody></table></div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
