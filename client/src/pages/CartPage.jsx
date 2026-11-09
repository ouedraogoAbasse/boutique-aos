import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import { formatPrix } from '../lib/utils.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner } from '../components/guards.jsx';
import Flash from '../components/Flash.jsx';
import './CartPage.css';

function Article({ a, act }) {
  return (
    <div className="cart-item-card">
      <div className="row g-3">
        <div className="col-auto">
          {a.image ? <img src={a.image_url} alt={a.nom} className="product-image" /> : <div className="image-placeholder"><i className="bi bi-image"></i></div>}
        </div>
        <div className="col">
          <div className="product-name">{a.nom} {a.promo ? <span className="promo-badge">-{a.pourcentage_promo}%</span> : null}</div>
          <div className="product-brand"><i className="bi bi-tag me-1"></i>{a.marque}</div>
          <div className="product-price">{formatPrix(a.prix_final)} {a.promo ? <span className="original-price">{formatPrix(a.prix)}</span> : null}</div>
          <div className="d-flex align-items-center justify-content-between mt-3">
            <div className="quantity-control">
              <button className="qty-btn" disabled={a.quantite <= 1} onClick={() => act('quantite', { produit_id: a.id, action: 'diminuer' })}><i className="bi bi-dash"></i></button>
              <span className="qty-value">{a.quantite}</span>
              <button className="qty-btn" disabled={a.quantite >= a.stock} onClick={() => act('quantite', { produit_id: a.id, action: 'augmenter' })}><i className="bi bi-plus"></i></button>
              <span className="text-muted ms-3 d-none d-md-inline">Sous-total: <strong>{formatPrix(a.prix_final * a.quantite)}</strong></span>
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => window.confirm('Êtes-vous sûr de vouloir retirer cet article ?') && act('supprimer', a.id)}>
              <i className="bi bi-trash"></i><span className="d-none d-md-inline ms-1">Supprimer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const { refresh } = useAuth();
  const [d, setD] = useState(null);
  const [flash, setFlash] = useState(null);

  const charger = useCallback(() => api.get('/panier').then(setD).catch((e) => setFlash({ type: 'danger', text: e.message })), []);
  useEffect(() => { charger(); }, [charger]);

  // act(type, payload) : appelle l'API correspondante puis recharge le panier et les badges du header
  const act = async (type, payload) => {
    try {
      let r;
      if (type === 'quantite') r = await api.post('/panier/quantite', payload);
      else if (type === 'supprimer') r = await api.del(`/panier/${payload}`);
      else if (type === 'garder') r = await api.post('/panier/garder-vendeur', { admin_id: payload });
      else if (type === 'retirer') r = await api.del(`/panier/vendeur/${payload}`);
      setFlash(r?.message ? { type: 'success', text: r.message } : null);
    } catch (e) { setFlash({ type: 'danger', text: e.message }); }
    await charger(); refresh();
  };

  if (!d) return <Spinner />;
  const vide = d.articles.length === 0;

  return (
    <div className="cart">
      <div className="page-header"><div className="container"><h1><i className="bi bi-cart3"></i> Mon Panier {!vide && <span className="badge bg-primary">{d.articles.length}</span>}</h1></div></div>
      <div className="container mb-5">
        <Flash flash={flash} onClose={() => setFlash(null)} />
        {vide ? (
          <div className="empty-cart">
            <div className="empty-cart-icon"><i className="bi bi-cart-x"></i></div>
            <h2 className="mb-3">Votre panier est vide</h2>
            <p className="text-muted mb-4">Découvrez nos produits et ajoutez-les à votre panier</p>
            <Link to="/produits" className="btn btn-primary"><i className="bi bi-shop me-2"></i>Découvrir nos produits</Link>
          </div>
        ) : (
          <>
            {d.plusieurs_vendeurs ? (
              <div className="multi-vendor-alert">
                <div className="row align-items-center g-3">
                  <div className="col-auto"><div className="alert-icon"><i className="bi bi-exclamation-triangle-fill"></i></div></div>
                  <div className="col">
                    <h4 className="mb-2" style={{ color: '#92400e' }}><i className="bi bi-info-circle me-2"></i>Attention : Plusieurs vendeurs détectés</h4>
                    <p className="mb-2" style={{ color: '#78350f' }}>Votre panier contient des produits de <strong>{d.groupes.length} vendeurs différents</strong>. Pour passer commande, vous devez organiser votre panier par vendeur.</p>
                    <hr style={{ borderColor: '#fbbf24' }} />
                    <p className="mb-0 small" style={{ color: '#78350f' }}><i className="bi bi-lightbulb me-1"></i><strong>Astuce :</strong> Utilisez les boutons "Commander ce vendeur" pour passer commande rapidement !</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="alert alert-success d-flex align-items-center mb-4">
                <i className="bi bi-check-circle-fill fs-3 me-3"></i>
                <div><strong>Parfait !</strong> Tous vos produits proviennent du même vendeur. Vous pouvez passer commande directement.</div>
              </div>
            )}
            <div className="row g-4">
              <div className="col-lg-8">
                {d.plusieurs_vendeurs ? d.groupes.map((g) => (
                  <div className="vendor-group-card" key={g.vendeur.id}>
                    <div className="vendor-header">
                      <div className="row align-items-center g-3">
                        <div className="col-auto"><div className="vendor-icon"><i className="bi bi-shop"></i></div></div>
                        <div className="col">
                          <div className="vendor-name">{g.vendeur.nom}</div>
                          {g.vendeur.boutique && <div className="vendor-boutique">{g.vendeur.boutique}</div>}
                          <div className="badge bg-primary mt-2">{g.produits.length} produit{g.produits.length > 1 ? 's' : ''}</div>
                        </div>
                        <div className="col-12 col-md-auto">
                          <div className="vendor-actions">
                            <button className="btn btn-success btn-sm" onClick={() => window.confirm('Garder uniquement les produits de ce vendeur et supprimer les autres ?') && act('garder', g.vendeur.id)}><i className="bi bi-check-circle me-1"></i>Commander ce vendeur</button>{' '}
                            <button className="btn btn-outline-danger btn-sm" onClick={() => window.confirm('Supprimer tous les produits de ce vendeur ?') && act('retirer', g.vendeur.id)}><i className="bi bi-trash me-1"></i>Retirer ce vendeur</button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="vendor-body">{g.produits.map((a) => <Article key={a.id} a={a} act={act} />)}</div>
                    <div className="vendor-footer"><strong>Total pour ce vendeur</strong><div className="vendor-total">{formatPrix(g.total)}</div></div>
                  </div>
                )) : d.articles.map((a) => <Article key={a.id} a={a} act={act} />)}
              </div>
              <div className="col-lg-4">
                <div className="summary-card">
                  <h4 className="mb-3 fw-bold"><i className="bi bi-receipt me-2"></i>Récapitulatif</h4>
                  {d.plusieurs_vendeurs && <div className="alert alert-warning border-0 mb-3"><small><i className="bi bi-exclamation-triangle me-1"></i>Plusieurs vendeurs : organisez votre panier pour commander</small></div>}
                  <div className="summary-row"><span>Sous-total</span><span className="fw-semibold">{formatPrix(d.total)}</span></div>
                  <div className="summary-row"><span>Frais de livraison</span><span className="fw-semibold" style={{ color: d.frais_livraison ? '#64748b' : '#10b981' }}>{d.frais_livraison ? formatPrix(d.frais_livraison) : 'GRATUIT'}</span></div>
                  {d.frais_livraison > 0 ? (
                    <div className="free-shipping-alert"><div className="d-flex align-items-start gap-2"><i className="bi bi-truck" style={{ color: '#f59e0b' }}></i><div><strong>Frais de livraison : {formatPrix(d.frais_livraison)}</strong><div className="small">Votre commande atteint 4 000 FCFA</div></div></div></div>
                  ) : <div className="alert alert-success border-0"><i className="bi bi-check-circle-fill me-2"></i>Vous bénéficiez de la livraison gratuite !</div>}
                  <div className="summary-row summary-total"><span>Total</span><span style={{ color: '#1a56c4' }}>{formatPrix(d.total_final)}</span></div>
                  {d.plusieurs_vendeurs ? (
                    <>
                      <button className="btn btn-warning w-100 mt-3" disabled><i className="bi bi-exclamation-triangle me-2"></i>Organisez votre panier d'abord</button>
                      <p className="text-center mt-2 mb-0 small text-muted">Gardez les produits d'un seul vendeur pour continuer</p>
                    </>
                  ) : <Link to="/commander" className="btn btn-primary w-100 mt-3"><i className="bi bi-credit-card me-2"></i>Procéder au paiement</Link>}
                  <Link to="/produits" className="btn btn-outline-secondary w-100 mt-2"><i className="bi bi-arrow-left me-2"></i>Continuer mes achats</Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
