import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../lib/api.js';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { tempsEcoule } from '../../lib/utils.js';
import { Spinner } from '../../components/guards.jsx';
import './AdminMessagesPage.css';

export default function AdminMessagesPage() {
  const [sp, setSp] = useSearchParams();
  const convId = Number(sp.get('conv')) || 0;
  const { refresh } = useAdminAuth();
  const [liste, setListe] = useState(null);
  const [cur, setCur] = useState(null);
  const [texte, setTexte] = useState('');
  const [err, setErr] = useState('');
  const bas = useRef(null);

  const chargerListe = useCallback(() => api.get('/admin/conversations', { statut: 'ouvert' }).then((r) => setListe(r.conversations)), []);
  useEffect(() => { chargerListe(); }, [chargerListe]);
  useEffect(() => {
    setCur(null); setErr('');
    if (!convId) return;
    api.get(`/admin/conversations/${convId}`).then((r) => { setCur(r); chargerListe(); refresh(); }).catch((e) => setErr(e.message));
  }, [convId, chargerListe, refresh]);
  useEffect(() => { bas.current?.scrollIntoView(); }, [cur?.messages?.length]);
  if (!liste) return <Spinner />;

  async function envoyer(e) {
    e.preventDefault();
    if (!texte.trim()) return;
    try { const r = await api.post(`/admin/conversations/${convId}/messages`, { message: texte }); setCur({ ...cur, messages: r.messages }); setTexte(''); chargerListe(); }
    catch (e2) { setErr(e2.message); }
  }
  async function fermer() {
    if (!window.confirm('Voulez-vous vraiment fermer cette conversation ?')) return;
    await api.post(`/admin/conversations/${convId}/fermer`); setSp({}); chargerListe();
  }
  const keyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer(e); } };

  return (
    <div className="adm-msgs">
      <div className="d-flex justify-content-between align-items-center mb-4"><h1 className="h3"><i className="bi bi-chat-dots text-primary"></i> Messagerie</h1></div>
      <div className="messagerie-container">
        <div className="conversations-list">
          {liste.length === 0 ? <div className="empty-state p-4"><i className="bi bi-inbox"></i><p>Aucune conversation</p></div> : liste.map((c) => {
            const nonLu = c.messages_non_lus > 0;
            return (
              <div key={c.id} className={`conversation-item ${c.id === convId ? 'active' : ''} ${nonLu ? 'unread' : ''}`} onClick={() => setSp({ conv: c.id })}>
                <div className="d-flex gap-3">
                  <div className="conversation-avatar">{(c.client_nom || 'U')[0].toUpperCase()}</div>
                  <div className="conversation-info">
                    <div className="conversation-name">{c.client_nom || 'Utilisateur'}</div>
                    {c.sujet && <div className="conversation-preview">{c.sujet}</div>}
                    {c.produit_nom && <div className="conversation-preview text-muted"><i className="bi bi-box"></i> {c.produit_nom}</div>}
                    <div className="conversation-time">{tempsEcoule(c.derniere_activite)}</div>
                  </div>
                  {nonLu && <div className="unread-badge">{c.messages_non_lus}</div>}
                </div>
              </div>);
          })}
        </div>
        <div className={`chat-area ${convId ? 'show' : ''}`}>
          {cur ? (<>
            <div className="chat-header"><div className="d-flex justify-content-between align-items-center">
              <div><h5 className="mb-0">{cur.conversation.client_nom}</h5><small className="text-muted">{cur.conversation.client_email}</small>
                {cur.conversation.produit_nom && <><br /><small className="text-primary"><i className="bi bi-box"></i> {cur.conversation.produit_nom}</small></>}</div>
              <div><button className="btn btn-sm btn-outline-secondary me-2 d-md-none" onClick={() => setSp({})}><i className="bi bi-arrow-left"></i></button>
                <button className="btn btn-sm btn-outline-danger" onClick={fermer}><i className="bi bi-x-circle"></i> Fermer</button></div>
            </div></div>
            <div className="chat-messages">
              {cur.messages.map((m) => { const envoye = m.expediteur_type === 'vendeur'; return (
                <div key={m.id} className={`message ${envoye ? 'sent' : 'received'}`}>
                  <div className="message-avatar">{(m.expediteur_nom || 'U')[0].toUpperCase()}</div>
                  <div className="message-content"><div className="message-bubble" style={{ whiteSpace: 'pre-line' }}>{m.message}</div><div className={`message-time ${envoye ? 'text-end' : ''}`}>{tempsEcoule(m.date_envoi)}</div></div>
                </div>); })}
              <div ref={bas} />
            </div>
            <div className="chat-input-area">
              {err && <div className="alert alert-danger py-1">{err}</div>}
              <form className="chat-input-form" onSubmit={envoyer}>
                <textarea rows="1" placeholder="Écrivez votre message..." required value={texte} onChange={(e) => setTexte(e.target.value)} onKeyDown={keyDown}></textarea>
                <button type="submit" className="send-btn"><i className="bi bi-send-fill"></i></button>
              </form>
            </div>
          </>) : convId && !err ? <Spinner /> : (
            <div className="empty-state"><i className="bi bi-chat-dots"></i><h5>Sélectionnez une conversation</h5><p className="text-muted">{err || 'Choisissez une conversation pour commencer à discuter'}</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
