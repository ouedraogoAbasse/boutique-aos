import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthNav from '../components/AuthNav.jsx';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErreur('');
    if (!email.trim() || !mdp) return setErreur('Veuillez remplir tous les champs.');
    setEnvoi(true);
    try {
      await login(email.trim(), mdp);
      const r = sp.get('redirect');
      navigate(r && r.startsWith('/') && !r.startsWith('//') ? r : '/', { replace: true });
    } catch (err) { setErreur(err.message); setEnvoi(false); }
  };

  return (
    <div className="auth-login">
      <AuthNav action={<Link to="/inscription" className="btn btn-primary btn-sm"><i className="bi bi-person-plus me-1"></i>Inscription</Link>} />
      <div className="login-container">
        <div className="login-card">
          <div className="login-grid">
            <div className="login-left">
              <div>
                <h2><i className="bi bi-shield-check me-2"></i>Bienvenue !</h2>
                <p>Connectez-vous pour accéder à votre espace personnel et profiter de tous nos services.</p>
                <ul className="feature-list">
                  {['Accès à vos commandes', 'Suivi de livraison en temps réel', 'Offres exclusives membres', 'Paiement sécurisé'].map((t) => <li key={t}><i className="bi bi-check-circle-fill"></i><span>{t}</span></li>)}
                </ul>
              </div>
            </div>
            <div className="login-right">
              <div className="login-header"><h3>Connexion</h3><p>Entrez vos identifiants pour vous connecter</p></div>
              {erreur && <div className="alert alert-danger" role="alert"><i className="bi bi-exclamation-triangle me-2"></i>{erreur}</div>}
              <form onSubmit={submit}>
                <div className="mb-3">
                  <label className="form-label"><i className="bi bi-envelope me-1"></i>Adresse email</label>
                  <div className="input-group"><span className="input-group-text"><i className="bi bi-envelope"></i></span>
                    <input type="email" className="form-control" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
                </div>
                <div className="mb-4">
                  <label className="form-label"><i className="bi bi-lock me-1"></i>Mot de passe</label>
                  <div className="input-group"><span className="input-group-text"><i className="bi bi-lock"></i></span>
                    <input type="password" className="form-control" placeholder="••••••••" value={mdp} onChange={(e) => setMdp(e.target.value)} required autoComplete="current-password" /></div>
                </div>
                <button type="submit" className="btn btn-primary w-100 mb-3" disabled={envoi}><i className="bi bi-box-arrow-in-right me-2"></i>{envoi ? 'Connexion…' : 'Se connecter'}</button>
              </form>
              <div className="divider"><span>ou</span></div>
              <div className="register-link">Pas encore de compte ? <Link to="/inscription"><i className="bi bi-person-plus me-1"></i>Créez un compte gratuitement</Link></div>
              <div className="register-link mt-2"><Link to="/admin/connexion"><i className="bi bi-shop me-1"></i>Espace vendeur / administrateur</Link></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
