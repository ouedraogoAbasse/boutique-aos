import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../lib/api.js';
import { formatPrix } from '../lib/utils.js';

const ICONS = { Ordinateurs: '💻', 'Composants PC': '🔧', 'Périphériques': '⌨️', Accessoires: '🎧', 'T-Shirts': '👕', Pantalons: '👖', Chaussures: '👟', Vestes: '🧥' };
export const iconeCategorie = (nom) => ICONS[nom] ?? '📦';

/** Hook « ajouter-au-panier.php » : redirige vers la connexion si besoin, sinon appelle l'API */
export function useAddToCart(onResult) {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  return async (produitId) => {
    if (!user) return navigate(`/connexion?redirect=${encodeURIComponent(loc.pathname + loc.search)}`);
    try {
      const d = await api.post('/panier/ajouter', { produit_id: produitId });
      onResult?.({ type: 'success', text: d.message });
      refresh();
    } catch (e) { onResult?.({ type: 'danger', text: e.message }); }
  };
}

export default function ProductCard({ p, detailed = false, onAdd }) {
  const { user } = useAuth();
  const dispo = p.stock > 0;
  return (
    <div className="card product-card">
      {p.nouveau ? <div className="product-badge nouveau">NOUVEAU</div> : p.promo ? <div className="product-badge">-{p.pourcentage_promo}%</div> : null}
      <Link to={`/produits/${p.id}`} className="product-image text-decoration-none">
        {p.image ? <img src={p.image_url} alt={p.nom} loading="lazy" /> : iconeCategorie(p.categorie_nom)}
      </Link>
      <div className={`card-body ${detailed ? 'd-flex flex-column' : ''}`}>
        <p className="product-marque mb-1">{p.marque}</p>
        <h6 className="product-name"><Link to={`/produits/${p.id}`} className="text-reset">{p.nom}</Link></h6>
        <div className="product-price mb-2">
          {formatPrix(p.prix_final)}
          {p.promo ? <span className="old-price">{formatPrix(p.prix)}</span> : null}
        </div>
        <p className={`small mb-3 ${dispo ? 'text-success' : 'text-danger'}`}>
          <i className={`bi ${dispo ? 'bi-check-circle' : 'bi-x-circle'}`}></i> {dispo ? `En stock (${p.stock})` : 'Rupture de stock'}
        </p>
        <div className={`d-flex flex-column gap-2 ${detailed ? 'mt-auto' : ''}`}>
          {dispo
            ? <button className="btn btn-primary w-100 btn-sm" onClick={() => onAdd(p.id)}><i className="bi bi-cart-plus"></i> Ajouter au panier</button>
            : <button className="btn btn-secondary w-100 btn-sm" disabled><i className="bi bi-x-circle"></i> Indisponible</button>}
          {detailed && (
            <>
              {p.admin_id && (
                <Link to={user ? `/contacter-vendeur/${p.id}?admin_id=${p.admin_id}` : `/connexion?redirect=${encodeURIComponent(`/contacter-vendeur/${p.id}`)}`}
                  className="btn btn-outline-primary btn-sm w-100" title={user ? '' : 'Connectez-vous pour contacter le vendeur'}>
                  <i className="bi bi-chat-dots"></i> Contacter
                </Link>
              )}
              <Link to={`/produits/${p.id}`} className="btn btn-outline-secondary btn-sm w-100"><i className="bi bi-eye"></i> Voir détails</Link>
            </>
          )}
        </div>
        {detailed && <div className="contact-hint mt-2"><i className="bi bi-info-circle me-1"></i> Des questions ? Contactez le vendeur !</div>}
      </div>
    </div>
  );
}
