import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import { imageSrc, tempsEcoule } from '../lib/utils.js';
import { Spinner } from '../components/guards.jsx';
import './ConversationsPage.css';

export default function ConversationsPage() {
  const [d, setD] = useState(null);
  const [erreur, setErreur] = useState('');
  useEffect(() => { api.get('/conversations', { statut: 'tous' }).then(setD).catch((e) => setErreur(e.message)); }, []);
  if (erreur) return <div className="container py-5"><div className="alert alert-danger">{erreur}</div></div>;
  if (!d) return <Spinner />;
  const { conversations, nb_non_lus: n } = d;

  return (
    <div className="convs">
      <div className="page-header"><div className="container">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div><h1 className="mb-2"><i className="bi bi-chat-dots me-2"></i>Mes Conversations</h1>
            <p className="mb-0 opacity-75">Échangez avec les vendeurs avant de passer commande</p></div>
          {n > 0 && <div className="text-end"><span className="badge bg-danger" style={{ fontSize: '1rem', padding: '.5rem 1rem' }}>{n} nouveau{n > 1 ? 'x' : ''} message{n > 1 ? 's' : ''}</span></div>}
        </div>
      </div></div>
      <div className="container mb-5 pb-5">
        {conversations.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-chat-dots-fill"></i><h3 className="mb-3">Aucune conversation</h3>
            <p className="text-muted mb-4">Vous n'avez pas encore de conversations avec les vendeurs.<br />Contactez un vendeur depuis une fiche produit pour démarrer un échange.</p>
            <Link to="/produits" className="btn btn-primary btn-lg"><i className="bi bi-box-seam me-2"></i>Voir les produits</Link>
          </div>
        ) : conversations.map((c) => (
          <Link key={c.id} to={`/messages/${c.id}`} className={`conversation-card conversation-link ${c.messages_non_lus > 0 ? 'unread' : ''}`}>
            <div className="row align-items-center g-3">
              <div className="col-auto"><div className="vendor-avatar">{(c.vendeur_nom || '?')[0].toUpperCase()}</div></div>
              <div className="col">
                <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
                  <div>
                    <h5 className="mb-1">{c.vendeur_nom} {c.vendeur_boutique && <small className="text-muted">- {c.vendeur_boutique}</small>}</h5>
                    <div className="time-ago"><i className="bi bi-clock me-1"></i>{tempsEcoule(c.derniere_activite)}</div>
                  </div>
                  {c.messages_non_lus > 0 && <span className="badge-unread">{c.messages_non_lus} non lu{c.messages_non_lus > 1 ? 's' : ''}</span>}
                </div>
                <div className="mb-2"><strong className="text-primary"><i className="bi bi-envelope me-1"></i>{c.sujet}</strong></div>
                {c.produit_id && (
                  <div className="mb-2 d-flex align-items-center gap-2">
                    {c.produit_image && <img src={imageSrc(c.produit_image)} alt={c.produit_nom} className="product-thumb" />}
                    <small className="text-muted"><i className="bi bi-box me-1"></i>{c.produit_nom}</small>
                  </div>
                )}
                {c.dernier_message && <div className="last-message"><i className="bi bi-chat-text me-1"></i>{c.dernier_message}</div>}
              </div>
              <div className="col-auto"><i className="bi bi-chevron-right chevron-icon"></i></div>
            </div>
          </Link>
        ))}
      </div>
      <Link to="/produits" className="btn-new-message" title="Nouveau message"><i className="bi bi-plus-lg"></i></Link>
    </div>
  );
}
