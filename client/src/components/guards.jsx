import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';

export const Spinner = () => (
  <div className="d-flex justify-content-center align-items-center py-5">
    <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Chargement…</span></div>
  </div>
);

/** Pages client protégées : redirige vers /connexion?redirect=... (comme header('Location: connexion.php?redirect=...')) */
export function RequireUser() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to={`/connexion?redirect=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return <Outlet />;
}
/** Redirige un client déjà connecté (connexion / inscription) */
export function RedirectIfUser() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
/** Pages admin protégées */
export function RequireAdmin({ superOnly = false, vendeurOnly = false }) {
  const { admin, estSuperAdmin, loading } = useAdminAuth();
  if (loading) return <Spinner />;
  if (!admin) return <Navigate to="/admin/connexion" replace />;
  if ((superOnly && !estSuperAdmin) || (vendeurOnly && estSuperAdmin)) return <Navigate to="/admin" replace />;
  return <Outlet />;
}
export function RedirectIfAdmin() {
  const { admin, loading } = useAdminAuth();
  if (loading) return <Spinner />;
  if (admin) return <Navigate to="/admin" replace />;
  return <Outlet />;
}
