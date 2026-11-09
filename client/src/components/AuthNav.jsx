import { Link } from 'react-router-dom';

/** Barre de navigation minimale des pages connexion / inscription (comme le PHP) */
export default function AuthNav({ action }) {
  return (
    <nav className="navbar">
      <div className="container">
        <div className="d-flex justify-content-between align-items-center w-100">
          <Link to="/" className="navbar-brand logo d-flex align-items-center gap-2">
            <img src="/logo.jpg" alt="AOS Logo" style={{ width: 50, height: 50, objectFit: 'contain', borderRadius: 8 }} />
            <span className="d-none d-md-inline">AOS Multi-service International</span><span className="d-md-none">AOS</span>
          </Link>
          <div className="d-flex gap-3 align-items-center">
            <Link to="/" className="nav-link d-none d-md-inline">Accueil</Link>
            <Link to="/produits" className="nav-link d-none d-md-inline">Produits</Link>
            {action}
          </div>
        </div>
      </div>
    </nav>
  );
}
