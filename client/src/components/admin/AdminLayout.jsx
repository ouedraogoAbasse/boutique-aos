import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import api from '../../lib/api.js';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { NOTIF_ICONS, NOTIF_COLORS, tempsNotification } from '../../lib/utils.js';
import './admin.css';
import './notif.css';

const TITRES = {
  '/admin': 'Dashboard', '/admin/produits': 'Produits', '/admin/vendeurs': 'Vendeurs', '/admin/utilisateurs': 'Utilisateurs',
  '/admin/commandes': 'Commandes', '/admin/profil': 'Mon Profil', '/admin/notifications': 'Notifications', '/admin/messagerie': 'Messagerie',
  '/admin/livreurs': 'Livreurs', '/admin/commissions': 'Mes Commissions', '/admin/mes-numeros-paiement': 'Mes numéros de paiement',
};

function MenuNotifications({ admin, onChange }) {
  const [data, setData] = useState({ notifications: [], nb_non_lues: 0 });
  const nav = useNavigate();
  const charger = useCallback(() => api.get('/admin/notifications', { limite: 10 }).then(setData).catch(() => {}), []);
  useEffect(() => { charger(); }, [charger, onChange]);

  async function ouvrir(n) {
    try { await api.post(`/admin/notifications/${n.id}/lire`); } catch { /* ignore */ }
    charger();
    nav(n.lien ? (n.lien.startsWith('/') ? n.lien : `/admin/${n.lien.replace(/\.php.*$/, '')}`) : '/admin');
  }
  async function toutesLues(e) { e.preventDefault(); await api.post('/admin/notifications/lire-toutes'); charger(); }

  const nb = data.nb_non_lues;
  return (
    <div className="dropdown">
      <button className="btn btn-link position-relative p-2" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        <i className="bi bi-bell fs-4 text-dark"></i>
        {nb > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger notification-badge-custom">{nb > 9 ? '9+' : nb}</span>}
      </button>
      <div className="dropdown-menu dropdown-menu-end notification-dropdown">
        <div className="dropdown-header d-flex justify-content-between align-items-center">
          <strong>Notifications</strong>
          {nb > 0 && <a href="#" onClick={toutesLues} className="btn btn-sm btn-link p-0">Tout marquer comme lu</a>}
        </div>
        <div className="dropdown-divider"></div>
        {data.notifications.length === 0 ? (
          <div className="dropdown-item text-center text-muted py-3"><i className="bi bi-bell-slash fs-3 d-block mb-2"></i>Aucune notification</div>
        ) : (<>
          <div className="notification-list">
            {data.notifications.map((n) => (
              <a key={n.id} href="#" onClick={(e) => { e.preventDefault(); ouvrir(n); }} className={`dropdown-item notification-item ${n.lu ? '' : 'unread'}`}>
                <div className="d-flex">
                  <div className={`notification-icon text-${NOTIF_COLORS[n.importance] || 'secondary'}`}><i className={`bi bi-${NOTIF_ICONS[n.type] || 'info-circle'}`}></i></div>
                  <div className="flex-grow-1 ms-2">
                    <div className="notification-title">{n.titre}</div>
                    <div className="notification-message">{n.message}</div>
                    <div className="notification-time">{tempsNotification(n.date_creation)}</div>
                  </div>
                  {!n.lu && <div className="notification-badge"></div>}
                </div>
              </a>
            ))}
          </div>
          <div className="dropdown-divider"></div>
          <Link to="/admin/notifications" className="dropdown-item text-center text-primary"><i className="bi bi-arrow-right"></i> Voir toutes les notifications</Link>
        </>)}
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { admin, estSuperAdmin, messagesNonLus, refresh, logout } = useAdminAuth();
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState(null);
  const [tick, setTick] = useState(0);
  const derniere = useRef(null);
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => { setMenu(false); }, [loc.pathname]);

  // Polling des nouvelles notifications (check_notifications.php), toutes les 30 s
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const d = await api.get('/admin/notifications/check');
        if (d.nouvelles > 0 && d.derniere && d.derniere.id !== derniere.current) {
          derniere.current = d.derniere.id; setToast(d.derniere); setTick((x) => x + 1); refresh();
          setTimeout(() => setToast(null), 6000);
        }
      } catch { /* ignore */ }
    }, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  const titre = TITRES[loc.pathname] || (loc.pathname.startsWith('/admin/commandes/') ? 'Commandes' : loc.pathname.startsWith('/admin/utilisateurs/') ? 'Utilisateurs' : loc.pathname.startsWith('/admin/messagerie/') ? 'Messagerie' : 'Administration');
  const lien = (to, icon, label, end) => (
    <li className="nav-item"><NavLink to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><i className={`bi ${icon}`}></i> {label}</NavLink></li>
  );
  async function sortir(e) { e.preventDefault(); await logout(); nav('/admin/connexion'); }

  return (
    <div className="admin admin-notif">
      <div className="container-fluid"><div className="row">
        <nav className={`col-md-3 col-lg-2 d-md-block admin-sidebar ${menu ? 'show' : ''}`} id="sidebar">
          <div className="sidebar-header">
            <h2><img src="/logo.jpg" alt="AOS Logo" /> <span className="d-none d-md-inline">AOS Multi-service International</span><span className="d-md-none">AOS</span></h2>
            <div className="mt-2">{estSuperAdmin
              ? <span className="badge bg-warning text-dark"><i className="bi bi-shield-fill-check"></i> Super Admin</span>
              : <span className="badge bg-info"><i className="bi bi-shop"></i> Vendeur</span>}</div>
          </div>
          <ul className="nav flex-column sidebar-menu">
            {lien('/admin', 'bi-speedometer2', 'Dashboard', true)}
            {lien('/admin/produits', 'bi-box-seam', estSuperAdmin ? 'Tous les Produits' : 'Mes Produits')}
            {estSuperAdmin && <>{lien('/admin/utilisateurs', 'bi-people', 'Utilisateurs')}{lien('/admin/vendeurs', 'bi-person-badge', 'Gestion Vendeurs')}{lien('/admin/livreurs', 'bi-scooter', 'Livreurs')}</>}
            {lien('/admin/commandes', 'bi-cart-check', estSuperAdmin ? 'Toutes les Commandes' : 'Mes Commandes')}
            <li className="nav-item"><NavLink to="/admin/messagerie" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><i className="bi bi-chat-dots"></i> Messagerie
              {messagesNonLus > 0 && <span className="badge bg-danger rounded-pill float-end">{messagesNonLus}</span>}</NavLink></li>
            {!estSuperAdmin && <>{lien('/admin/commissions', 'bi-cash-coin', 'Mes Commissions')}{lien('/admin/mes-numeros-paiement', 'bi-phone', 'Mes numéros de paiement')}</>}
            {lien('/admin/profil', 'bi-person-circle', 'Mon Profil')}
            <li className="nav-item mt-4"><a href="#" className="nav-link text-danger" onClick={sortir}><i className="bi bi-box-arrow-right"></i> Déconnexion</a></li>
          </ul>
        </nav>
        <div className={`overlay ${menu ? 'show' : ''}`} onClick={() => setMenu(false)}></div>

        <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4 py-3">
          <div className="admin-header"><div className="container-fluid"><div className="row align-items-center">
            <div className="col-6 col-md-6">
              <button className="btn btn-link mobile-menu-toggle d-md-none p-0" onClick={() => setMenu((m) => !m)}><i className="bi bi-list fs-3 text-dark"></i></button>
              <h1 className="d-inline-block ms-2 ms-md-0">{titre}</h1>
            </div>
            <div className="col-6 col-md-6"><div className="d-flex justify-content-end align-items-center gap-3">
              <MenuNotifications admin={admin} onChange={tick} />
              <div className="user-info justify-content-end">
                <div className="user-avatar">{admin.nom[0].toUpperCase()}</div>
                <div className="d-none d-md-block text-start"><small className="text-muted d-block">Connecté en tant que</small><strong>{admin.nom}</strong>
                  {!estSuperAdmin && admin.boutique && <><br /><small className="text-muted">{admin.boutique}</small></>}</div>
              </div>
            </div></div>
          </div></div></div>
          <div className="container-fluid"><Outlet /></div>
          <footer className="admin-footer mt-4"><div className="container-fluid"><div className="row">
            <div className="col-md-6 text-center text-md-start mb-3 mb-md-0"><p className="mb-0"><strong>AOS Multi-Service International</strong><br /><small className="text-muted">Votre partenaire de confiance pour tous vos besoins</small></p></div>
            <div className="col-md-6 text-center text-md-end"><p className="mb-0"><i className="bi bi-c-circle"></i> {new Date().getFullYear()} Tous droits réservés</p></div>
          </div></div></footer>
        </main>
      </div></div>

      {toast && (
        <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 2000 }}>
          <div className="toast show" role="alert">
            <div className="toast-header"><i className="bi bi-bell-fill text-primary me-2"></i><strong className="me-auto">Nouvelle notification</strong>
              <small className="text-muted">À l'instant</small><button type="button" className="btn-close" onClick={() => setToast(null)}></button></div>
            <div className="toast-body"><strong>{toast.titre}</strong><br /><small>{toast.message}</small></div>
          </div>
        </div>
      )}
    </div>
  );
}
