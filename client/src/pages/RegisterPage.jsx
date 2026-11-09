import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import AuthNav from '../components/AuthNav.jsx';
import './RegisterPage.css';

const Champ = ({ label, icon, required, children, col = 'col-md-6' }) => (
  <div className={col}>
    <label className="form-label">{label} {required && <span className="required">*</span>}</label>
    <div className="input-with-icon"><i className={`bi ${icon} input-icon`}></i>{children}</div>
  </div>
);

export default function RegisterPage() {
  const navigate = useNavigate();
  const [f, setF] = useState({ nom: '', prenom: '', email: '', telephone: '', adresse: '', ville: '', code_postal: '', mot_de_passe: '', confirmer_mdp: '' });
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const n = f.mot_de_passe.length;
  const force = n === 0 ? '' : n < 6 ? 'strength-weak' : n < 10 ? 'strength-medium' : 'strength-strong';

  const submit = async (e) => {
    e.preventDefault(); setErreur('');
    if (n < 6) return setErreur('Le mot de passe doit contenir au moins 6 caractères.');
    if (f.mot_de_passe !== f.confirmer_mdp) return setErreur('Les mots de passe ne correspondent pas.');
    try { const d = await api.post('/auth/register', f); setSucces(d.message); setTimeout(() => navigate('/connexion'), 2000); }
    catch (err) { setErreur(err.message); }
  };

  return (
    <div className="auth-register">
      <AuthNav action={<Link to="/connexion" className="btn btn-primary btn-sm"><i className="bi bi-box-arrow-in-right me-1"></i>Connexion</Link>} />
      <div className="register-container">
        <div className="register-card">
          <div className="register-header"><h2><i className="bi bi-person-plus-fill me-2"></i>Créer un Compte</h2><p>Rejoignez-nous et profitez de tous nos avantages</p></div>
          <div className="register-body">
            {erreur && <div className="alert alert-danger" role="alert"><i className="bi bi-exclamation-triangle me-2"></i>{erreur}</div>}
            {succes && <div className="alert alert-success" role="alert"><i className="bi bi-check-circle me-2"></i>{succes}</div>}
            <form onSubmit={submit}>
              <div className="form-section">
                <h3 className="section-title"><i className="bi bi-person-circle"></i> Informations Personnelles</h3>
                <div className="row g-3">
                  <Champ label="Nom" icon="bi-person" required><input className="form-control" placeholder="Votre nom" value={f.nom} onChange={set('nom')} required /></Champ>
                  <Champ label="Prénom" icon="bi-person" required><input className="form-control" placeholder="Votre prénom" value={f.prenom} onChange={set('prenom')} required /></Champ>
                  <Champ label="Email" icon="bi-envelope" required><input type="email" className="form-control" placeholder="votre@email.com" value={f.email} onChange={set('email')} required /></Champ>
                  <Champ label="Téléphone" icon="bi-telephone"><input type="tel" className="form-control" placeholder="+226 XX XX XX XX" value={f.telephone} onChange={set('telephone')} /></Champ>
                </div>
              </div>
              <div className="form-section">
                <h3 className="section-title"><i className="bi bi-geo-alt-fill"></i> Adresse de Livraison</h3>
                <div className="row g-3">
                  <Champ label="Adresse complète" icon="bi-house" col="col-12"><input className="form-control" placeholder="Numéro et nom de rue" value={f.adresse} onChange={set('adresse')} /></Champ>
                  <Champ label="Ville" icon="bi-building"><input className="form-control" placeholder="Votre ville" value={f.ville} onChange={set('ville')} /></Champ>
                  <Champ label="Code Postal" icon="bi-mailbox"><input className="form-control" placeholder="Code postal" value={f.code_postal} onChange={set('code_postal')} /></Champ>
                </div>
              </div>
              <div className="form-section">
                <h3 className="section-title"><i className="bi bi-shield-lock-fill"></i> Sécurité du Compte</h3>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Mot de passe <span className="required">*</span></label>
                    <div className="input-with-icon"><i className="bi bi-lock input-icon"></i><input type="password" className="form-control" placeholder="Min. 6 caractères" value={f.mot_de_passe} onChange={set('mot_de_passe')} required /></div>
                    <div className="password-strength"><div className={`password-strength-bar ${force}`}></div></div>
                    <small className="text-muted"><i className="bi bi-info-circle me-1"></i>Minimum 6 caractères</small>
                  </div>
                  <Champ label="Confirmer le mot de passe" icon="bi-lock-fill" required><input type="password" className="form-control" placeholder="Confirmez le mot de passe" value={f.confirmer_mdp} onChange={set('confirmer_mdp')} required /></Champ>
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-100" disabled={!!succes}><i className="bi bi-person-check me-2"></i>Créer mon compte</button>
            </form>
            <div className="login-link">Vous avez déjà un compte ? <Link to="/connexion"><i className="bi bi-box-arrow-in-right me-1"></i>Connectez-vous ici</Link></div>
          </div>
        </div>
      </div>
      <footer><div className="container"><p className="mb-0">&copy; {new Date().getFullYear()} AOS MULTI-SERVICE International. Tous droits réservés.</p></div></footer>
    </div>
  );
}
