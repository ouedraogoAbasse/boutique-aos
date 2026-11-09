import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api.js';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { formatDateHeure, numeroPad } from '../../lib/utils.js';
import { Spinner } from '../../components/guards.jsx';
import StatutBadge from '../../components/admin/StatutBadge.jsx';
import './AdminCommissionsPage.css';

const f0 = (n) => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const STATUTS = [['confirmee', 'Confirmées', 'check-circle', 'success'], ['en_attente', 'En attente', 'clock', 'warning'], ['expediee', 'Expédiées', 'truck', 'info'], ['livree', 'Livrées', 'box-seam', 'primary'], ['annulee', 'Annulées', 'x-circle', 'danger']];

function Graphique({ data }) {
  const mois = [...data].reverse();
  const max = Math.max(1, ...mois.map((m) => Number(m.commission_total)));
  if (!mois.length) return <p className="text-muted text-center py-4">Aucune donnée</p>;
  return (
    <div className="d-flex align-items-end gap-2" style={{ height: 220 }}>
      {mois.map((m) => (
        <div key={m.mois} className="flex-fill text-center" title={`${m.mois} : ${f0(m.commission_total)} FCFA (${m.nb_commandes} commandes)`}>
          <small className="d-block text-info fw-bold" style={{ fontSize: '.7rem' }}>{f0(m.commission_total)}</small>
          <div style={{ height: `${(Number(m.commission_total) / max) * 160}px`, minHeight: 2, background: 'linear-gradient(180deg,#0dcaf0,#1a56c4)', borderRadius: '6px 6px 0 0' }}></div>
          <small className="text-muted" style={{ fontSize: '.7rem' }}>{m.mois}</small>
        </div>
      ))}
    </div>
  );
}

export default function AdminCommissionsPage() {
  const { admin } = useAdminAuth();
  const [d, setD] = useState(null);
  const [f, setF] = useState({ q: '', statut: '', mois: '' });
  useEffect(() => { api.get('/admin/commissions').then(setD); }, []);
  const lignes = useMemo(() => (d?.toutes_commissions || []).filter((c) =>
    (!f.q || (c.client_nom || '').toLowerCase().includes(f.q.toLowerCase())) && (!f.statut || c.statut === f.statut) && (!f.mois || String(c.date_creation).slice(0, 7) === f.mois)), [d, f]);
  if (!d) return <Spinner />;

  return (
    <div className="adm-comm">
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4"><div className="stat-card primary position-relative"><i className="bi bi-cash-coin icon text-info"></i><h6>Total Commissions</h6><div className="number">{f0(d.total_commissions)}</div><div className="subtitle">FCFA</div></div></div>
        <div className="col-12 col-md-4"><div className="stat-card success position-relative"><i className="bi bi-cash-stack icon text-success"></i><h6>Chiffre d'Affaires</h6><div className="number">{f0(d.total_ca)}</div><div className="subtitle">FCFA</div></div></div>
        <div className="col-12 col-md-4"><div className="stat-card warning position-relative"><i className="bi bi-percent icon text-warning"></i><h6>Taux de Commission</h6><div className="number">{admin.commission}%</div><div className="subtitle">Sur vos ventes</div></div></div>
      </div>
      <div className="content-card mb-4"><h2><i className="bi bi-graph-up text-primary"></i> Évolution des Commissions</h2><Graphique data={d.stats_mensuelles} /></div>
      <div className="content-card mb-4"><h2><i className="bi bi-pie-chart text-primary"></i> Répartition par Statut</h2>
        <div className="row g-3">{STATUTS.map(([s, label, icon, color]) => { const st = d.stats_par_statut[s] || { nb: 0, total_commission: 0 }; return (
          <div className="col-6 col-md-4 col-lg" key={s}><div className="text-center p-3 border rounded"><i className={`bi bi-${icon} fs-2 text-${color}`}></i><h6 className="mt-2 mb-1">{label}</h6><div className="fw-bold">{st.nb} commandes</div><small className="text-muted">{f0(st.total_commission)} FCFA</small></div></div>); })}</div></div>
      <div className="content-card"><h2><i className="bi bi-list-ul text-primary"></i> Détail des Commissions</h2>
        <div className="filter-section"><div className="row g-2">
          <div className="col-md-4"><input className="form-control" placeholder="Rechercher par client..." value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} /></div>
          <div className="col-md-3"><select className="form-select" value={f.statut} onChange={(e) => setF({ ...f, statut: e.target.value })}><option value="">Tous les statuts</option>{STATUTS.map(([s]) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></div>
          <div className="col-md-3"><input type="month" className="form-control" value={f.mois} onChange={(e) => setF({ ...f, mois: e.target.value })} /></div>
          <div className="col-md-2"><button className="btn btn-secondary w-100" onClick={() => setF({ q: '', statut: '', mois: '' })}><i className="bi bi-arrow-clockwise"></i> Réinitialiser</button></div>
        </div></div>
        <div className="table-responsive"><table className="table table-hover">
          <thead><tr><th>N° Commande</th><th>Client</th><th className="d-none d-md-table-cell">Date</th><th className="text-end">Montant Total</th><th className="text-end">Commission</th><th className="text-center">Statut</th></tr></thead>
          <tbody>{lignes.length === 0 ? <tr><td colSpan="6" className="text-center py-4"><i className="bi bi-inbox fs-1 text-muted"></i><p className="text-muted mt-2">Aucune commission pour le moment</p></td></tr>
            : lignes.map((c, i) => (
              <tr key={`${c.commande_id}-${i}`}><td><strong className="text-primary">#{numeroPad(c.commande_id)}</strong></td>
                <td>{c.client_nom || 'N/A'}<br /><small className="text-muted">{c.client_email}</small></td>
                <td className="d-none d-md-table-cell">{formatDateHeure(c.date_creation)}</td>
                <td className="text-end"><strong>{f0(c.total)} FCFA</strong></td><td className="text-end"><span className="text-info fw-bold">{f0(c.commission_admin)} FCFA</span></td>
                <td className="text-center"><StatutBadge statut={c.statut} /></td></tr>))}</tbody></table></div>
      </div>
    </div>
  );
}
