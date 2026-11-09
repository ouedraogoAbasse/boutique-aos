import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { openPdf } from '../../lib/api.js';
import { formatDateHeure, imageSrc, numeroPad } from '../../lib/utils.js';
import { Spinner } from '../../components/guards.jsx';
import { STATUTS_LISTE } from '../../components/admin/StatutBadge.jsx';
import './AdminOrderDetailPage.css';

const f2 = (n) => Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const LABELS = Object.fromEntries(STATUTS_LISTE);

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [erreurFatale, setErreurFatale] = useState('');
  const [msg, setMsg] = useState(null);
  const [statut, setStatut] = useState('');
  const [livreur, setLivreur] = useState('');
  const charger = useCallback(() => api.get(`/admin/commandes/${id}`).then((r) => { setD(r); setStatut(r.commande.statut); setLivreur(r.commande.livreur_id ?? ''); }).catch((e) => setErreurFatale(e.message)), [id]);
  useEffect(() => { charger(); }, [charger]);
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(null), 5000); return () => clearTimeout(t); } }, [msg]);
  if (erreurFatale) return <div className="alert alert-danger">{erreurFatale} <Link to="/admin/commandes">Retour aux commandes</Link></div>;
  if (!d) return <Spinner />;
  const { commande: c, details, livreurs_actifs: lvs = [], livreur_assigne: lv, subtotal, commission_vendeur: comm, est_super_admin: sa } = d;

  async function action(fn, ok) {
    try { const r = await fn(); setMsg({ type: 'success', text: r.message || ok }); await charger(); } catch (e) { setMsg({ type: 'danger', text: e.message }); }
  }

  return (
    <div className="adm-order-detail">
      <Link to="/admin/commandes" className="text-primary text-decoration-none d-inline-block mb-3"><i className="bi bi-arrow-left me-1"></i>Retour aux commandes</Link>
      {msg && <div className={`alert alert-${msg.type} alert-dismissible`}><i className={`bi bi-${msg.type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2`}></i>{msg.text}<button type="button" className="btn-close" onClick={() => setMsg(null)}></button></div>}

      <div className="order-header-card"><div className="row align-items-center">
        <div className="col-md-8"><div className="order-number"><i className="bi bi-receipt me-2"></i>Commande #{numeroPad(c.id)}</div>
          <div className="order-date"><i className="bi bi-calendar3 me-2"></i>{formatDateHeure(c.date_commande).replace(' ', ' à ')}</div></div>
        <div className="col-md-4 text-md-end mt-3 mt-md-0"><span className={`status-badge-large badge-${c.statut}`}>{LABELS[c.statut] || c.statut}</span></div>
      </div></div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header"><h5 className="mb-0 fw-bold"><i className="bi bi-bag-check me-2"></i>{sa ? 'Produits Commandés' : 'Mes Produits dans cette Commande'}</h5></div>
            <div className="card-body">
              {details.length === 0 ? <div className="text-center py-4 text-muted"><i className="bi bi-inbox display-4 d-block mb-3"></i><p>Aucun produit trouvé{!sa && " (vous n'avez pas de produits dans cette commande)"}</p></div> : (<>
                {details.map((it) => (
                  <div className="product-item" key={it.id}>
                    {it.produit_image ? <img src={imageSrc(it.produit_image)} alt={it.produit_nom} className="product-image" /> : <div className="image-placeholder"><i className="bi bi-image"></i></div>}
                    <div className="flex-grow-1"><div className="fw-semibold mb-1">{it.produit_nom}{sa && it.vendeur_nom && <span className="vendor-badge ms-2"><i className="bi bi-shop me-1"></i>{it.vendeur_nom}</span>}</div>
                      <div className="text-muted small">Quantité: {it.quantite} × {f2(it.prix_unitaire)} FCFA</div></div>
                    <div className="text-end"><div className="fw-bold" style={{ color: 'var(--primary-color)', fontSize: '1.125rem' }}>{f2(it.quantite * it.prix_unitaire)} FCFA</div></div>
                  </div>
                ))}
                <div className="total-section">
                  <div className="total-row"><span>Sous-total{sa ? '' : ' (mes produits)'}:</span><span className="fw-semibold">{f2(subtotal)} FCFA</span></div>
                  {sa ? (<>
                    <div className="total-row"><span>Livraison:</span><span className="fw-semibold">{f2(c.total - subtotal)} FCFA</span></div>
                    <div className="total-row final"><span>Total:</span><span>{f2(c.total)} FCFA</span></div></>
                  ) : (<>
                    <div className="total-row final"><span>Ma part:</span><span style={{ color: 'var(--success-bg)' }}>{f2(subtotal)} FCFA</span></div>
                    {comm > 0 && <div className="commission-row"><div><div className="label"><i className="bi bi-cash-coin me-1"></i>Ma Commission</div><small style={{ color: '#166534', opacity: 0.8 }}>Sur le montant total de mes produits</small></div><div className="amount">{f2(comm)} FCFA</div></div>}</>)}
                </div>
              </>)}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h5 className="mb-0 fw-bold"><i className="bi bi-geo-alt me-2"></i>Adresse de Livraison</h5></div>
            <div className="card-body"><div className="fw-bold mb-2">{c.client_nom}</div>
              <div className="text-muted">{c.adresse_livraison}<br />{c.code_postal} {c.ville}<br />{c.pays}</div></div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card">
            <div className="card-header"><h5 className="mb-0 fw-bold"><i className="bi bi-info-circle me-2"></i>Informations</h5></div>
            <div className="card-body">
              <div className="info-item"><div className="info-label"><i className="bi bi-hash me-1"></i>Numéro de commande</div><div className="info-value">#{numeroPad(c.id)}</div></div>
              <div className="info-item"><div className="info-label"><i className="bi bi-calendar-event me-1"></i>Date de commande</div><div className="info-value">{formatDateHeure(c.date_commande)}</div></div>
              {c.mode_paiement && <div className="info-item"><div className="info-label"><i className="bi bi-credit-card me-1"></i>Paiement</div><div className="info-value">{c.mode_paiement.replace('_', ' ')}{c.numero_paiement && ` — +226 ${c.numero_paiement}`}</div></div>}
              <div className="info-item"><div className="info-label"><i className="bi bi-clipboard-check me-1"></i>Statut</div>
                <div className="mt-2">
                  <select className="form-select mb-2" value={statut} onChange={(e) => setStatut(e.target.value)}>{STATUTS_LISTE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                  <button className="btn btn-primary w-100" onClick={() => action(() => api.put(`/admin/commandes/${id}/statut`, { statut }), 'Statut mis à jour.')}><i className="bi bi-check-lg me-1"></i>Modifier le statut</button>
                </div></div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h5 className="mb-0 fw-bold"><i className="bi bi-scooter me-2"></i>Livraison</h5></div>
            <div className="card-body">
              {lv ? (<>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#1a56c4,#0d2a6e)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{lv.nom[0].toUpperCase()}</div>
                  <div><strong>{lv.nom}</strong><div className="text-muted small"><i className="bi bi-telephone"></i> {lv.telephone}</div></div>
                </div>
                {c.date_assignation_livreur && <div className="text-muted small mb-3"><i className="bi bi-clock"></i> Assigné le {formatDateHeure(c.date_assignation_livreur).replace(' ', ' à ')}</div>}
              </>) : <p className="text-muted small mb-3"><i className="bi bi-exclamation-circle"></i> Aucun livreur assigné à cette commande.</p>}
              {sa && (<>
                <select className="form-select mb-2" value={livreur} onChange={(e) => setLivreur(e.target.value)}>
                  <option value="">— Aucun livreur —</option>{lvs.map((l) => <option key={l.id} value={l.id}>{l.nom} — {l.telephone}</option>)}</select>
                {lvs.length === 0 && <p className="text-muted small">Aucun livreur actif. <Link to="/admin/livreurs">Ajoutez-en un</Link>.</p>}
                <button className="btn btn-outline-primary w-100" onClick={() => action(() => api.put(`/admin/commandes/${id}/livreur`, { livreur_id: livreur }), 'Livreur mis à jour.')}><i className="bi bi-truck me-1"></i>{lv ? 'Changer de livreur' : 'Assigner un livreur'}</button>
              </>)}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h5 className="mb-0 fw-bold"><i className="bi bi-person me-2"></i>Client</h5></div>
            <div className="card-body">
              <div className="info-item"><div className="info-label">Nom</div><div className="info-value">{c.client_nom}</div></div>
              <div className="info-item"><div className="info-label">Email</div><div className="info-value"><a href={`mailto:${c.client_email}`} className="text-primary text-decoration-none"><i className="bi bi-envelope me-1"></i>{c.client_email}</a></div></div>
              {c.client_tel && <div className="info-item"><div className="info-label">Téléphone</div><div className="info-value"><a href={`tel:${c.client_tel}`} className="text-primary text-decoration-none"><i className="bi bi-telephone me-1"></i>{c.client_tel}</a></div></div>}
              {sa && <div className="mt-3"><Link to={`/admin/utilisateurs/${c.utilisateur_id}`} className="btn btn-outline-secondary w-100"><i className="bi bi-person-lines-fill me-1"></i>Voir le profil complet</Link></div>}
            </div>
          </div>

          <div className="card no-print">
            <div className="card-header"><h5 className="mb-0 fw-bold"><i className="bi bi-gear me-2"></i>Actions</h5></div>
            <div className="card-body">
              <button className="btn btn-success w-100 mb-2" onClick={() => openPdf(`/admin/commandes/${id}/recu`)}><i className="bi bi-printer-fill me-2"></i>Télécharger le reçu (PDF)</button>
              <button onClick={() => window.print()} className="btn btn-primary w-100 mb-2"><i className="bi bi-printer me-2"></i>Imprimer la page</button>
              <Link to="/admin/commandes" className="btn btn-outline-secondary w-100"><i className="bi bi-arrow-left me-2"></i>Retour aux commandes</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
