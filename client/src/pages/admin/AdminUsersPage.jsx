import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api.js';
import { formatDate } from '../../lib/utils.js';
import { Spinner } from '../../components/guards.jsx';
import './AdminUsersPage.css';

const f2 = (n) => Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const F0 = { search: '', statut: '' };

export default function AdminUsersPage() {
  const [filtre, setFiltre] = useState(F0);
  const [d, setD] = useState(null);
  const [msg, setMsg] = useState(null);
  const charger = useCallback((f) => api.get('/admin/utilisateurs', f).then(setD), []);
  useEffect(() => { charger(F0); }, [charger]);
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(null), 5000); return () => clearTimeout(t); } }, [msg]);
  if (!d) return <Spinner />;
  const s = d.stats;

  async function act(fn, ok) {
    try { const r = await fn(); setMsg({ type: 'success', text: r.message || ok }); await charger(filtre); } catch (e) { setMsg({ type: 'danger', text: e.message }); }
  }
  const bloquer = (u) => window.confirm('Êtes-vous sûr de vouloir bloquer cet utilisateur ?') && act(() => api.post(`/admin/utilisateurs/${u.id}/statut`, { action: 'bloquer' }), 'Utilisateur bloqué.');
  const debloquer = (u) => act(() => api.post(`/admin/utilisateurs/${u.id}/statut`, { action: 'debloquer' }), 'Utilisateur débloqué.');
  const supprimer = (u) => window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?') && act(() => api.del(`/admin/utilisateurs/${u.id}`), 'Utilisateur supprimé.');

  return (
    <div className="adm-users">
      {msg && <div className={`alert alert-${msg.type} alert-dismissible`}><i className={`bi bi-${msg.type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2`}></i>{msg.text}<button type="button" className="btn-close" onClick={() => setMsg(null)}></button></div>}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-lg-3"><div className="stats-card"><h6>Total Utilisateurs</h6><div className="number">{s.total}</div><div className="icon" style={{ background: '#ede9fe', color: 'var(--primary-color)' }}><i className="bi bi-people-fill"></i></div></div></div>
        <div className="col-12 col-sm-6 col-lg-3"><div className="stats-card success"><h6>Utilisateurs Actifs</h6><div className="number" style={{ color: 'var(--success-bg)' }}>{s.actifs}</div><div className="icon" style={{ background: '#d1fae5', color: 'var(--success-bg)' }}><i className="bi bi-check-circle-fill"></i></div></div></div>
        <div className="col-12 col-sm-6 col-lg-3"><div className="stats-card danger"><h6>Utilisateurs Bloqués</h6><div className="number" style={{ color: 'var(--danger-bg)' }}>{s.bloques}</div><div className="icon" style={{ background: '#fee2e2', color: 'var(--danger-bg)' }}><i className="bi bi-shield-x"></i></div></div></div>
        <div className="col-12 col-sm-6 col-lg-3"><div className="stats-card warning"><h6>Nouveaux Aujourd'hui</h6><div className="number" style={{ color: 'var(--warning-bg)' }}>{s.nouveaux_aujourdhui}</div><div className="icon" style={{ background: '#fef3c7', color: 'var(--warning-bg)' }}><i className="bi bi-star-fill"></i></div></div></div>
      </div>

      <div className="card mb-4">
        <div className="card-header"><h5 className="mb-0 fw-bold"><i className="bi bi-funnel me-2"></i>Filtres de recherche</h5></div>
        <div className="card-body"><form className="row g-3 align-items-end" onSubmit={(e) => { e.preventDefault(); charger(filtre); }}>
          <div className="col-md-5"><label className="form-label" htmlFor="search"><i className="bi bi-search me-1"></i>Rechercher</label><input className="form-control" id="search" placeholder="Nom ou email..." value={filtre.search} onChange={(e) => setFiltre({ ...filtre, search: e.target.value })} /></div>
          <div className="col-md-3"><label className="form-label" htmlFor="statut"><i className="bi bi-filter me-1"></i>Statut</label>
            <select className="form-select" id="statut" value={filtre.statut} onChange={(e) => setFiltre({ ...filtre, statut: e.target.value })}><option value="">Tous</option><option value="actif">Actifs</option><option value="bloqué">Bloqués</option></select></div>
          <div className="col-md-4"><div className="d-flex gap-2"><button type="submit" className="btn btn-primary flex-fill"><i className="bi bi-search me-1"></i>Filtrer</button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => { setFiltre(F0); charger(F0); }}><i className="bi bi-arrow-clockwise"></i></button></div></div>
        </form></div>
      </div>

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center"><h5 className="mb-0 fw-bold"><i className="bi bi-list-ul me-2"></i>Liste des Utilisateurs</h5><span className="badge bg-primary">{d.utilisateurs.length} utilisateurs</span></div>
        <div className="card-body p-0"><div className="table-responsive"><table className="table table-hover mb-0">
          <thead><tr><th>ID</th><th>Utilisateur</th><th className="d-none d-lg-table-cell">Email</th><th className="d-none d-xl-table-cell">Téléphone</th><th className="d-none d-md-table-cell">Inscription</th><th className="d-none d-lg-table-cell">Commandes</th><th className="d-none d-md-table-cell">Total Achats</th><th>Statut</th><th className="text-end">Actions</th></tr></thead>
          <tbody>
            {d.utilisateurs.length === 0 ? <tr><td colSpan="9" className="text-center py-5 text-muted"><i className="bi bi-inbox display-4 d-block mb-3"></i>Aucun utilisateur trouvé</td></tr>
              : d.utilisateurs.map((u) => (
                <tr key={u.id}>
                  <td className="fw-semibold">#{u.id}</td>
                  <td><div className="d-flex align-items-center gap-2"><div className="user-avatar">{u.nom[0].toUpperCase()}</div><div><div className="fw-semibold">{u.prenom ? `${u.prenom} ${u.nom}` : u.nom}</div><small className="text-muted d-lg-none">{u.email}</small></div></div></td>
                  <td className="d-none d-lg-table-cell">{u.email}</td>
                  <td className="d-none d-xl-table-cell">{u.telephone || '-'}</td>
                  <td className="d-none d-md-table-cell"><small>{formatDate(u.date_inscription)}</small></td>
                  <td className="d-none d-lg-table-cell"><span className="badge" style={{ background: '#dbeafe', color: '#0d2a6e' }}>{u.nb_commandes} commande(s)</span></td>
                  <td className="d-none d-md-table-cell"><span className="fw-bold" style={{ color: 'var(--primary-color)' }}>{f2(u.total_achats)}FCFA</span></td>
                  <td><span className={`badge badge-${u.statut}`}>{u.statut[0].toUpperCase() + u.statut.slice(1)}</span></td>
                  <td className="text-end"><div className="d-flex gap-1 justify-content-end flex-wrap">
                    <Link to={`/admin/utilisateurs/${u.id}`} className="btn btn-sm btn-info" title="Voir les détails"><i className="bi bi-eye"></i></Link>
                    {u.statut === 'actif' ? <button className="btn btn-sm btn-warning" title="Bloquer" onClick={() => bloquer(u)}><i className="bi bi-shield-x"></i></button>
                      : <button className="btn btn-sm btn-success" title="Débloquer" onClick={() => debloquer(u)}><i className="bi bi-shield-check"></i></button>}
                    {Number(u.nb_commandes) === 0 && <button className="btn btn-sm btn-danger" title="Supprimer" onClick={() => supprimer(u)}><i className="bi bi-trash"></i></button>}
                  </div></td>
                </tr>))}
          </tbody></table></div></div>
      </div>
    </div>
  );
}
