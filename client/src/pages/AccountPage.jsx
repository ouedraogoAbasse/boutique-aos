import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate, formatDateHeure, numeroPad } from '../lib/utils.js';
import { Spinner } from '../components/guards.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import './AccountPage.css';

export default function AccountPage() {
  const { user: u } = useAuth();
  const [commandes, setCommandes] = useState(null);
  const [erreur, setErreur] = useState('');
  useEffect(() => { api.get('/commandes').then(setCommandes).catch((e) => setErreur(e.message)); }, []);

  return (
    <div className="account">
      <div className="page-header"><div className="container"><h1><i className="bi bi-person-circle"></i> Mon Compte</h1></div></div>
      <div className="container mb-5">
        <div className="row g-4">
          <div className="col-lg-4">
            <div className="profile-card">
              <div className="profile-avatar">{(u.prenom[0] + u.nom[0]).toUpperCase()}</div>
              <div className="profile-name">{u.prenom} {u.nom}</div>
              <div className="profile-email"><i className="bi bi-envelope me-1"></i>{u.email}</div>
              <div className="profile-info-item"><div className="info-label"><i className="bi bi-telephone"></i> Téléphone</div><div className="info-value">{u.telephone || 'Non renseigné'}</div></div>
              <div className="profile-info-item"><div className="info-label"><i className="bi bi-geo-alt"></i> Adresse</div>
                <div className="info-value">{u.adresse ? <>{u.adresse}<br /><small className="text-muted">{u.code_postal} {u.ville}<br />{u.pays}</small></> : 'Non renseignée'}</div></div>
              <div className="profile-info-item"><div className="info-label"><i className="bi bi-calendar-check"></i> Membre depuis</div><div className="info-value">{formatDate(u.date_inscription)}</div></div>
            </div>
          </div>
          <div className="col-lg-8">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="fw-bold mb-0"><i className="bi bi-box-seam me-2"></i>Mes Commandes</h2>
              {commandes?.length > 0 && <span className="badge bg-primary">{commandes.length} commande(s)</span>}
            </div>
            {erreur && <div className="alert alert-danger">{erreur}</div>}
            {!commandes ? <Spinner /> : commandes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><i className="bi bi-inbox"></i></div><h3 className="mb-3">Aucune commande</h3>
                <p className="text-muted mb-4">Vous n'avez pas encore passé de commande</p>
                <Link to="/produits" className="btn btn-primary"><i className="bi bi-shop me-2"></i>Découvrir nos produits</Link>
              </div>
            ) : commandes.map((c) => (
              <div className="order-card" key={c.id}>
                <div className="order-header">
                  <div><div className="order-number"><i className="bi bi-receipt me-2"></i>Commande #{numeroPad(c.id)}</div>
                    <div className="order-date"><i className="bi bi-calendar3 me-1"></i>{formatDateHeure(c.date_commande).replace(' ', ' à ')}</div></div>
                  <div><StatusBadge statut={c.statut} /></div>
                </div>
                <div className="order-details">
                  <div className="order-detail-item"><span className="detail-label"><i className="bi bi-box me-1"></i>Articles</span><span className="detail-value">{c.nb_articles} produit(s)</span></div>
                  <div className="order-detail-item"><span className="detail-label"><i className="bi bi-currency-fr me-1"></i>Montant total</span><span className="detail-value order-price">{Number(c.total).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA</span></div>
                </div>
                <div className="order-address">
                  <div className="address-label"><i className="bi bi-geo-alt-fill me-2"></i>Adresse de livraison</div>
                  <div className="address-text">{c.adresse_livraison}, {c.code_postal} {c.ville}, {c.pays}</div>
                  {c.livreur_nom && <div className="address-text mt-2"><i className="bi bi-scooter me-1" style={{ color: '#1a56c4' }}></i>Livreur assigné : <strong>{c.livreur_nom}</strong> <a href={`tel:${c.livreur_telephone}`} className="text-decoration-none">({c.livreur_telephone})</a></div>}
                </div>
                <Link to={`/commandes/${c.id}`} className="btn btn-outline-secondary w-100"><i className="bi bi-eye me-2"></i>Voir les détails</Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
