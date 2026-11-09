import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import './AdminLoginPage.css';

export default function AdminLoginPage() {
  const { login } = useAdminAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [erreur, setErreur] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErreur('');
    try { await login(email, mdp); nav(sp.get('redirect') || '/admin', { replace: true }); }
    catch (err) { setErreur(err.message); setBusy(false); }
  }
  return (
    <div className="admin-login-page"><div className="admin-login">
      <h1>🔐 Administration</h1>
      {erreur && <div className="alert alert-error alert-danger">{erreur}</div>}
      <form onSubmit={submit}>
        <div className="form-group"><label htmlFor="email">Email</label><input type="email" id="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="form-group"><label htmlFor="mot_de_passe">Mot de passe</label><input type="password" id="mot_de_passe" required value={mdp} onChange={(e) => setMdp(e.target.value)} /></div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>Se connecter</button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 20 }}><Link to="/">← Retour au site</Link></p>
    </div></div>
  );
}
