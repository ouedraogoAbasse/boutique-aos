import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import { Spinner } from '../components/guards.jsx';
import ProductCard, { useAddToCart } from '../components/ProductCard.jsx';
import Flash from '../components/Flash.jsx';

const CATS = [
  { to: '/produits?type=informatique', icon: '💻', titre: 'Informatique', txt: 'Ordinateurs, composants et périphériques' },
  { to: '/produits?type=vetement', icon: '👕', titre: 'Vêtements', txt: 'Mode de toutes les grandes marques' },
  { to: '/produits?promo=1', icon: '🏷️', titre: 'Promotions', txt: 'Nos meilleures offres du moment' },
  { to: '/produits?nouveau=1', icon: '✨', titre: 'Nouveautés', txt: 'Derniers produits ajoutés' },
];

export default function HomePage() {
  const [data, setData] = useState(null);
  const [flash, setFlash] = useState(null);
  const add = useAddToCart(setFlash);
  useEffect(() => { api.get('/home').then(setData).catch((e) => setFlash({ type: 'danger', text: e.message })); }, []);
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1><i className="bi bi-stars"></i> Bienvenue sur AOS MULTI-SERVICE International</h1>
          <p>Votre destination pour l'informatique de pointe et la mode de grandes marques</p>
          <Link to="/produits" className="btn btn-gold btn-lg px-5 py-3"><i className="bi bi-grid-3x3-gap"></i> Découvrir nos produits</Link>
        </div>
      </section>
      <section className="py-5 bg-light">
        <div className="container">
          <div className="text-center mb-5"><h2 className="fw-bold display-6">Nos Catégories</h2><p className="text-muted">Explorez notre sélection par catégorie</p></div>
          <div className="row g-4">
            {CATS.map((c) => (
              <div key={c.to} className="col-6 col-md-6 col-lg-3">
                <Link to={c.to} className="category-card"><div className="category-icon">{c.icon}</div><h3>{c.titre}</h3><p>{c.txt}</p></Link>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-5">
        <div className="container">
          <div className="text-center mb-5"><h2 className="fw-bold display-6">Produits en Vedette</h2><p className="text-muted">Découvrez notre sélection de produits populaires</p></div>
          <Flash flash={flash} onClose={() => setFlash(null)} />
          {!data ? <Spinner /> : (
            <div className="row g-4">
              {data.produits.map((p) => <div key={p.id} className="col-6 col-md-4 col-lg-3"><ProductCard p={p} onAdd={add} /></div>)}
            </div>
          )}
          <div className="text-center mt-5"><Link to="/produits" className="btn btn-primary btn-lg px-5"><i className="bi bi-grid"></i> Voir tous les produits</Link></div>
        </div>
      </section>
    </>
  );
}
