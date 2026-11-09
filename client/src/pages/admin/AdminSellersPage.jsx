import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../lib/api.js';
import { Spinner } from '../../components/guards.jsx';
import './AdminSellersPage.css';

const VIDE = { nom: '', email: '', boutique: '', telephone: '', commission: '10.00', mot_de_passe: '', numero_orange_money: '', numero_moov_money: '', numero_coris_money: '' };
const f0 = (n) => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const chiffres = (v) => v.replace(/\D/g, '').slice(0, 8);
const PAIEMENTS = [
  ['numero_orange_money', 'Orange Money', 'OM', 'orange', '70123456', '--orange-money'],
  ['numero_moov_money', 'Moov Money', 'MM', 'moov', '60123456', '--moov-money'],
  ['numero_coris_money', 'Coris Money', 'CM', 'coris', '50123456', '--coris-money'],
];

export default function AdminSellersPage() {
  const [liste, setListe] = useState(null);
  const [form, setForm] = useState(VIDE);
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);
  const charger = useCallback(() => api.get('/admin/vendeurs').then(setListe), []);
  useEffect(() => { charger(); }, [charger]);
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(null), 5000); return () => clearTimeout(t); } }, [msg]);
  if (!liste) return <Spinner />;

  const set = (k, tel) => (e) => setForm({ ...form, [k]: tel ? chiffres(e.target.value) : e.target.value });
  function reset() { setEditId(null); setForm(VIDE); }
  function modifier(v) {
    setEditId(v.admin_id);
    setForm({ nom: v.admin_nom, email: v.email, boutique: v.boutique || '', telephone: v.telephone || '', commission: v.commission, mot_de_passe: '',
      numero_orange_money: v.numero_orange_money || '', numero_moov_money: v.numero_moov_money || '', numero_coris_money: v.numero_coris_money || '' });
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  }
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try {
      const r = editId ? await api.put(`/admin/vendeurs/${editId}`, form) : await api.post('/admin/vendeurs', form);
      setMsg({ type: 'success', text: r.message || (editId ? 'Vendeur modifié.' : 'Vendeur ajouté.') }); reset(); await charger();
    } catch (err) { setMsg({ type: 'danger', text: err.message }); } finally { setBusy(false); }
  }
  async function toggle(v) {
    if (!window.confirm(`Voulez-vous ${v.actif ? 'désactiver' : 'activer'} ce vendeur ?`)) return;
    try { const r = await api.post(`/admin/vendeurs/${v.admin_id}/toggle`); setMsg({ type: 'success', text: r.message || 'Statut mis à jour.' }); await charger(); } catch (err) { setMsg({ type: 'danger', text: err.message }); }
  }
  async function supprimer(v) {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce vendeur ?')) return;
    try { const r = await api.del(`/admin/vendeurs/${v.admin_id}`); setMsg({ type: 'success', text: r.message || 'Vendeur supprimé.' }); await charger(); } catch (err) { setMsg({ type: 'danger', text: err.message }); }
  }

  return (
    <div className="adm-vendors"><div className="content-wrapper">
      {msg && <div className={`alert alert-${msg.type} alert-dismissible`}><i className={`bi bi-${msg.type === 'success' ? 'check-circle' : 'exclamation-triangle'}`}></i> {msg.text}<button type="button" className="btn-close" onClick={() => setMsg(null)}></button></div>}

      <div className="form-container" ref={formRef}>
        <h3><i className={`bi bi-${editId ? 'pencil' : 'plus-circle'}`}></i> {editId ? 'Modifier le vendeur' : 'Ajouter un vendeur'}</h3>
        <form onSubmit={submit}>
          <div className="row g-3">
            <div className="col-12 col-md-6"><label className="form-label">Nom complet *</label><input className="form-control" required value={form.nom} onChange={set('nom')} /></div>
            <div className="col-12 col-md-6"><label className="form-label">Email *</label><input type="email" className="form-control" required value={form.email} onChange={set('email')} /></div>
            <div className="col-12 col-md-6"><label className="form-label">Nom de la boutique *</label><input className="form-control" required value={form.boutique} onChange={set('boutique')} /></div>
            <div className="col-12 col-md-6"><label className="form-label">Téléphone</label><input type="tel" className="form-control" placeholder="Ex: 70123456" value={form.telephone} onChange={set('telephone', true)} /></div>
            <div className="col-12 col-md-6"><label className="form-label">Commission (%) *</label><input type="number" className="form-control" step="0.01" min="0" max="100" required value={form.commission} onChange={set('commission')} /><small className="text-muted">Pourcentage de commission sur chaque vente</small></div>
            <div className="col-12 col-md-6"><label className="form-label">Mot de passe {editId ? '(laisser vide si inchangé)' : '*'}</label><input type="password" className="form-control" required={!editId} minLength={editId && !form.mot_de_passe ? 0 : 6} value={form.mot_de_passe} onChange={set('mot_de_passe')} /><small className="text-muted">Minimum 6 caractères</small></div>
          </div>
          <div className="payment-section">
            <div className="payment-section-title"><i className="bi bi-phone-fill"></i><span>Numéros de Paiement Mobile *</span></div>
            <p className="text-muted small mb-3"><i className="bi bi-info-circle"></i> Renseignez au moins un numéro. Ces numéros seront affichés aux clients.</p>
            <div className="row g-3">{PAIEMENTS.map(([k, label, ab, cls, ph, v]) => (
              <div className="col-12 col-lg-4" key={k}><div className="payment-input-wrapper">
                <label className="payment-label"><i className="bi bi-phone-fill" style={{ color: `var(${v})` }}></i> {label}</label>
                <div className="payment-input-group"><div className="payment-icon-box"><div className={`payment-icon ${cls}-icon`}>{ab}</div></div><div className="payment-prefix">+226</div>
                  <input type="tel" className="form-control" placeholder={ph} maxLength={8} value={form[k]} onChange={set(k, true)} /></div>
                <small className="payment-hint">8 chiffres</small></div></div>))}</div>
          </div>
          <div className="mt-4 d-flex flex-column flex-sm-row gap-2">
            <button type="submit" className="btn btn-primary" disabled={busy}><i className="bi bi-save"></i> {editId ? 'Modifier' : 'Ajouter'}</button>
            {editId && <button type="button" className="btn btn-secondary" onClick={reset}><i className="bi bi-x-circle"></i> Annuler</button>}
          </div>
        </form>
      </div>

      <div className="table-container">
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3"><h3 className="mb-0"><i className="bi bi-people"></i> Liste des Vendeurs ({liste.length})</h3></div>
        <div className="row g-3 g-lg-4">{liste.map((v) => {
          const nums = [['orange', 'OM', v.numero_orange_money], ['moov', 'MM', v.numero_moov_money], ['coris', 'CM', v.numero_coris_money]].filter((x) => x[2]);
          return (
            <div className="col-12 col-xl-6" key={v.admin_id}><div className={`card vendeur-card ${v.actif ? '' : 'inactive'}`}><div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="flex-fill pe-2">
                  <h5 className="card-title mb-2"><i className="bi bi-shop"></i> {v.boutique}</h5>
                  <p className="text-muted mb-1 small"><i className="bi bi-person"></i> {v.admin_nom}</p>
                  <p className="text-muted mb-1 small text-truncate"><i className="bi bi-envelope"></i> {v.email}</p>
                  {v.telephone && <p className="text-muted mb-0 small"><i className="bi bi-telephone"></i> {v.telephone}</p>}
                </div>
                <span className={`badge ${v.actif ? 'badge-actif' : 'badge-inactif'} flex-shrink-0`}>{v.actif ? 'Actif' : 'Inactif'}</span>
              </div>
              {nums.length ? <div className="mb-3"><small className="text-muted d-block mb-2">Numéros de paiement :</small><div className="d-flex flex-wrap">{nums.map(([c, a, n]) => <span key={c} className={`numero-badge ${c}`}><i className="bi bi-phone-fill"></i> {a}: {n}</span>)}</div></div>
                : <div className="alert alert-warning py-2 mb-3" style={{ fontSize: '.875rem' }}><i className="bi bi-exclamation-triangle"></i> <small>Aucun numéro de paiement</small></div>}
              <div className="mb-3 d-flex flex-wrap">
                <span className="stat-mini"><i className="bi bi-box-seam text-primary"></i> <strong>{v.nb_produits}</strong> produits</span>
                <span className="stat-mini"><i className="bi bi-cart-check text-success"></i> <strong>{v.nb_commandes}</strong> commandes</span></div>
              <div className="row g-2 mb-3">
                <div className="col-6"><div className="p-2 bg-light rounded text-center"><small className="text-muted d-block mb-1">CA Total</small><strong className="text-primary d-block" style={{ fontSize: '.95rem' }}>{f0(v.chiffre_affaires)} F</strong></div></div>
                <div className="col-6"><div className="p-2 bg-light rounded text-center"><small className="text-muted d-block mb-1">Com. ({v.commission}%)</small><strong className="text-success d-block" style={{ fontSize: '.95rem' }}>{f0(v.total_commissions)} F</strong></div></div></div>
              <div className="d-flex flex-column flex-sm-row gap-2">
                <button className="btn btn-sm btn-outline-primary btn-action" onClick={() => modifier(v)}><i className="bi bi-pencil"></i> Modifier</button>
                <button className="btn btn-sm btn-outline-warning btn-action" onClick={() => toggle(v)}><i className={`bi bi-${v.actif ? 'pause' : 'play'}-circle`}></i> {v.actif ? 'Désactiver' : 'Activer'}</button>
                {Number(v.nb_produits) === 0 && <button className="btn btn-sm btn-outline-danger btn-action" onClick={() => supprimer(v)}><i className="bi bi-trash"></i> Supprimer</button>}
              </div>
            </div></div></div>);
        })}</div>
      </div>
    </div></div>
  );
}
