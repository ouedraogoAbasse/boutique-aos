import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../lib/api.js';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { formatDateHeure, imageSrc } from '../../lib/utils.js';
import { Spinner } from '../../components/guards.jsx';
import { jourCle, labelJour, p2, parseDate } from './chatUtils.js';
import './AdminConversationPage.css';

export default function AdminConversationPage() {
  const { id } = useParams();
  const { refresh } = useAdminAuth();
  const [d, setD] = useState(null);
  const [modeles, setModeles] = useState([]);
  const [texte, setTexte] = useState('');
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState('');
  const bas = useRef(null);
  const charger = useCallback(() => api.get(`/admin/conversations/${id}`).then((r) => { setD(r); refresh(); }).catch((e) => setErr(e.message)), [id, refresh]);
  useEffect(() => { charger(); api.get('/admin/messages/modeles').then(setModeles).catch(() => {}); }, [charger]);
  useEffect(() => { bas.current?.scrollIntoView(); }, [d?.messages?.length]);
  if (err) return <div className="alert alert-danger">{err} <Link to="/admin/messagerie">Retour</Link></div>;
  if (!d) return <Spinner />;
  const { conversation: c, messages } = d;
  const ouvert = c.statut === 'ouvert';

  async function envoyer(e) {
    e.preventDefault(); setMsg(null);
    try { const r = await api.post(`/admin/conversations/${id}/messages`, { message: texte }); setD({ ...d, messages: r.messages }); setTexte(''); }
    catch (e2) { setMsg({ type: 'danger', text: e2.message }); }
  }
  async function basculer() {
    if (ouvert && !window.confirm('Voulez-vous vraiment fermer cette conversation ?')) return;
    try { await api.post(`/admin/conversations/${id}/${ouvert ? 'fermer' : 'rouvrir'}`); await charger(); } catch (e2) { setMsg({ type: 'danger', text: e2.message }); }
  }
  let courant = '';

  return (
    <div className="adm-conv"><div className="chat-container">
      <div className="chat-header"><div className="container-fluid"><div className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-3">
          <Link to="/admin/messagerie" className="text-primary"><i className="bi bi-arrow-left" style={{ fontSize: '1.5rem' }}></i></Link>
          <div className="client-avatar">{c.client_nom[0].toUpperCase()}</div>
          <div><h5 className="mb-0">{c.client_nom} {c.client_prenom || ''}</h5><small className="text-muted">{c.client_email}{c.client_telephone && <> • {c.client_telephone}</>}</small></div>
        </div>
        <div className="d-flex gap-2">
          <button className={`btn btn-sm ${ouvert ? 'btn-outline-danger' : 'btn-outline-success'}`} onClick={basculer}><i className={`bi bi-${ouvert ? 'x-circle' : 'arrow-clockwise'} me-1`}></i>{ouvert ? 'Fermer' : 'Rouvrir'}</button>
          <a href={`mailto:${c.client_email}`} className="btn btn-sm btn-outline-primary"><i className="bi bi-envelope"></i></a>
          {c.client_telephone && <a href={`tel:${c.client_telephone}`} className="btn btn-sm btn-outline-primary"><i className="bi bi-telephone"></i></a>}
        </div>
      </div></div></div>

      <div className="row g-0" style={{ flex: 1, overflow: 'hidden' }}>
        <div className="col-lg-8" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="chat-messages"><div className="container">
            <div className="client-info"><h6 className="mb-2"><i className="bi bi-person-circle me-2"></i>Informations client</h6><div className="row">
              <div className="col-md-6"><small className="text-muted">Nom :</small><div><strong>{c.client_nom} {c.client_prenom || ''}</strong></div></div>
              <div className="col-md-6"><small className="text-muted">Email :</small><div><strong>{c.client_email}</strong></div></div>
              {c.client_adresse && <div className="col-12 mt-2"><small className="text-muted">Adresse :</small><div><strong>{c.client_adresse}</strong></div></div>}
            </div></div>
            {c.produit_id && (
              <div className="product-info"><h6 className="mb-3"><i className="bi bi-box-seam me-2"></i>Produit concerné</h6>
                <div className="d-flex align-items-center gap-3">
                  {c.produit_image && <img src={imageSrc(c.produit_image)} alt={c.produit_nom} className="product-thumb" />}
                  <div><strong className="d-block">{c.produit_nom}</strong><div className="text-primary fw-bold">{Number(c.produit_prix || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA</div>
                    <Link to={`/produits/${c.produit_id}`} target="_blank" className="btn btn-sm btn-outline-primary mt-2"><i className="bi bi-eye me-1"></i>Voir le produit</Link></div>
                </div></div>)}
            {messages.map((m) => {
              const dt = parseDate(m.date_envoi); const cle = jourCle(dt); const nouveau = cle !== courant; courant = cle;
              return (<div key={m.id}>
                {nouveau && <div className="date-divider"><span>{labelJour(dt)}</span></div>}
                <div className={`message ${m.expediteur_type}`}>
                  <div className="message-avatar">{(m.expediteur_nom || '?')[0].toUpperCase()}</div>
                  <div className="message-content"><div className="message-bubble" style={{ whiteSpace: 'pre-line' }}>{m.message}</div>
                    <div className="message-time">{p2(dt.getHours())}:{p2(dt.getMinutes())} {m.expediteur_type === 'vendeur' && !!m.lu && <i className="bi bi-check-all text-primary"></i>}</div></div>
                </div></div>);
            })}
            <div ref={bas} />
          </div></div>

          {ouvert ? (<>
            <div className="quick-replies"><div className="container"><small className="text-muted mb-2 d-block"><i className="bi bi-lightning-fill me-1"></i>Réponses rapides :</small>
              {modeles.map((m) => <button type="button" key={m.id} className="btn btn-sm btn-outline-secondary quick-reply-btn me-1 mb-1" onClick={() => setTexte((t) => (t ? `${t}\n${m.texte}` : m.texte))}>{m.titre}</button>)}</div></div>
            <div className="chat-input"><div className="container">
              {msg && <div className={`alert alert-${msg.type} alert-dismissible mb-3`}>{msg.text}<button type="button" className="btn-close" onClick={() => setMsg(null)}></button></div>}
              <form onSubmit={envoyer}>
                <div className="input-group"><textarea className="form-control" rows="3" required placeholder="Écrivez votre réponse..." value={texte} onChange={(e) => setTexte(e.target.value)}></textarea></div>
                <div className="d-flex justify-content-end gap-2 mt-3"><button type="submit" className="btn btn-send"><i className="bi bi-send-fill me-2"></i>Envoyer</button></div>
              </form></div></div>
          </>) : (
            <div className="chat-input bg-light"><div className="container text-center"><p className="text-muted mb-0"><i className="bi bi-lock-fill me-2"></i>Cette conversation est fermée. Rouvrez-la pour pouvoir répondre.</p></div></div>
          )}
        </div>
        <div className="col-lg-4 d-none d-lg-block"><div className="sidebar-panel">
          <h6 className="mb-3"><i className="bi bi-info-circle me-2"></i>Détails de la conversation</h6>
          <div className="mb-4"><small className="text-muted">Sujet :</small><div className="fw-bold">{c.sujet}</div></div>
          <div className="mb-4"><small className="text-muted">Statut :</small><div><span className={`badge ${ouvert ? 'bg-success' : 'bg-secondary'}`}>{ouvert ? 'Ouvert' : 'Fermé'}</span></div></div>
          <div className="mb-4"><small className="text-muted">Date de création :</small><div className="fw-bold">{formatDateHeure(c.date_creation)}</div></div>
        </div></div>
      </div>
    </div></div>
  );
}
