import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import { VEHICULES } from '../lib/utils.js';
import './DeliveryPage.css';

const ZONES = [
  ['Ouagadougou (centre-ville)', '24h', '2 000 FCFA'], ['Ouagadougou (périphérie)', '24 à 48h', '3 000 FCFA'], ['Autres grandes villes', '48 à 72h', '5 000 FCFA'],
];
const ETAPES = [
  ['bi-cart-check', '1. Commandez', 'Ajoutez vos articles au panier et validez votre commande.'],
  ['bi-gear', '2. Préparation', 'Le vendeur prépare votre commande et la confie à un livreur.'],
  ['bi-truck', '3. En route', "Votre colis est acheminé vers l'adresse indiquée."],
  ['bi-house-check', '4. Réception', 'Vous réceptionnez et payez à la livraison ou en ligne.'],
];

export default function DeliveryPage() {
  const [livreurs, setLivreurs] = useState([]);
  useEffect(() => { api.get('/livreurs').then((r) => setLivreurs(Array.isArray(r) ? r : [])).catch(() => {}); }, []);
  return (
    <div className="delivery">
      <div className="page-header text-center"><div className="container">
        <h1 className="display-6"><i className="bi bi-truck"></i> Livraison</h1><p className="lead mb-0">Rapide, fiable et disponible partout où vous êtes.</p>
      </div></div>
      <div className="container mb-5">
        <div className="row g-4 mb-5">
          <div className="col-md-4"><div className="info-card gold"><div className="icon"><i className="bi bi-box-seam"></i></div><h5 className="fw-bold">Livraison gratuite</h5>
            <p className="text-muted mb-0">Offerte pour toute commande supérieure à <strong>50 000 FCFA</strong>, partout où nous livrons.</p></div></div>
          <div className="col-md-4"><div className="info-card"><div className="icon"><i className="bi bi-clock-history"></i></div><h5 className="fw-bold">Délais rapides</h5>
            <p className="text-muted mb-0">Livraison en 24h à Ouagadougou et 48 à 72h pour les autres villes du pays.</p></div></div>
          <div className="col-md-4"><div className="info-card"><div className="icon"><i className="bi bi-shield-check"></i></div><h5 className="fw-bold">Suivi sécurisé</h5>
            <p className="text-muted mb-0">Chaque commande est confiée à un livreur identifié et vous pouvez suivre son statut depuis votre compte.</p></div></div>
        </div>
        <h3 className="fw-bold mb-3"><i className="bi bi-geo-alt text-primary"></i> Zones et tarifs de livraison</h3>
        <div className="table-responsive zone-table mb-5"><table className="table mb-0">
          <thead><tr><th>Zone</th><th>Délai estimé</th><th>Frais de livraison</th></tr></thead>
          <tbody>
            {ZONES.map(([z, d, f]) => <tr key={z}><td><i className="bi bi-pin-map text-primary"></i> {z}</td><td>{d}</td><td>{f}</td></tr>)}
            <tr><td><i className="bi bi-gift text-warning"></i> Toute commande &ge; 50 000 FCFA</td><td>Selon la zone</td><td><strong className="text-success">Gratuit</strong></td></tr>
          </tbody></table></div>
        {livreurs.length > 0 && (<>
          <h3 className="fw-bold mb-3"><i className="bi bi-people text-primary"></i> Notre équipe de livreurs</h3>
          <div className="row g-3 mb-5">{livreurs.map((l, i) => (
            <div className="col-md-6" key={i}><div className="livreur-item">
              <div className="livreur-avatar">{l.nom[0].toUpperCase()}</div>
              <div><strong>{l.nom}</strong><div className="text-muted small"><i className={`bi ${VEHICULES[l.vehicule]?.icon || 'bi-scooter'}`}></i> {l.vehicule ? l.vehicule[0].toUpperCase() + l.vehicule.slice(1) : ''}{l.zone_livraison && <> &middot; {l.zone_livraison}</>}</div></div>
            </div></div>))}</div>
        </>)}
        <h3 className="fw-bold mb-3"><i className="bi bi-list-check text-primary"></i> Comment ça marche</h3>
        <div className="row g-4 mb-4">{ETAPES.map(([ic, t, tx]) => (
          <div className="col-md-3" key={t}><div className="info-card text-center"><div className="icon mx-auto"><i className={`bi ${ic}`}></i></div><h6 className="fw-bold">{t}</h6><p className="text-muted small mb-0">{tx}</p></div></div>))}</div>
        <div className="cta-band"><h4 className="fw-bold mb-2">Une question sur votre livraison ?</h4>
          <p className="mb-4 opacity-90">Notre service client est disponible pour vous accompagner à chaque étape.</p>
          <Link to="/messages" className="btn btn-gold"><i className="bi bi-chat-dots"></i> Contacter le support</Link></div>
      </div>
    </div>
  );
}
