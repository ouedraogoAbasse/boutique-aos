import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api.js';
import { Spinner } from '../components/guards.jsx';
import ProductCard, { useAddToCart } from '../components/ProductCard.jsx';
import Flash from '../components/Flash.jsx';

const TYPES = [['informatique', 'Informatique'], ['vetement', 'Vêtements'], ['chaussure', 'Chaussures'], ['Telephone', 'Telephone'], ['Accessoire', 'Accessoires']];

export default function ProductsPage() {
  const [sp, setSp] = useSearchParams();
  const f = { type: sp.get('type') || '', categorie: sp.get('categorie') || '', marque: sp.get('marque') || '', promo: sp.get('promo') || '', nouveau: sp.get('nouveau') || '', recherche: sp.get('recherche') || '' };
  const [recherche, setRecherche] = useState(f.recherche);
  const [data, setData] = useState(null);
  const [flash, setFlash] = useState(null);
  const add = useAddToCart(setFlash);
  const key = sp.toString();

  useEffect(() => { setRecherche(f.recherche); setData(null); api.get('/produits', f).then(setData).catch((e) => setFlash({ type: 'danger', text: e.message })); /* eslint-disable-next-line */ }, [key]);

  const maj = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n); };
  const submit = (e) => { e.preventDefault(); maj('recherche', recherche.trim()); };
  const titre = f.type === 'informatique' ? <><i className="bi bi-laptop"></i> Produits Informatiques</>
    : f.type === 'vetement' ? <><i className="bi bi-bag"></i> Vêtements</>
    : f.promo ? <><i className="bi bi-tag"></i> Produits en Promotion</>
    : f.nouveau ? <><i className="bi bi-stars"></i> Nouveautés</> : <><i className="bi bi-grid"></i> Tous nos Produits</>;

  return (
    <>
      <div className="page-header"><div className="container"><h1>{titre}</h1></div></div>
      <div className="container mb-5">
        <div className="filters-card">
          <form onSubmit={submit}>
            <div className="row g-3">
              <div className="col-12 col-lg-4">
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0"><i className="bi bi-search"></i></span>
                  <input type="text" className="form-control border-start-0" placeholder="Rechercher un produit..." value={recherche} onChange={(e) => setRecherche(e.target.value)} />
                </div>
              </div>
              <div className="col-6 col-md-4 col-lg-2">
                <select className="form-select" value={f.type} onChange={(e) => maj('type', e.target.value)}>
                  <option value="">Tous les types</option>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="col-6 col-md-4 col-lg-2">
                <select className="form-select" value={f.categorie} onChange={(e) => maj('categorie', e.target.value)}>
                  <option value="">Catégories</option>{data?.categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div className="col-6 col-md-4 col-lg-2">
                <select className="form-select" value={f.marque} onChange={(e) => maj('marque', e.target.value)}>
                  <option value="">Marques</option>{data?.marques.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="col-6 col-md-8 col-lg-2">
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary flex-grow-1"><i className="bi bi-funnel"></i> Filtrer</button>
                  <Link to="/produits" className="btn btn-outline-secondary"><i className="bi bi-x-circle"></i></Link>
                </div>
              </div>
            </div>
          </form>
        </div>
        <Flash flash={flash} onClose={() => setFlash(null)} />
        {!data ? <Spinner /> : (
          <>
            <div className="results-info d-flex justify-content-between align-items-center">
              <span className="text-muted"><i className="bi bi-bag-check"></i> <strong>{data.produits.length}</strong> produit(s) trouvé(s)</span>
              {(f.recherche || f.type || f.categorie || f.marque) && <Link to="/produits" className="btn btn-sm btn-outline-danger"><i className="bi bi-x-lg"></i> Effacer les filtres</Link>}
            </div>
            {data.produits.length === 0 ? (
              <div className="empty-state">
                <i className="bi bi-inbox"></i><h3 className="text-muted mb-3">Aucun produit trouvé</h3>
                <p className="text-muted mb-4">Aucun produit ne correspond à vos critères de recherche.</p>
                <Link to="/produits" className="btn btn-primary"><i className="bi bi-arrow-left"></i> Voir tous les produits</Link>
              </div>
            ) : (
              <div className="row g-4">{data.produits.map((p) => <div key={p.id} className="col-6 col-md-4 col-lg-3"><ProductCard p={p} detailed onAdd={add} /></div>)}</div>
            )}
          </>
        )}
      </div>
    </>
  );
}
