import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { openPdf } from '../lib/api.js';
import { formatPrix, formatDateHeure, numeroPad, MODES_PAIEMENT, VEHICULES } from '../lib/utils.js';
import { Spinner } from '../components/guards.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import NotFoundPage from './NotFoundPage.jsx';
import './OrderDetailPage.css';

export default function OrderDetailPage() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [nf, setNf] = useState(false);
  useEffect(() => { api.get(`/commandes/${id}`).then(setD).catch(() => setNf(true)); }, [id]);
  if (nf) return <NotFoundPage />;
  if (!d) return <Spinner />;
  const { commande: c, details } = d;
  const paye = c.statut_paiement === 'valide';
  const date = formatDateHeure(c.date_commande).replace(' ', ' à ');

  return (
    <div className="order-detail"><div className="container my-5">
      <Link to="/mon-compte" className="back-link"><i className="bi bi-arrow-left"></i> Retour à mes commandes</Link>
      <div className="order-header-card"><div className="order-header-content">
        <div><div className="order-number"><i className="bi bi-receipt"></i> Commande #{numeroPad(c.id)}</div>
          <div className="order-date"><i className="bi bi-calendar3 me-2"></i>Commandée le {date}</div></div>
        <div className="header-actions">
          <button className="btn btn-white" onClick={() => openPdf(`/commandes/${c.id}/recu`)}><i className="bi bi-file-pdf-fill me-2"></i>Télécharger le reçu (PDF)</button>{' '}
          <button className="btn btn-white" onClick={() => window.print()}><i className="bi bi-printer-fill me-2"></i>Imprimer</button>
        </div>
      </div></div>
      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header"><h3><i className="bi bi-bag-check"></i> Articles Commandés</h3></div>
            <div className="card-body">
              {details.map((x) => (
                <div className="product-item" key={x.id}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="product-name">{x.nom}</div>
                      <div className="product-brand"><i className="bi bi-tag me-1"></i>{x.marque}</div>
                      <div className="product-quantity"><i className="bi bi-box me-1"></i>Quantité: {x.quantite}</div>
                    </div>
                    <div className="text-end"><div className="product-price mb-1">{formatPrix(x.prix_unitaire)} × {x.quantite}</div><div className="product-total">{formatPrix(x.prix_unitaire * x.quantite)}</div></div>
                  </div>
                </div>
              ))}
              <div className="total-section"><div className="total-row"><span>Total</span><span style={{ color: '#1a56c4' }}>{formatPrix(c.total)}</span></div></div>
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header"><h3><i className="bi bi-info-circle"></i> Informations</h3></div>
            <div className="card-body">
              <div className="info-item"><div className="info-label"><i className="bi bi-calendar-event"></i> Date de commande</div><div className="info-value">{date}</div></div>
              <div className="info-item"><div className="info-label"><i className="bi bi-clipboard-check"></i> Statut de la commande</div><StatusBadge statut={c.statut} large /></div>
              {c.mode_paiement && (
                <div className="payment-info-box">
                  <div className="info-label mb-2" style={{ color: '#92400e' }}><i className="bi bi-credit-card"></i> Paiement</div>
                  <div className="mb-2"><strong>Mode:</strong> {MODES_PAIEMENT[c.mode_paiement] || c.mode_paiement}</div>
                  {c.numero_paiement && <div className="mb-2"><strong>Numéro:</strong> +226 {c.numero_paiement}</div>}
                  <div><strong>Statut:</strong> <span className={`payment-status payment-${c.statut_paiement || 'en_attente'}`}><i className={`bi bi-${paye ? 'check-circle-fill' : 'clock-history'}`}></i> {paye ? 'Validé' : 'En attente'}</span></div>
                </div>
              )}
            </div>
          </div>
          {c.vendeur_nom && (
            <div className="card">
              <div className="card-header"><h3><i className="bi bi-shop"></i> Vendeur</h3></div>
              <div className="card-body"><div className="vendor-info-box">
                <div className="vendor-name">{c.vendeur_nom}</div>
                {c.boutique && <div className="vendor-detail"><i className="bi bi-shop me-1"></i>{c.boutique}</div>}
                {c.vendeur_email && <div className="vendor-detail"><i className="bi bi-envelope me-1"></i>{c.vendeur_email}</div>}
                {c.vendeur_telephone && <div className="vendor-detail"><i className="bi bi-telephone me-1"></i>{c.vendeur_telephone}</div>}
              </div></div>
            </div>
          )}
          <div className="card">
            <div className="card-header"><h3><i className="bi bi-geo-alt-fill"></i> Livraison</h3></div>
            <div className="card-body">
              <div className="delivery-box" style={{ whiteSpace: 'pre-line' }}>{c.adresse_livraison}<br /><strong>{c.code_postal} {c.ville}</strong><br />{c.pays}</div>
              {(c.statut === 'expediee' || c.statut === 'livree') && (
                <div className="tracking-box"><div className="d-flex align-items-start gap-2"><i className="bi bi-box-seam fs-4" style={{ color: '#3b82f6' }}></i><div>
                  <strong style={{ color: '#0d2a6e' }}>Numéro de suivi</strong>
                  <div className="tracking-number mt-2">BF{String(c.id).padStart(12, '0')}</div>
                  <small className="text-muted d-block mt-2"><i className="bi bi-info-circle me-1"></i>Conservez ce numéro pour suivre votre colis</small>
                </div></div></div>
              )}
              {c.livreur_nom && (
                <div className="tracking-box mt-3"><div className="d-flex align-items-center gap-3">
                  <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#1a56c4,#0d2a6e)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{c.livreur_nom[0].toUpperCase()}</div>
                  <div><strong style={{ color: '#0d2a6e' }}>Votre livreur</strong><div>{c.livreur_nom}</div>
                    <small className="text-muted"><i className="bi bi-telephone"></i> {c.livreur_telephone} &middot; <i className={`bi ${VEHICULES[c.livreur_vehicule]?.icon || 'bi-scooter'}`}></i> {VEHICULES[c.livreur_vehicule]?.label || c.livreur_vehicule}</small></div>
                </div></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div></div>
  );
}
