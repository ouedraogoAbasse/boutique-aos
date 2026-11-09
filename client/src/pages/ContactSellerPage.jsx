import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../lib/api.js';
import { imageSrc } from '../lib/utils.js';
import { Spinner } from '../components/guards.jsx';
import NotFoundPage from './NotFoundPage.jsx';
import './ContactSellerPage.css';

const SUJETS = ['Question sur le produit', 'Disponibilité', 'Prix et négociation', 'Livraison', 'État du produit', 'Caractéristiques techniques', 'Autre'];

export default function ContactSellerPage() {
  const { produitId } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const [p, setP] = useState(null);
  const [nf, setNf] = useState(false);
  const [sujet, setSujet] = useState('');
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => { api.get(`/produits/${produitId}`).then((r) => setP(r.produit)).catch(() => setNf(true)); }, [produitId]);
  if (nf) return <NotFoundPage />;
  if (!p) return <Spinner />;

  async function submit(e) {
    e.preventDefault(); setEnvoi(true); setErreur('');
    try {
      const r = await api.post('/conversations', { produit_id: p.id, admin_id: sp.get('admin_id') || p.admin_id, sujet, message });
      nav(`/messages/${r.conversation_id}`);
    } catch (err) { setErreur(err.message); setEnvoi(false); }
  }

  return (
    <div className="contact">
      <div className="page-header"><div className="container">
        <h1 className="mb-2"><i className="bi bi-chat-dots me-2"></i>Contacter le vendeur</h1>
        <p className="mb-0 opacity-75">Posez vos questions avant de passer commande</p>
      </div></div>
      <div className="container mb-5"><div className="row"><div className="col-lg-8 mx-auto">
        {erreur && <div className="alert alert-danger"><i className="bi bi-exclamation-triangle me-2"></i>{erreur}</div>}
        <div className="product-preview"><div className="d-flex align-items-center gap-3">
          {p.image && <img src={imageSrc(p)} alt={p.nom} className="product-image" />}
          <div><small className="text-muted">Produit concerné :</small><h5 className="mb-0">{p.nom}</h5>
            <div className="text-primary fw-bold">{new Intl.NumberFormat('fr-FR').format(Math.round(p.prix))} FCFA</div></div>
        </div></div>
        <div className="vendor-info"><div className="d-flex align-items-center gap-3">
          <div className="vendor-avatar">{(p.vendeur_nom || '?')[0].toUpperCase()}</div>
          <div><small className="text-muted">Vous allez contacter :</small><h5 className="mb-0">{p.vendeur_nom}</h5>
            {p.vendeur_boutique && <small className="text-muted">{p.vendeur_boutique}</small>}</div>
        </div></div>
        <div className="contact-card">
          <h4 className="mb-4"><i className="bi bi-envelope me-2"></i>Votre message</h4>
          <form onSubmit={submit}>
            <div className="mb-4"><label htmlFor="sujet" className="form-label"><i className="bi bi-bookmark me-1"></i>Sujet</label>
              <select className="form-select" id="sujet" required value={sujet} onChange={(e) => setSujet(e.target.value)}>
                <option value="">Choisissez un sujet...</option>{SUJETS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select></div>
            <div className="mb-4"><label htmlFor="message" className="form-label"><i className="bi bi-chat-text me-1"></i>Message</label>
              <textarea className="form-control" id="message" rows="6" required value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="Ex: Bonjour, est-ce que ce produit est disponible en bleu? Quel est le délai de livraison?"></textarea>
              <small className="text-muted">Soyez précis dans votre question pour obtenir une réponse rapide.</small></div>
            <div className="d-flex gap-3 justify-content-between">
              <Link to={`/produits/${p.id}`} className="btn btn-outline-secondary"><i className="bi bi-arrow-left me-2"></i>Retour au produit</Link>
              <button type="submit" className="btn btn-primary" disabled={envoi}><i className="bi bi-send me-2"></i>Envoyer le message</button>
            </div>
          </form>
        </div>
        <div className="alert alert-info mt-4">
          <h6 className="mb-2"><i className="bi bi-lightbulb me-2"></i>Conseils pour une réponse rapide</h6>
          <ul className="mb-0 ps-4"><li>Soyez précis dans vos questions</li><li>Mentionnez les détails importants (couleur, taille, etc.)</li><li>Indiquez votre localisation si la livraison vous concerne</li><li>Soyez courtois et professionnel</li></ul>
        </div>
      </div></div></div>
    </div>
  );
}
