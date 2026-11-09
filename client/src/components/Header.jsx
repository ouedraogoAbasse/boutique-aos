import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Header() {
  const { user, cartCount, messagesNonLus, logout } = useAuth();
  const navigate = useNavigate();
  const onLogout = async () => { await logout(); navigate('/'); };
  return (
    <>
      <nav className="navbar navbar-expand-lg sticky-top bg-white">
        <div className="container">
          <Link to="/" className="navbar-brand logo">
            <img src="/logo.jpg" alt="AOS Logo" />
            <span className="d-none d-xxl-inline">AOS Multi-service International</span>
            <span className="d-xxl-none">AOS Multi-service</span>
          </Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav mx-auto">
              <li className="nav-item"><NavLink className="nav-link" to="/" end>Accueil</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/produits" end>Produits</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/produits?type=informatique">Informatique</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/produits?type=vetement">Vêtements</NavLink></li>
            </ul>
            <div className="d-flex gap-2 align-items-center flex-nowrap text-nowrap">
              {user ? (
                <>
                  <span className="text-muted small d-none d-xxl-inline text-nowrap">Bonjour, {user.prenom}</span>
                  <Link to="/mon-compte" className="btn btn-outline-primary btn-sm">Mon Compte</Link>
                  <Link to="/messages" className="position-relative btn btn-outline-secondary btn-sm">
                    <i className="bi bi-chat-dots"></i><span className="d-none d-xxl-inline ms-1">Messages</span>
                    {messagesNonLus > 0 && <span className="message-badge">{messagesNonLus}</span>}
                  </Link>
                  <Link to="/panier" className="cart-icon">
                    <i className="bi bi-cart3"></i>
                    {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
                  </Link>
                  <button className="btn btn-secondary btn-sm" onClick={onLogout}>Déconnexion</button>
                </>
              ) : (
                <>
                  <Link to="/connexion" className="btn btn-outline-primary btn-sm">Connexion</Link>
                  <Link to="/inscription" className="btn btn-primary btn-sm">Inscription</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
