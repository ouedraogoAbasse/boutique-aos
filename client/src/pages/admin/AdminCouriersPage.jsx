import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../lib/api.js';
import { VEHICULES } from '../../lib/utils.js';
import { Spinner } from '../../components/guards.jsx';
import './AdminCouriersPage.css';

const VIDE = { nom: '', telephone: '', zone_livraison: '', vehicule: 'moto' };

export default function AdminCouriersPage() {
  const [liste, setListe] = useState(null);
  const [form, setForm] = useState(VIDE);
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState(null);
  const formRef = useRef(null);
  const charger = useCallback(() => api.get('/admin/livreurs').then(setListe), []);
  useEffect(() => { charger(); }, [charger]);
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(null), 5000); return () => clearTimeout(t); } }, [msg]);
  if (!liste) return <Spinner />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const reset = () => { setEditId(null); setForm(VIDE); };
  async function act(fn, ok) { try { const r = await fn(); setMsg({ type: 'success', text: r?.message || ok }); await charger(); return true; } catch (e) { setMsg({ type: 'danger', text: e.message }); return false; } }
  async function submit(e) {
    e.preventDefault();
    if (await act(() => (editId ? api.put(`/admin/livreurs/${editId}`, form) : api.post('/admin/livreurs', form)), editId ? 'Livreur modifié.' : 'Livreur ajouté.')) reset();
  }
  function modifier(l) { setEditId(l.id); setForm({ nom: l.nom, telephone: l.telephone, zone_livraison: l.zone_livraison || '', vehicule: l.vehicule || 'moto' }); formRef.current?.scrollIntoView({ behavior: 'smooth' }); }

  return (
    <div className="adm-couriers">
      {msg && <div className={`alert alert-${msg.type} alert-dismissible`}><i className={`bi bi-${msg.type === 'success' ? 'check-circle' : 'exclamation-triangle'}`}></i> {msg.text}<button type="button" className="btn-close" onClick={() => setMsg(null)}></button></div>}
      <div className="row g-4">
        <div className="col-lg-4" ref={formRef}><div className="card-form">
          <h2><i className={`bi bi-${editId ? 'pencil-square' : 'person-plus'}`}></i> {editId ? 'Modifier le livreur' : 'Ajouter un livreur'}</h2>
          <form onSubmit={submit}>
            <div className="mb-3"><label className="form-label">Nom complet *</label><input className="form-control" required value={form.nom} onChange={set('nom')} /></div>
            <div className="mb-3"><label className="form-label">Téléphone *</label><input className="form-control" required placeholder="70123456" maxLength={8} value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value.replace(/\D/g, '') })} /></div>
            <div className="mb-3"><label className="form-label">Zone de livraison</label><input className="form-control" placeholder="Ex: Ouagadougou - Secteur 15" value={form.zone_livraison} onChange={set('zone_livraison')} /></div>
            <div className="mb-3"><label className="form-label">Véhicule</label><select className="form-select" value={form.vehicule} onChange={set('vehicule')}>{Object.entries(VEHICULES).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}</select></div>
            <div className="d-grid gap-2"><button type="submit" className="btn btn-primary"><i className="bi bi-check-circle"></i> {editId ? 'Enregistrer les modifications' : 'Ajouter le livreur'}</button>
              {editId && <button type="button" className="btn btn-outline-secondary" onClick={reset}>Annuler</button>}</div>
          </form>
        </div></div>
        <div className="col-lg-8"><div className="table-container">
          <h2><i className="bi bi-list-ul"></i> Liste des livreurs ({liste.length})</h2>
          {liste.length === 0 ? <div className="text-center text-muted py-5"><i className="bi bi-scooter" style={{ fontSize: '3rem', opacity: 0.3 }}></i><p className="mt-3">Aucun livreur enregistré pour le moment.</p></div> : (
            <div className="table-responsive"><table className="table">
              <thead><tr><th>Livreur</th><th>Téléphone</th><th>Zone</th><th>Véhicule</th><th>Statut</th><th className="text-end">Actions</th></tr></thead>
              <tbody>{liste.map((l) => (
                <tr key={l.id}>
                  <td><div className="d-flex align-items-center gap-2"><div className="livreur-avatar">{l.nom[0].toUpperCase()}</div><strong>{l.nom}</strong></div></td>
                  <td>{l.telephone}</td><td>{l.zone_livraison || '—'}</td>
                  <td><i className={`bi ${VEHICULES[l.vehicule]?.icon || 'bi-scooter'}`}></i> {l.vehicule ? l.vehicule[0].toUpperCase() + l.vehicule.slice(1) : ''}</td>
                  <td>{l.actif ? <span className="badge bg-success">Actif</span> : <span className="badge bg-secondary">Inactif</span>}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-primary me-1" title="Modifier" onClick={() => modifier(l)}><i className="bi bi-pencil"></i></button>
                    <button className="btn btn-sm btn-outline-warning me-1" title="Activer/Désactiver" onClick={() => act(() => api.post(`/admin/livreurs/${l.id}/toggle`), 'Statut mis à jour.')}><i className="bi bi-toggle2-on"></i></button>
                    <button className="btn btn-sm btn-outline-danger" title="Supprimer" onClick={() => window.confirm('Supprimer ce livreur ?') && act(() => api.del(`/admin/livreurs/${l.id}`), 'Livreur supprimé.')}><i className="bi bi-trash"></i></button>
                  </td>
                </tr>))}</tbody></table></div>)}
        </div></div>
      </div>
    </div>
  );
}
