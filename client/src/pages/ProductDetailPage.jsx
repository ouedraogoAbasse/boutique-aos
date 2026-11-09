import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../lib/api.js';
import { formatPrix } from '../lib/utils.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner } from '../components/guards.jsx';
import { useAddToCart } from '../components/ProductCard.jsx';
import Flash from '../components/Flash.jsx';
import NotFoundPage from './NotFoundPage.jsx';
import './ProductDetailPage.css';

export default function ProductDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [flash, setFlash] = useState(null);
  const add = useAddToCart(setFlash);
  useEffect(() => { setP(null); setNotFound(false); api.get(`/produits/${id}`).then((d) => setP(d.produit)).catch(() => setNotFound(true)); }, [id]);
  if (notFound) return <NotFoundPage />;
  if (!p) return <Spinner />;

  const cls = p.stock > 10 ? 'in-stock' : p.stock > 0 ? 'low-stock' : 'out-of-stock';
  const icon = p.stock > 10 ? 'bi-check-circle-fill' : p.stock > 0 ? 'bi-exclamation-circle-fill' : 'bi-x-circle-fill';
  const txt = p.stock > 10 ? 'En stock' : p.stock > 0 ? `Stock limité (${p.stock} restants)` : 'Rupture de stock';
  const contact = user ? `/contacter-vendeur/${p.id}?admin_id=${p.admin_id ?? ''}` : `/connexion?redirect=${encodeURIComponent(`/produits/${p.id}`)}`;
  const desc = p.description || '';

  return (
    <div className="pd">
      <div className="container my-5">
        <Flash flash={flash} onClose={() => setFlash(null)} />
        <div className="row g-4">
          <div className="col-lg-6">
            <div className="product-image-container">
              {p.image ? <img src={p.image_url} alt={p.nom} className="product-image" /> : (
                <div className="text-center py-5"><i className="bi bi-image" style={{ fontSize: '8rem', color: '#cbd5e1' }}></i><p className="text-muted mt-3">Image non disponible</p></div>
              )}
            </div>
          </div>
          <div className="col-lg-6">
            <div className="product-info-card">
              <h1 className="product-title">{p.nom}</h1>
              <div className="product-brand"><i className="bi bi-tag me-2"></i>{p.marque}</div>
              {p.promo ? <div className="promo-badge"><i className="bi bi-percent me-2"></i>Promotion -{p.pourcentage_promo}% !</div> : null}
              <div className="mb-4">
                <span className="product-price">{formatPrix(p.prix_final)}</span>
                {p.promo ? <span className="original-price">{formatPrix(p.prix)}</span> : null}
              </div>
              <div className={`stock-badge ${cls}`}><i className={`bi ${icon} me-2`}></i>{txt}</div>
              {desc && <div className="mb-4"><p className="text-muted" style={{ whiteSpace: 'pre-line' }}>{desc.slice(0, 200)}{desc.length > 200 ? '...' : ''}</p></div>}
              <div className="d-flex gap-2 flex-wrap mb-4">
                {p.stock > 0
                  ? <button className="btn btn-primary flex-fill" onClick={() => add(p.id)}><i className="bi bi-cart-plus"></i> Ajouter au panier</button>
                  : <button className="btn btn-secondary flex-fill" disabled><i className="bi bi-x-circle me-2"></i>Rupture de stock</button>}
                <Link to={contact} className="btn btn-outline-primary flex-fill" title={user ? '' : 'Connectez-vous pour contacter le vendeur'}>
                  <i className="bi bi-chat-dots me-2"></i>Contacter le vendeur
                </Link>
              </div>
              <div className="contact-banner">
                <h5><i className="bi bi-chat-heart-fill me-2"></i>Une question ? Besoin d'aide ?</h5>
                <p className="mb-0">Contactez directement le vendeur pour obtenir plus d'informations, vérifier la disponibilité en temps réel ou discuter du prix.</p>
              </div>
            </div>
            {p.vendeur_nom && (
              <div className="vendor-card">
                <div className="d-flex align-items-start gap-3">
                  <div className="vendor-avatar">{p.vendeur_nom.charAt(0).toUpperCase()}</div>
                  <div className="flex-grow-1">
                    <div className="vendor-name">{p.vendeur_nom}</div>
                    {p.vendeur_boutique && <div className="vendor-boutique"><i className="bi bi-shop me-1"></i>{p.vendeur_boutique}</div>}
                    <p className="text-muted small mb-3">Vendeur de ce produit</p>
                    <div className="d-flex gap-2 flex-wrap">
                      {user ? (
                        <>
                          <Link to={contact} className="btn btn-primary btn-sm"><i className="bi bi-chat-dots me-1"></i>Envoyer un message</Link>
                          {p.vendeur_tel && <a href={`tel:${p.vendeur_tel}`} className="btn btn-outline-secondary btn-sm"><i className="bi bi-telephone me-1"></i>Appeler</a>}
                          {p.vendeur_email && <a href={`mailto:${p.vendeur_email}`} className="btn btn-outline-secondary btn-sm"><i className="bi bi-envelope me-1"></i>Email</a>}
                        </>
                      ) : <Link to={contact} className="btn btn-primary btn-sm"><i className="bi bi-chat-dots me-1"></i>Connectez-vous pour contacter</Link>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {desc && (
          <div className="description-card">
            <h2 className="description-title"><i className="bi bi-info-circle me-2"></i>Description</h2>
            <div className="text-muted" style={{ lineHeight: 1.8, whiteSpace: 'pre-line' }}>{desc}</div>
          </div>
        )}
      </div>
    </div>
  );
}
