import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { openPdf } from '../lib/api.js';
import { formatPrix, MODES_PAIEMENT, numeroPad } from '../lib/utils.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner } from '../components/guards.jsx';
import './CheckoutPage.css';

const VILLES = ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Ouahigouya', 'Banfora', 'Kaya', 'Dédougou', "Fada N'Gourma", 'Tenkodogo', 'Autre'];
const OPS = [
  { v: 'orange_money', cle: 'orange', nom: 'Orange Money', ussd: '#144#', icone: 'orange-money-icon' },
  { v: 'moov_money', cle: 'moov', nom: 'Moov Money', ussd: '*155#', icone: 'moov-money-icon' },
  { v: 'coris_money', cle: 'coris', nom: 'Coris Money', ussd: '*662#', icone: 'coris-money-icon' },
];
const ETAPES = {
  orange_money: ['Composez #144# sur votre téléphone', 'Choisissez "Transfert d\'argent"', null, null, 'Validez avec votre code secret'],
  moov_money: ['Composez *155# sur votre téléphone', 'Sélectionnez "Transfert"', null, null, 'Confirmez avec votre code PIN'],
  coris_money: ['Composez *662# sur votre téléphone', 'Choisissez "Transfert"', null, null, 'Validez avec votre code secret'],
};

function VendeursSauvegardes({ liste, titre, texte, bouton, onRestore }) {
  if (!liste?.length) return null;
  return (
    <div className="saved-vendors-card">
      <h4 className="mb-3" style={{ color: '#0c4a6e' }}><i className="bi bi-clock-history me-2"></i>Vendeurs en attente de commande</h4>
      <p className="mb-3" style={{ color: '#64748b' }}>{texte}</p>
      {liste.map((v) => (
        <div className="saved-vendor-item" key={v.id}>
          <div className="saved-vendor-info">
            <div className="saved-vendor-name"><i className="bi bi-shop me-2"></i>{v.nom}</div>
            <div className="saved-vendor-details">{v.nb_produits} produit{v.nb_produits > 1 ? 's' : ''} • {formatPrix(v.total)}</div>
          </div>
          <button className="btn btn-info btn-sm" onClick={() => onRestore(v.id)}><i className="bi bi-arrow-clockwise me-1"></i>{bouton}</button>
        </div>
      ))}
    </div>
  );
}

export default function CheckoutPage() {
  const { refresh } = useAuth();
  const [d, setD] = useState(null);
  const [form, setForm] = useState({ adresse: '', ville: '', code_postal: '', pays: 'Burkina Faso', mode_paiement: '', numero_paiement: '' });
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [succes, setSucces] = useState(null);

  const charger = () => api.get('/commander/prepare').then((r) => {
    setD(r);
    setForm((f) => ({ ...f, adresse: r.utilisateur?.adresse || '', ville: r.utilisateur?.ville || '', code_postal: r.utilisateur?.code_postal || '' }));
  }).catch((e) => setErreur(e.message));
  useEffect(() => { charger(); }, []);

  const restaurer = async (adminId) => {
    try { await api.post('/panier/restaurer-vendeur', { admin_id: adminId }); await refresh(); window.location.assign('/panier'); } catch (e) { setErreur(e.message); }
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setErreur('');
    if (!form.adresse.trim() || !form.ville || !form.code_postal.trim() || !form.pays.trim()) return setErreur("Veuillez remplir tous les champs d'adresse de livraison.");
    if (!form.mode_paiement) return setErreur('Veuillez sélectionner un mode de paiement.');
    if (!/^[0-9]{8}$/.test(form.numero_paiement)) return setErreur('Le numéro de téléphone doit contenir 8 chiffres (ex: 12345678).');
    setEnvoi(true);
    try { setSucces(await api.post('/commandes', form)); refresh(); }
    catch (err) { setErreur(err.message); } finally { setEnvoi(false); }
  };

  if (!d) return erreur ? <div className="container my-5"><div className="alert alert-danger">{erreur}</div></div> : <Spinner />;

  // ---------- Succès ----------
  if (succes) {
    const op = OPS.find((o) => o.v === succes.mode_paiement);
    const numero = succes.numeros_formats?.[op.cle]?.numero;
    const etapes = ETAPES[succes.mode_paiement];
    return (
      <div className="checkout"><div className="container my-5">
        <div className="state-card">
          <div className="state-icon success-icon"><i className="bi bi-check-circle-fill"></i></div>
          <h1 className="mb-3" style={{ color: '#10b981' }}>Commande Confirmée !</h1>
          <div className="alert alert-success border-0 d-inline-block mb-3"><strong>N° de commande : #{numeroPad(succes.commande_id)}</strong></div>
          <p className="fs-5 mb-2">Nous avons bien reçu votre commande d'un montant de <strong style={{ color: '#1a56c4' }}>{formatPrix(succes.total_final)}</strong></p>
          <p className="text-muted mb-4"><i className="bi bi-envelope me-2"></i>
            {succes.email?.success ? <>Un email de confirmation vous a été envoyé à : <strong>{d.utilisateur.email}</strong></> : <>L'email de confirmation n'a pas pu être envoyé, mais votre commande est bien enregistrée.</>}
          </p>
          <div className="vendor-info text-start">
            <div className="d-flex align-items-center gap-2 mb-2">
              <i className="bi bi-shop fs-4" style={{ color: '#0c4a6e' }}></i>
              <div><div className="vendor-name">Vendeur : {succes.vendeur_principal.nom}</div>{succes.vendeur_principal.boutique && <small className="text-muted">{succes.vendeur_principal.boutique}</small>}</div>
            </div>
          </div>
          <div className="payment-instructions text-start">
            {!numero ? (
              <div className="alert alert-warning border-0 mb-3"><i className="bi bi-exclamation-triangle me-2"></i><strong>Attention :</strong> Le vendeur n'a pas renseigné son numéro {MODES_PAIEMENT[succes.mode_paiement]}. Veuillez le contacter directement pour obtenir ses coordonnées de paiement.</div>
            ) : (
              <>
                <div className="d-flex align-items-start gap-2 mb-3"><i className="bi bi-phone-fill fs-4" style={{ color: '#f59e0b' }}></i><div><strong className="d-block mb-2">Instructions de paiement via {MODES_PAIEMENT[succes.mode_paiement]}</strong></div></div>
                {etapes.map((t, i) => (
                  <div className="payment-step" key={i}>
                    <div className="step-number">{i + 1}</div>
                    <div>
                      {i === 2 ? <><strong>Entrez le numéro du vendeur :</strong><span className="fs-5 text-primary d-block mt-1">{numero}</span></>
                        : i === 3 ? <><strong>Montant :</strong><span className="fs-5 text-primary d-block mt-1">{formatPrix(succes.total_final)}</span></>
                        : <strong>{t}</strong>}
                    </div>
                  </div>
                ))}
              </>
            )}
            <div className="alert alert-info border-0 mt-3 mb-0"><i className="bi bi-info-circle me-2"></i><small>Votre commande sera traitée dès réception du paiement par le vendeur</small></div>
          </div>
          {d.vendeurs_sauvegardes.filter((v) => v.id !== succes.vendeur_principal.id).length > 0 && (
            <div className="alert alert-info mt-4">
              <h5 className="mb-2"><i className="bi bi-info-circle me-2"></i>Autres vendeurs en attente</h5>
              <p className="mb-2">Vous avez encore des produits d'autres vendeurs sauvegardés.</p>
              <Link to="/commander" reloadDocument className="btn btn-info btn-sm"><i className="bi bi-cart-check me-1"></i>Voir les vendeurs en attente</Link>
            </div>
          )}
          <div className="d-flex gap-2 justify-content-center flex-wrap mt-4">
            <button className="btn btn-success" onClick={() => openPdf(`/commandes/${succes.commande_id}/recu`)}><i className="bi bi-printer-fill me-2"></i>Télécharger le reçu (PDF)</button>
            <Link to="/mon-compte" className="btn btn-primary"><i className="bi bi-box-seam me-2"></i>Voir mes commandes</Link>
            <Link to="/produits" className="btn btn-outline-secondary"><i className="bi bi-arrow-left me-2"></i>Continuer mes achats</Link>
          </div>
        </div>
      </div></div>
    );
  }

  // ---------- Panier vide ----------
  if (d.panier_vide) {
    return (
      <div className="checkout"><div className="container my-5">
        <VendeursSauvegardes liste={d.vendeurs_sauvegardes} texte="Vous avez des produits sauvegardés d'autres vendeurs. Cliquez pour les commander maintenant !" bouton="Commander maintenant" onRestore={restaurer} />
        <div className="state-card">
          <div className="state-icon"><i className="bi bi-cart-x"></i></div>
          <h1 className="mb-3">Votre panier est vide</h1>
          <p className="text-muted mb-4">Vous devez ajouter des produits à votre panier avant de passer commande.</p>
          <div className="d-flex gap-2 justify-content-center flex-wrap">
            <Link to="/produits" className="btn btn-primary"><i className="bi bi-shop me-2"></i>Voir les produits</Link>
            <Link to="/panier" className="btn btn-outline-secondary"><i className="bi bi-cart3 me-2"></i>Voir mon panier</Link>
          </div>
        </div>
      </div></div>
    );
  }

  // ---------- Plusieurs vendeurs ----------
  if (d.plusieurs_vendeurs) {
    return (
      <div className="checkout"><div className="container my-5">
        <VendeursSauvegardes liste={d.vendeurs_sauvegardes} texte="Vous avez des produits sauvegardés d'autres vendeurs. Après cette commande, vous pourrez facilement les commander !" bouton="Commander ce vendeur" onRestore={restaurer} />
        <div className="multiple-vendors-alert">
          <div className="row align-items-center">
            <div className="col-auto"><div className="alert-icon"><i className="bi bi-exclamation-triangle-fill"></i></div></div>
            <div className="col">
              <h4><i className="bi bi-info-circle me-2"></i>Plusieurs vendeurs détectés dans votre panier</h4>
              <p className="mb-3">Votre panier contient des produits de <strong>{d.groupes.length} vendeurs différents</strong>. Pour passer commande, vous devez commander séparément pour chaque vendeur.</p>
              <Link to="/panier" className="btn btn-warning"><i className="bi bi-cart-check me-2"></i>Retourner au panier pour organiser vos commandes</Link>
            </div>
          </div>
        </div>
        <h3 className="mb-4"><i className="bi bi-shop me-2"></i>Produits par vendeur</h3>
        {d.groupes.map((g) => (
          <div className="vendor-group" key={g.vendeur.id}>
            <div className="vendor-header">
              <div className="vendor-icon"><i className="bi bi-shop"></i></div>
              <div className="vendor-details flex-grow-1"><h5>{g.vendeur.nom}</h5>{g.vendeur.boutique && <small>{g.vendeur.boutique}</small>}</div>
              <div className="text-end"><div className="badge bg-primary" style={{ fontSize: '1rem', padding: '.5rem 1rem' }}>{g.produits.length} produit{g.produits.length > 1 ? 's' : ''}</div></div>
            </div>
            <div className="vendor-products">
              {g.produits.map((p) => (
                <div className="product-row" key={p.id}>
                  <div><strong>{p.nom}</strong><div className="text-muted small">{p.quantite} × {formatPrix(p.prix_final)}</div></div>
                  <div className="text-end"><strong>{formatPrix(p.prix_final * p.quantite)}</strong></div>
                </div>
              ))}
            </div>
            <div className="vendor-total"><span>Total pour ce vendeur</span><span>{formatPrix(g.total)}</span></div>
          </div>
        ))}
        <div className="alert alert-info"><i className="bi bi-lightbulb me-2"></i><strong>Conseil :</strong> Retournez au panier et utilisez les boutons "Commander ce vendeur" pour organiser facilement vos commandes.</div>
      </div></div>
    );
  }

  // ---------- Formulaire ----------
  const vp = d.vendeur_principal;
  return (
    <div className="checkout"><div className="container my-5">
      <VendeursSauvegardes liste={d.vendeurs_sauvegardes} texte="Vous avez des produits sauvegardés d'autres vendeurs. Après cette commande, vous pourrez facilement les commander !" bouton="Commander ce vendeur" onRestore={restaurer} />
      <div className="checkout-stepper"><div className="stepper">
        <div className="step completed"><div className="step-circle"><i className="bi bi-check-lg"></i></div><span className="step-label">Panier</span></div>
        <div className="step active"><div className="step-circle">2</div><span className="step-label">Livraison</span></div>
        <div className="step active"><div className="step-circle">3</div><span className="step-label">Paiement</span></div>
        <div className="step"><div className="step-circle">4</div><span className="step-label">Confirmation</span></div>
      </div></div>
      {erreur && <div className="alert alert-danger alert-dismissible fade show" role="alert"><i className="bi bi-exclamation-triangle me-2"></i>{erreur}<button type="button" className="btn-close" onClick={() => setErreur('')}></button></div>}
      {vp && (
        <div className="vendor-info">
          <div className="d-flex align-items-center gap-2"><i className="bi bi-shop fs-4" style={{ color: '#0c4a6e' }}></i><div><div className="vendor-name">Vendeur : {vp.nom}</div>{vp.boutique && <small className="text-muted">{vp.boutique}</small>}</div></div>
          <small className="text-muted mt-2 d-block"><i className="bi bi-info-circle me-1"></i>Le paiement sera envoyé directement à ce vendeur</small>
        </div>
      )}
      <form onSubmit={submit}>
        <div className="row g-4">
          <div className="col-lg-7">
            <div className="card">
              <div className="card-header"><h3><i className="bi bi-geo-alt-fill"></i> Adresse de Livraison</h3></div>
              <div className="card-body"><div className="row g-3">
                <div className="col-12"><label className="form-label">Adresse complète <span className="text-danger">*</span></label><input className="form-control" placeholder="Secteur, rue, porte..." value={form.adresse} onChange={set('adresse')} required /></div>
                <div className="col-md-6"><label className="form-label">Ville <span className="text-danger">*</span></label>
                  <select className="form-control" value={form.ville} onChange={set('ville')} required>
                    <option value="">Sélectionnez une ville</option>
                    {form.ville && !VILLES.includes(form.ville) && <option value={form.ville}>{form.ville}</option>}
                    {VILLES.map((v) => <option key={v} value={v}>{v === 'Autre' ? 'Autre ville' : v}</option>)}
                  </select></div>
                <div className="col-md-6"><label className="form-label">Quartier / Secteur <span className="text-danger">*</span></label><input className="form-control" placeholder="Ex: Secteur 15, Gounghin..." value={form.code_postal} onChange={set('code_postal')} required /></div>
                <div className="col-12"><label className="form-label">Pays <span className="text-danger">*</span></label><input className="form-control" value={form.pays} onChange={set('pays')} required /></div>
              </div></div>
            </div>
            <div className="card">
              <div className="card-header"><h3><i className="bi bi-credit-card-fill"></i> Mode de Paiement</h3></div>
              <div className="card-body">
                <label className="form-label">Choisissez votre opérateur <span className="text-danger">*</span></label>
                <div className="payment-methods">
                  {OPS.map((o) => (
                    <div className="payment-option" key={o.v}>
                      <input type="radio" name="mode_paiement" id={o.v} value={o.v} checked={form.mode_paiement === o.v} onChange={set('mode_paiement')} required />
                      <label htmlFor={o.v} className="payment-card">
                        <div className={`payment-icon ${o.icone}`}><i className="bi bi-phone-fill"></i></div>
                        <div className="payment-name">{o.nom}</div><div className="payment-description">{o.ussd}</div>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <label className="form-label">Votre numéro de téléphone <span className="text-danger">*</span></label>
                  <div className="phone-input-group">
                    <span className="phone-prefix">+226</span>
                    <input className="form-control phone-input" placeholder="12 34 56 78" inputMode="numeric" maxLength={8} value={form.numero_paiement}
                      onChange={(e) => setForm((f) => ({ ...f, numero_paiement: e.target.value.replace(/\D/g, '').slice(0, 8) }))} required />
                  </div>
                  <small className="text-muted"><i className="bi bi-info-circle me-1"></i>Entrez vos 8 chiffres sans espaces (ex: 12345678)</small>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-5">
            <div className="card">
              <div className="card-header"><h3><i className="bi bi-receipt"></i> Récapitulatif</h3></div>
              <div className="card-body">
                {d.articles.map((a) => (
                  <div className="order-item" key={a.id}>
                    <div className="d-flex justify-content-between mb-1"><strong>{a.nom}</strong></div>
                    <div className="d-flex justify-content-between text-muted small"><span>{a.quantite} × {formatPrix(a.prix_final)}</span><strong>{formatPrix(a.prix_final * a.quantite)}</strong></div>
                  </div>
                ))}
                <div className="mt-3">
                  <div className="summary-row"><span>Sous-total</span><span className="fw-semibold">{formatPrix(d.total)}</span></div>
                  <div className="summary-row"><span>Livraison</span><span className="fw-semibold" style={{ color: d.frais_livraison ? '#64748b' : '#10b981' }}>{d.frais_livraison ? formatPrix(d.frais_livraison) : 'GRATUIT'}</span></div>
                  {d.frais_livraison > 0
                    ? <div className="alert alert-warning border-0 mt-2 mb-0"><small><i className="bi bi-truck me-1"></i>Frais de livraison : <strong>{formatPrix(d.frais_livraison)}</strong></small></div>
                    : <div className="alert alert-success border-0 mt-2 mb-0"><small><i className="bi bi-check-circle me-1"></i>Livraison gratuite ! Votre commande est inférieure à 4 000 FCFA</small></div>}
                  <div className="summary-row summary-total"><span>Total à payer</span><span style={{ color: '#1a56c4' }}>{formatPrix(d.total_final)}</span></div>
                </div>
                <button type="submit" className="btn btn-primary w-100 mt-3" disabled={envoi}>
                  {envoi ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-lock-fill me-2"></i>}Confirmer la Commande
                </button>
                <Link to="/panier" className="btn btn-outline-secondary w-100 mt-2"><i className="bi bi-arrow-left me-2"></i>Retour au panier</Link>
                <div className="text-center mt-3"><small className="text-muted"><i className="bi bi-shield-check me-1"></i>Paiement sécurisé vers {vp?.boutique || vp?.nom}</small></div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div></div>
  );
}
