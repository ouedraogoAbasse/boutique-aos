import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api.js';

const AdminAuthContext = createContext(null);

/** Session ADMIN/VENDEUR (équivalent de estAdminConnecte()/getAdmin()/estSuperAdmin()) */
export function AdminAuthProvider({ children }) {
  const [state, setState] = useState({ admin: null, estSuperAdmin: false, messagesNonLus: 0, notificationsNonLues: 0, loading: true });

  const refresh = useCallback(async () => {
    try {
      const d = await api.get('/admin/auth/me');
      setState({
        admin: d.admin,
        estSuperAdmin: !!d.est_super_admin,
        messagesNonLus: Number(d.messages_non_lus) || 0,
        notificationsNonLues: Number(d.notifications_non_lues) || 0,
        loading: false,
      });
      return d.admin;
    } catch {
      setState((s) => ({ ...s, admin: null, loading: false }));
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, mot_de_passe) => {
    const d = await api.post('/admin/auth/login', { email, mot_de_passe });
    await refresh();
    return d.admin;
  }, [refresh]);

  const logout = useCallback(async () => {
    await api.post('/admin/auth/logout');
    setState({ admin: null, estSuperAdmin: false, messagesNonLus: 0, notificationsNonLues: 0, loading: false });
  }, []);

  const value = useMemo(() => ({ ...state, refresh, login, logout }), [state, refresh, login, logout]);
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
export const useAdminAuth = () => useContext(AdminAuthContext);
