import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api.js';

const AuthContext = createContext(null);

/** Session CLIENT (équivalent de estConnecte()/getUtilisateur() + compteurs du header PHP) */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, cartCount: 0, messagesNonLus: 0, loading: true });

  const refresh = useCallback(async () => {
    try {
      const d = await api.get('/auth/me');
      setState({ user: d.user, cartCount: Number(d.cart_count) || 0, messagesNonLus: Number(d.messages_non_lus) || 0, loading: false });
      return d.user;
    } catch {
      setState((s) => ({ ...s, user: null, loading: false }));
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, mot_de_passe) => {
    const d = await api.post('/auth/login', { email, mot_de_passe });
    await refresh();
    return d.user;
  }, [refresh]);

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setState({ user: null, cartCount: 0, messagesNonLus: 0, loading: false });
  }, []);

  const value = useMemo(() => ({ ...state, refresh, login, logout }), [state, refresh, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
