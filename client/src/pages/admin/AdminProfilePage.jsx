import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api.js';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { formatDate, imageSrc, numeroPad } from '../../lib/utils.js';
import { Spinner } from '../../components/guards.jsx';
import { STATUTS_LISTE } from '../../components/admin/StatutBadge.jsx';
import './AdminProfilePage.css';

const f0 = (n) => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const f2 = (n) => Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const COULEURS = { en_attente: '#f59e0b', en_preparation: '#64748b', confirmee: '#10b981', expediee: '#0ea5e9', livree: '#1a56c4', annulee: '#ef4444' };
const LABELS = Object.fromEntries(STATUTS_LISTE);

function Tendance({ v }) {
  if (!v) return null;
  return <div className={`tendance ${v > 0 ? 'up' : 'down'}`}><i className={`bi bi-arrow-${v > 0 ? 'up' : 'down'}`}></i> {Math.abs(Math.round(v * 10) / 10)}% vs mois dernier</div>;
}

export default function AdminProfilePage() {
  const { estSuperAdmin: sa } = useAdminAuth();
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/admin/profil').then(setD); }, []);
  if (!d) return <Spinner />;
  const { admin: a, stats: s } = d;
  const mois = [...d.stats_mensuelles].reverse();
  const maxCa = Math.max(1, ...mois.map((m) => Number(m.ca)));
  const totalStat = d.repartition_statuts.reduce((x, r) => x + Number(r.nb), 0) || 1;

  return (
    <div className="adm-profile"><div className="container-fluid">
      <div className="profile-header"><div className="row align-items-center">
        <div className="col-auto"><div className="profile-avatar">{a.nom.slice(0, 2).toUpperCase()}</div></div>
        <div className="col"><h2 className="mb-1">{a.nom}</h2><h4 className="mb-2"><i className="bi bi-shop"></i> {a.boutique}</h4>
          <p className="mb-0"><i className="bi bi-envelope"></i> {a.email}{a.telephone && <> | <i className="bi bi-telephone"></i> {a.telephone}</>}</p>
          {!sa && <p className="mb-0 mt-2"><span className="badge bg-light text-dark"><i className="bi bi-percent"></i> Commission: {a.commission}%</span></p>}</div>
      </div></div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-lg-3"><div className="stat-card primary"><h6>Produits en ligne</h6><div className="number">{s.nb_produits}</div></div></div>
        <div className="col-12 col-sm-6 col-lg-3"><div className="stat-card success"><h6>Commandes totales</h6><div className="number">{s.nb_commandes}</div><Tendance v={d.tendance_commandes} /></div></div>
        <div className="col-12 col-sm-6 col-lg-3"><div className="stat-card warning"><h6>Chiffre d'affaires</h6><div className="number">{f0(s.chiffre_affaires)}FCFA</div><Tendance v={d.tendance_ca} /></div></div>
        <div className="col-12 col-sm-6 col-lg-3"><div className="stat-card danger"><h6>Commissions gagnées</h6><div className="number">{f0(s.total_commissions)}FCFA</div><small className="text-muted">Ce mois: {f0(d.stats_mois?.commissions)}FCFA</small></div></div>
      </div>

      <div className="row">
        <div className="col-lg-8 mb-4">
          <div className="card-custom"><h4 className="mb-4"><i className="bi bi-graph-up text-primary"></i> Évolution des ventes (12 derniers mois)</h4>
            {mois.length === 0 ? <p className="text-muted text-center py-4">Aucune vente</p> : (
              <div className="d-flex align-items-end gap-2" style={{ height: 240 }}>{mois.map((m) => (
                <div key={m.mois} className="flex-fill text-center" title={`${m.mois} : ${f0(m.ca)} FCFA`}>
                  <small className="d-block text-primary fw-bold" style={{ fontSize: '.65rem' }}>{f0(m.ca)}</small>
                  <div style={{ height: `${(Number(m.ca) / maxCa) * 170}px`, minHeight: 2, background: 'linear-gradient(180deg,#3b82f6,#1a56c4)', borderRadius: '6px 6px 0 0' }}></div>
                  <small className="text-muted" style={{ fontSize: '.65rem' }}>{m.mois}</small></div>))}</div>)}
          </div>
          <div className="card-custom"><h4 className="mb-3"><i className="bi bi-trophy text-warning"></i> Top 5 des produits</h4>
            {d.top_produits.length === 0 && <p className="text-muted">Aucune vente pour le moment</p>}
            {d.top_produits.map((p, i) => (
              <div className="product-mini" key={p.id}><div className="badge bg-primary me-2">#{i + 1}</div>
                {p.image ? <img src={imageSrc(p.image)} alt={p.nom} /> : <div style={{ width: 50, height: 50, background: '#ddd', borderRadius: 5, marginRight: '1rem' }}></div>}
                <div className="flex-grow-1"><strong>{p.nom}</strong><div className="text-muted small">{p.quantite_totale} vendus | CA: {f2(p.ca_total)}FCFA</div></div></div>))}
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card-custom"><h5 className="mb-3"><i className="bi bi-pie-chart text-info"></i> Commandes par statut</h5>
            {d.repartition_statuts.length === 0 ? <p className="text-muted">Aucune commande</p> : d.repartition_statuts.map((r) => (
              <div className="mb-2" key={r.statut}><div className="d-flex justify-content-between small"><span>{LABELS[r.statut] || r.statut}</span><strong>{r.nb}</strong></div>
                <div className="progress" style={{ height: 8 }}><div className="progress-bar" style={{ width: `${(r.nb / totalStat) * 100}%`, background: COULEURS[r.statut] || '#94a3b8' }}></div></div></div>))}
          </div>
          {d.stock_faible.length > 0 && (
            <div className="card-custom alert-stock"><h5 className="mb-3"><i className="bi bi-exclamation-triangle text-warning"></i> Alerte Stock</h5>
              {d.stock_faible.map((p) => <div key={p.id} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded"><div><strong>{p.nom}</strong><div className="text-muted small">Stock: {p.stock}</div></div><span className="badge bg-warning"><i className="bi bi-box"></i> {p.stock}</span></div>)}
              <Link to="/admin/produits" className="btn btn-sm btn-warning w-100 mt-2"><i className="bi bi-arrow-right"></i> Gérer le stock</Link></div>)}
          <div className="card-custom"><h5 className="mb-3"><i className="bi bi-clock-history text-success"></i> Dernières commandes</h5>
            {d.dernieres_commandes.map((c) => (
              <div key={c.id} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded"><div><strong>#{numeroPad(c.commande_id ?? c.id)}</strong><div className="text-muted small">{formatDate(c.date_commande)}</div></div>
                <div className="text-end"><strong>{f2(c.total)}FCFA</strong><div><span className={`badge bg-${c.statut === 'livree' ? 'success' : c.statut === 'en_attente' ? 'warning' : 'info'}`}>{(LABELS[c.statut] || c.statut)}</span></div></div></div>))}
            <Link to="/admin/commandes" className="btn btn-sm btn-primary w-100 mt-2"><i className="bi bi-arrow-right"></i> Voir toutes les commandes</Link></div>
        </div>
      </div>
    </div></div>
  );
}
