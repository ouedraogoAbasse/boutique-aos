import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../lib/api.js';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { imageSrc } from '../../lib/utils.js';
import { Spinner } from '../../components/guards.jsx';
import './AdminProductsPage.css';

const VIDE = { nom: '', categorie_id: '', prix: '', stock: '', marque: '', description: '', promo: false, pourcentage_promo: 0 };
const f2 = (n) => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminProductsPage() {
  const { estSuperAdmin: sa } = useAdminAuth();
  const [d, setD] = useState(null);
  const [form, setForm] = useState(VIDE);
  const [edit, setEdit] = useState(null); // produit en cours de modification
  const [fichier, setFichier] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const formRef = useRef(null);

  const charger = useCallback(() => api.get('/admin/produits').then(setD), []);
  useEffect(() => { charger(); }, [charger]);
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(null), 5000); return () => clearTimeout(t); } }, [msg]);
  if (!d) return <Spinner />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  function reset() { setEdit(null); setForm(VIDE); setFichier(null); if (fileRef.current) fileRef.current.value = ''; }
  function modifier(p) {
    setEdit(p); setFichier(null);
    setForm({ nom: p.nom, categorie_id: p.categorie_id ?? '', prix: p.prix, stock: p.stock, marque: p.marque ?? '', description: p.description ?? '', promo: !!p.promo, pourcentage_promo: p.pourcentage_promo ?? 0 });
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  }
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (k === 'promo') { if (v) fd.append('promo', '1'); } else fd.append(k, v ?? ''); });
    if (fichier) fd.append('image', fichier);
    if (edit) fd.append('image_actuelle', edit.image || '');
    try {
      const r = edit ? await api.put(`/admin/produits/${edit.id}`, fd) : await api.post('/admin/produits', fd);
      setMsg({ type: 'success', text: r.message || (edit ? 'Produit modifié avec succès.' : 'Produit ajouté avec succès.') });
      reset(); await charger();
    } catch (err) { setMsg({ type: 'danger', text: err.message }); } finally { setBusy(false); }
  }
  async function supprimer(p) {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;
    try { await api.del(`/admin/produits/${p.id}`); setMsg({ type: 'success', text: 'Produit supprimé avec succès.' }); if (edit?.id === p.id) reset(); await charger(); }
    catch (err) { setMsg({ type: 'danger', text: err.message }); }
  }

  return (
    <div className="adm-prod">
      {msg && <div className={`alert alert-${msg.type} alert-dismissible`}><i className={`bi bi-${msg.type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2`}></i>{msg.text}<button type="button" className="btn-close" onClick={() => setMsg(null)}></button></div>}

      <div className="card mb-4" ref={formRef}>
        <div className="card-header"><h5 className="mb-0 fw-bold">{edit ? '✏️ Modifier le produit' : '➕ Ajouter un nouveau produit'}</h5></div>
        <div className="card-body"><form onSubmit={submit}>
          <div className="row g-3">
            <div className="col-md-6"><label className="form-label" htmlFor="nom">Nom du produit *</label><input className="form-control" id="nom" required value={form.nom} onChange={set('nom')} placeholder="Ex: iPhone 15 Pro" /></div>
            <div className="col-md-6"><label className="form-label" htmlFor="cat">Catégorie *</label>
              <select className="form-select" id="cat" required value={form.categorie_id} onChange={set('categorie_id')}>
                <option value="">Choisir une catégorie…</option>{d.categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></div>
            <div className="col-md-4"><label className="form-label" htmlFor="prix">Prix (FCFA) *</label><div className="input-group"><input type="number" className="form-control" id="prix" step="0.01" min="0" required value={form.prix} onChange={set('prix')} /><span className="input-group-text">FCFA</span></div></div>
            <div className="col-md-4"><label className="form-label" htmlFor="stock">Stock *</label><input type="number" className="form-control" id="stock" min="0" required value={form.stock} onChange={set('stock')} placeholder="100" /></div>
            <div className="col-md-4"><label className="form-label" htmlFor="marque">Marque</label><input className="form-control" id="marque" value={form.marque} onChange={set('marque')} placeholder="Ex: Apple" /></div>
            <div className="col-12"><label className="form-label" htmlFor="description">Description *</label><textarea className="form-control" id="description" rows="4" required value={form.description} onChange={set('description')} placeholder="Description détaillée du produit..."></textarea></div>
            <div className="col-md-6"><label className="form-label" htmlFor="image">Image du produit</label>
              <input type="file" className="form-control" id="image" accept="image/*" ref={fileRef} onChange={(e) => setFichier(e.target.files[0] || null)} />
              {edit?.image && !fichier && <div className="image-preview-container"><img src={imageSrc(edit.image)} alt="Image actuelle" className="image-preview" /></div>}
              {fichier && <div className="image-preview-container"><img src={URL.createObjectURL(fichier)} alt="Aperçu" className="image-preview" /></div>}</div>
            <div className="col-md-6"><label className="form-label d-block">Promotion</label>
              <div className="form-check form-switch mb-3"><input className="form-check-input" type="checkbox" id="promo" checked={form.promo} onChange={set('promo')} /><label className="form-check-label" htmlFor="promo">Produit en promotion</label></div>
              <div className="input-group"><input type="number" className="form-control" min="0" max="100" disabled={!form.promo} value={form.pourcentage_promo} onChange={set('pourcentage_promo')} /><span className="input-group-text">%</span></div></div>
          </div>
          <div className="mt-4 d-flex gap-2 flex-wrap">
            <button type="submit" className="btn btn-primary" disabled={busy}><i className="bi bi-check-lg me-1"></i>{edit ? 'Modifier le produit' : 'Ajouter le produit'}</button>
            {edit && <button type="button" className="btn btn-outline-secondary" onClick={reset}><i className="bi bi-x-lg me-1"></i>Annuler</button>}
          </div>
        </form></div>
      </div>

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center"><h5 className="mb-0 fw-bold"><i className="bi bi-list-ul me-2"></i>{sa ? 'Tous les produits' : 'Mes produits'}</h5><span className="badge bg-primary">{d.nb_produits} produits</span></div>
        <div className="card-body p-0"><div className="table-responsive"><table className="table table-hover mb-0">
          <thead><tr><th>ID</th><th>Image</th><th>Nom</th><th className="d-none d-lg-table-cell">Catégorie</th><th className="d-none d-md-table-cell">Marque</th>{sa && <th className="d-none d-lg-table-cell">Vendeur</th>}<th>Prix</th><th className="d-none d-lg-table-cell">Stock</th><th className="d-none d-md-table-cell">Promo</th><th className="text-end">Actions</th></tr></thead>
          <tbody>
            {d.produits.length === 0 ? <tr><td colSpan={sa ? 10 : 9} className="text-center py-5 text-muted"><i className="bi bi-inbox display-4 d-block mb-3"></i>Aucun produit pour le moment</td></tr>
              : d.produits.map((p) => (
                <tr key={p.id}>
                  <td className="fw-semibold">#{p.id}</td>
                  <td>{p.image ? <img src={imageSrc(p.image)} alt={p.nom} className="product-image" /> : <div className="image-placeholder"><i className="bi bi-image"></i></div>}</td>
                  <td><div className="fw-semibold">{p.nom}</div><small className="text-muted d-lg-none">{p.categorie_nom || 'Non catégorisé'}</small></td>
                  <td className="d-none d-lg-table-cell">{p.categorie_nom || 'Non catégorisé'}</td>
                  <td className="d-none d-md-table-cell">{p.marque || '-'}</td>
                  {sa && <td className="d-none d-lg-table-cell"><span className="badge badge-vendeur">{p.vendeur_nom || 'N/A'}</span>{p.vendeur_boutique && <><br /><small className="text-muted">{p.vendeur_boutique}</small></>}</td>}
                  <td>{p.promo ? <><div><small className="text-decoration-line-through text-muted">{f2(p.prix)}FCFA</small></div><div className="text-danger fw-bold">{f2(p.prix * (1 - p.pourcentage_promo / 100))}FCFA</div></> : <span className="fw-semibold">{f2(p.prix)}FCFA</span>}</td>
                  <td className="d-none d-lg-table-cell"><span className="badge badge-stock">{p.stock}</span></td>
                  <td className="d-none d-md-table-cell">{p.promo ? <span className="badge badge-promo">-{p.pourcentage_promo}%</span> : <span className="text-muted">-</span>}</td>
                  <td className="text-end"><div className="d-flex gap-1 justify-content-end">
                    <button className="btn btn-sm btn-warning" title="Modifier" onClick={() => modifier(p)}><i className="bi bi-pencil"></i></button>
                    <button className="btn btn-sm btn-danger" title="Supprimer" onClick={() => supprimer(p)}><i className="bi bi-trash"></i></button></div></td>
                </tr>))}
          </tbody></table></div></div>
      </div>
    </div>
  );
}
