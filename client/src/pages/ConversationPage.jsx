import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { imageSrc, parseDate } from '../lib/utils.js';
import { Spinner } from '../components/guards.jsx';
import NotFoundPage from './NotFoundPage.jsx';
import './ConversationPage.css';

const p2 = (n) => String(n).padStart(2, '0');
const jourCle = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
function labelJour(d) {
  const t = new Date(); const h = new Date(); h.setDate(t.getDate() - 1);
  if (jourCle(d) === jourCle(t)) return "Aujourd'hui";
  if (jourCle(d) === jourCle(h)) return 'Hier';
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Fil de messages partagé (client). */
export default function ConversationPage() {
  const { id } = useParams();
  const { refresh } = useAuth();
  const [d, setD] = useState(null);
  const [nf, setNf] = useState(false);
  const [texte, setTexte] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const bas = useRef(null);

  useEffect(() => {
    api.get(`/conversations/${id}`).then((r) => { setD(r); refresh?.(); }).catch(() => setNf(true));
  }, [id]);
  useEffect(() => { bas.current?.scrollIntoView(); }, [d?.messages?.length]);

  async function envoyer(e) {
    e.preventDefault();
    if (!texte.trim()) return;
    setEnvoi(true); setErreur('');
    try {
      const r = await api.post(`/conversations/${id}/messages`, { message: texte });
      setD((x) => ({ ...x, messages: r.messages })); setTexte('');
    } catch (err) { setErreur(err.message); } finally { setEnvoi(false); }
  }

  if (nf) return <NotFoundPage />;
  if (!d) return <Spinner />;
  const { conversation: c, messages } = d;
  let courant = '';

  return (
    <div className="conv"><div className="chat-container">
      <div className="chat-header"><div className="container"><div className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-3">
          <Link to="/messages" className="text-primary"><i className="bi bi-arrow-left" style={{ fontSize: '1.5rem' }}></i></Link>
          <div className="vendor-avatar">{(c.vendeur_nom || '?')[0].toUpperCase()}</div>
          <div><h5 className="mb-0">{c.vendeur_nom}</h5>{c.boutique_nom && <small className="text-muted">{c.boutique_nom}</small>}</div>
        </div>
        {c.vendeur_email && <a href={`mailto:${c.vendeur_email}`} className="btn btn-sm btn-outline-primary"><i className="bi bi-envelope"></i></a>}
      </div></div></div>

      <div className="chat-messages"><div className="container">
        {c.produit_id && (
          <div className="product-info"><div className="d-flex align-items-center gap-3">
            {c.produit_image && <img src={imageSrc(c.produit_image)} alt={c.produit_nom} className="product-thumb" />}
            <div><strong>Produit concerné :</strong><br /><Link to={`/produits/${c.produit_id}`} className="text-primary">{c.produit_nom}</Link></div>
          </div></div>
        )}
        {messages.map((m) => {
          const dt = parseDate(m.date_envoi); const cle = jourCle(dt); const nouveau = cle !== courant; courant = cle;
          return (
            <div key={m.id}>
              {nouveau && <div className="date-divider"><span>{labelJour(dt)}</span></div>}
              <div className={`message ${m.expediteur_type}`}>
                <div className="message-avatar">{(m.expediteur_nom || '?')[0].toUpperCase()}</div>
                <div className="message-content">
                  <div className="message-bubble" style={{ whiteSpace: 'pre-line' }}>{m.message}</div>
                  <div className="message-time">{p2(dt.getHours())}:{p2(dt.getMinutes())} {m.expediteur_type === 'client' && !!m.lu && <i className="bi bi-check-all text-primary"></i>}</div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bas} />
      </div></div>

      <div className="chat-input"><div className="container">
        {erreur && <div className="alert alert-danger">{erreur}</div>}
        <form onSubmit={envoyer}><div className="input-group">
          <input type="text" className="form-control" placeholder="Écrivez votre message..." autoComplete="off" required autoFocus value={texte} onChange={(e) => setTexte(e.target.value)} />
          <button type="submit" className="btn-send" disabled={envoi}><i className="bi bi-send-fill"></i></button>
        </div></form>
      </div></div>
    </div></div>
  );
}
