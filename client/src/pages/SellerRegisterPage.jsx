import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import './SellerRegisterPage.css';

const PAIEMENTS = [
  { k: 'numero_orange_money', nom: 'Orange Money', cls: 'orange-icon', abbr: 'OM', ph: '70 12 34 56', ex: '70123456' },
  { k: 'numero_moov_money', nom: 'Moov Money', cls: 'moov-icon', abbr: 'MM', ph: '60 12 34 56', ex: '60123456' },
  { k: 'numero_coris_money', nom: 'Coris Money', cls: 'coris-icon', abbr: 'CM', ph: '50 12 34 56', ex: '50123456' },
];

export default function SellerRegisterPage() {
  const [f, setF] = useState({ nom: '', email: '', boutique: '', telephone: '', numero_orange_money: '', numero_moov_money: '', numero_coris_money: '', password: '', confirm_password: '' });
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const num = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value.replace(/\D/g, '').slice(0, 8) }));

  const submit = async (e) => {
    e.preventDefault(); setErreur('');
    if (!f.numero_orange_money && !f.numero_moov_money && !f.numero_coris_money) return setErreur('Vous devez renseigner au moins un numéro de paiement mobile.');
    if (f.password !== f.confirm_password) return setErreur('Les mots de passe ne correspondent pas.');
    try { await api.post('/auth/vendeur/register', f); setSucces(true); } catch (err) { setErreur(err.message); }
  };

  return (
    <div className="auth-seller">
      <div className="register-container">
        <div className="register-card">
          {succes ? (
            <div className="success-card">
              <div className="success-icon"><i className="bi bi-check-circle-fill"></i></div>
              <h2 className="mb-3" style={{ color: '#10b981' }}>Inscription Réussie !</h2>
              <p className="text-muted mb-4">Votre compte vendeur a été créé avec succès. Vous pouvez maintenant vous connecter.</p>
              <Link to="/admin/connexion" className="btn btn-primary"><i className="bi bi-box-arrow-in-right me-2"></i>Se connecter</Link>
            </div>
          ) : (
            <>
              <div className="card-header"><h2><i className="bi bi-shop me-2"></i>Inscription Vendeur</h2><p>Créez votre compte pour commencer à vendre</p></div>
              <div className="card-body">
                {erreur && <div className="alert alert-danger"><i className="bi bi-exclamation-triangle me-2"></i>{erreur}</div>}
                <form onSubmit={submit}>
                  <div className="form-section">
                    <div className="form-section-title"><i className="bi bi-person-badge me-2"></i>Informations générales</div>
                    <div className="row g-3">
                      <div className="col-md-6"><label className="form-label">Nom complet <span className="required-star">*</span></label><input className="form-control" placeholder="Ex: Jean Dupont" value={f.nom} onChange={set('nom')} required /></div>
                      <div className="col-md-6"><label className="form-label">Email <span className="required-star">*</span></label><input type="email" className="form-control" placeholder="Ex: jean@example.com" value={f.email} onChange={set('email')} required /></div>
                      <div className="col-md-6"><label className="form-label">Nom de la boutique <span className="required-star">*</span></label><input className="form-control" placeholder="Ex: DENZO HOUSE" value={f.boutique} onChange={set('boutique')} required /></div>
                      <div className="col-md-6"><label className="form-label">Téléphone <span className="required-star">*</span></label><input type="tel" className="form-control" placeholder="Ex: 70123456" maxLength={8} value={f.telephone} onChange={num('telephone')} required /><small className="text-muted">8 chiffres sans +226</small></div>
                    </div>
                  </div>
                  <div className="form-section">
                    <div className="form-section-title"><i className="bi bi-phone me-2"></i>Numéros de paiement mobile</div>
                    <div className="info-box"><strong>Important :</strong> Renseignez au moins un numéro de paiement mobile. Ces numéros seront utilisés pour recevoir les paiements de vos clients.</div>
                    {PAIEMENTS.map((p) => (
                      <div className="payment-input-group" key={p.k}>
                        <label className="form-label">{p.nom}</label>
                        <div style={{ position: 'relative' }}>
                          <span className={`payment-icon ${p.cls}`}>{p.abbr}</span><span className="phone-prefix">+226</span>
                          <input type="tel" className="form-control payment-input payment-prefix-input" placeholder={p.ph} maxLength={8} value={f[p.k]} onChange={num(p.k)} />
                        </div>
                        <small className="text-muted">Format : 8 chiffres (ex: {p.ex})</small>
                      </div>
                    ))}
                  </div>
                  <div className="form-section">
                    <div className="form-section-title"><i className="bi bi-shield-lock me-2"></i>Sécurité</div>
                    <div className="row g-3">
                      <div className="col-md-6"><label className="form-label">Mot de passe <span className="required-star">*</span></label><input type="password" className="form-control" placeholder="Minimum 6 caractères" minLength={6} value={f.password} onChange={set('password')} required /></div>
                      <div className="col-md-6"><label className="form-label">Confirmer le mot de passe <span className="required-star">*</span></label><input type="password" className="form-control" placeholder="Confirmez le mot de passe" value={f.confirm_password} onChange={set('confirm_password')} required /></div>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary w-100"><i className="bi bi-check-circle me-2"></i>Créer mon compte vendeur</button>
                  <div className="text-center mt-3"><Link to="/admin/connexion">Déjà inscrit ? Se connecter</Link></div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
