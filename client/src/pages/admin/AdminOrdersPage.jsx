import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { openPdf } from '../../lib/api.js';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { formatDateHeure, numeroPad } from '../../lib/utils.js';
import { Spinner } from '../../components/guards.jsx';
import './AdminOrdersPage.css';

const f2 = (n) => Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const f0 = (n) => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const FILTRE0 = { search: '', statut: '', date_debut: '', date_fin: '' };

export default function AdminOrdersPage() {
  const { estSuperAdmin: sa } = useAdminAuth();
  const [filtre, setFiltre] = useState(FILTRE0);
  const [d, setD] = useState(null);
  const [msg, setMsg] = useState(null);
  const [choix, setChoix] = useState({});

  const charger = useCallback((f) => api.get('/admin/commandes', f).then((r) => { setD(r); setChoix({}); }), []);
  useEffect(() => { charger(FILTRE0); }, [charger]);
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(null), 5000); return () => clearTimeout(t); } }, [msg]);
  if (!d) return <Spinner />;
  const cid = (c) => c.commande_id ?? c.id;
  const set = (k) => (e) => setFiltre({ ...filtre, [k]: e.target.value });

  async function changer(c) {
    try { const r = await api.put(`/admin/commandes/${cid(c)}/statut`, { statut: choix[cid(c)] ?? c.statut }); setMsg({ type: 'success', text: r.message || 'Statut mis à jour.' }); await charger(filtre); }
    catch (e) { setMsg({ type: 'danger', text: e.message }); }
  }
  async function supprimer(c) {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) return;
    try { await api.del(`/admin/commandes/${cid(c)}`); setMsg({ type: 'success', text: 'Commande supprimée.' }); await charger(filtre); }
    catch (e) { setMsg({ type: 'danger', text: e.message }); }
  }
  const s = d.stats;

  return (
    <div className="adm-orders">
      {msg && <div className={`alert alert-${msg.type} alert-dismissible`}><i className={`bi bi-${msg.type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2`}></i>{msg.text}<button type="button" className="btn-close" onClick={() => setMsg(null)}></button></div>}

      <div className="row g-3 mb-4">
        <div className="col-6 col-md-4 col-lg"><div className="stats-card"><h6>{sa ? 'Total Commandes' : 'Mes Commandes'}</h6><div className="number">{s.total_commandes}</div><div className="icon" style={{ background: '#ede9fe', color: 'var(--primary-color)' }}><i className="bi bi-bag-fill"></i></div></div></div>
        <div className="col-6 col-md-4 col-lg"><div className="stats-card warning"><h6>En Attente</h6><div className="number" style={{ color: 'var(--warning-bg)' }}>{s.en_attente}</div><div className="icon" style={{ background: '#fef3c7', color: 'var(--warning-bg)' }}><i className="bi bi-hourglass-split"></i></div></div></div>
        <div className="col-6 col-md-4 col-lg"><div className="stats-card success"><h6>Livrées</h6><div className="number" style={{ color: 'var(--success-bg)' }}>{s.livrees}</div><div className="icon" style={{ background: '#d1fae5', color: 'var(--success-bg)' }}><i className="bi bi-check-circle-fill"></i></div></div></div>
        <div className="col-6 col-md-4 col-lg"><div className="stats-card info"><h6>Aujourd'hui</h6><div className="number" style={{ color: 'var(--info-bg)' }}>{s.aujourdhui}</div><div className="icon" style={{ background: '#e0f2fe', color: 'var(--info-bg)' }}><i className="bi bi-calendar-check"></i></div></div></div>
        <div className="col-12 col-md-8 col-lg"><div className="stats-card"><h6>{sa ? 'CA Total' : 'Mes Commissions'}</h6><div className="number" style={{ fontSize: '1.75rem' }}>{f0(sa ? s.ca_total : (s.commissions ?? s.ca_total))}FCFA</div><div className="icon" style={{ background: '#dcfce7', color: 'var(--success-bg)' }}><i className="bi bi-currency-dollar"></i></div></div></div>
      </div>

      <div className="card mb-4">
        <div className="card-header"><h5 className="mb-0 fw-bold"><i className="bi bi-funnel me-2"></i>Filtres de recherche</h5></div>
        <div className="card-body"><form className="row g-3 align-items-end" onSubmit={(e) => { e.preventDefault(); charger(filtre); }}>
          <div className="col-md-3"><label className="form-label" htmlFor="search"><i className="bi bi-search me-1"></i>Rechercher</label><input className="form-control" id="search" placeholder="N° commande, client..." value={filtre.search} onChange={set('search')} /></div>
          <div className="col-md-2"><label className="form-label" htmlFor="statut"><i className="bi bi-filter me-1"></i>Statut</label>
            <select className="form-select" id="statut" value={filtre.statut} onChange={set('statut')}><option value="">Tous</option><option value="en_attente">En attente</option><option value="en_preparation">En préparation</option><option value="confirmee">Confirmée</option><option value="expediee">Expédiée</option><option value="livree">Livrée</option><option value="annulee">Annulée</option></select></div>
          <div className="col-md-2"><label className="form-label" htmlFor="dd"><i className="bi bi-calendar me-1"></i>Date début</label><input type="date" className="form-control" id="dd" value={filtre.date_debut} onChange={set('date_debut')} /></div>
          <div className="col-md-2"><label className="form-label" htmlFor="df"><i className="bi bi-calendar me-1"></i>Date fin</label><input type="date" className="form-control" id="df" value={filtre.date_fin} onChange={set('date_fin')} /></div>
          <div className="col-md-3"><div className="d-flex gap-2"><button type="submit" className="btn btn-primary flex-fill"><i className="bi bi-search me-1"></i>Filtrer</button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => { setFiltre(FILTRE0); charger(FILTRE0); }}><i className="bi bi-arrow-clockwise"></i></button></div></div>
        </form></div>
      </div>

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center"><h5 className="mb-0 fw-bold"><i className="bi bi-list-ul me-2"></i>{sa ? 'Toutes les commandes' : 'Mes commandes'}</h5><span className="badge bg-primary">{d.commandes.length} commandes</span></div>
        <div className="card-body p-0"><div className="table-responsive"><table className="table table-hover mb-0">
          <thead><tr><th>N° Commande</th><th>Client</th><th className="d-none d-lg-table-cell">Date</th><th>Montant</th>{!sa && <th className="d-none d-lg-table-cell">Commission</th>}<th className="d-none d-xl-table-cell">Adresse</th><th className="d-none d-lg-table-cell">Livreur</th><th>Statut</th><th className="text-end">Actions</th></tr></thead>
          <tbody>
            {d.commandes.length === 0 ? <tr><td colSpan={sa ? 8 : 9} className="text-center py-5 text-muted"><i className="bi bi-inbox display-4 d-block mb-3"></i>Aucune commande trouvée</td></tr>
              : d.commandes.map((c) => (
                <tr key={cid(c)}>
                  <td className="fw-semibold">#{numeroPad(cid(c))}</td>
                  <td><div className="fw-semibold">{c.client_nom}</div><small className="text-muted">{c.client_email}</small></td>
                  <td className="d-none d-lg-table-cell"><small>{formatDateHeure(c.date_commande)}</small></td>
                  <td><span className="fw-bold" style={{ color: 'var(--primary-color)' }}>{f2(c.total)}FCFA</span></td>
                  {!sa && <td className="d-none d-lg-table-cell"><span className="badge badge-promo">{f2(c.commission_admin)}FCFA</span></td>}
                  <td className="d-none d-xl-table-cell"><small className="text-muted">{c.adresse_livraison || 'N/A'}<br />{`${c.code_postal || ''} ${c.ville || ''}`}</small></td>
                  <td className="d-none d-lg-table-cell">{c.livreur_nom ? <span className="badge bg-primary"><i className="bi bi-scooter"></i> {c.livreur_nom}</span> : <span className="badge bg-secondary">Non assigné</span>}</td>
                  <td><div className="status-form">
                    <select className="form-select form-select-sm" value={choix[cid(c)] ?? c.statut} onChange={(e) => setChoix({ ...choix, [cid(c)]: e.target.value })}>
                      <option value="en_attente">En attente</option><option value="en_preparation">En préparation</option><option value="confirmee">Confirmée</option><option value="expediee">Expédiée</option><option value="livree">Livrée</option><option value="annulee">Annulée</option></select>
                    <button className="btn btn-sm btn-success" onClick={() => changer(c)}><i className="bi bi-check-lg"></i></button></div></td>
                  <td className="text-end"><div className="d-flex gap-1 justify-content-end">
                    <Link to={`/admin/commandes/${cid(c)}`} className="btn btn-sm btn-info" title="Voir les détails"><i className="bi bi-eye"></i></Link>
                    <button className="btn btn-sm btn-success" title="Télécharger le reçu PDF" onClick={() => openPdf(`/admin/commandes/${cid(c)}/recu`)}><i className="bi bi-printer-fill"></i></button>
                    {sa && c.statut === 'annulee' && <button className="btn btn-sm btn-danger" title="Supprimer" onClick={() => supprimer(c)}><i className="bi bi-trash"></i></button>}</div></td>
                </tr>))}
          </tbody></table></div></div>
      </div>
    </div>
  );
}
