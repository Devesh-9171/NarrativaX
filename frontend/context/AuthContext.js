import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

function getStoredToken() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem('token') || '';
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearAuthState = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('token');
    }
    setTokenState('');
    setUser(null);
    setLoading(false);
  }, []);

  const fetchCurrentUser = useCallback(async (nextToken) => {
    const activeToken = nextToken || getStoredToken();
    if (!activeToken) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      setLoading(true);
      const response = await api.get('/user/me', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setUser(response.data || null);
      return response.data || null;
    } catch (_error) {
      clearAuthState();
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearAuthState]);

  const setToken = useCallback(async (nextToken) => {
    if (typeof window !== 'undefined') {
      if (nextToken) window.localStorage.setItem('token', nextToken);
      else window.localStorage.removeItem('token');
    }

    setTokenState(nextToken || '');

    if (!nextToken) {
      setUser(null);
      setLoading(false);
      return null;
    }

    return fetchCurrentUser(nextToken);
  }, [fetchCurrentUser]);

  useEffect(() => {
    const nextToken = getStoredToken();
    setTokenState(nextToken);
    fetchCurrentUser(nextToken);

    const onStorage = (event) => {
      if (event.key !== 'token') return;
      const updatedToken = event.newValue || '';
      setTokenState(updatedToken);
      fetchCurrentUser(updatedToken);
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [fetchCurrentUser]);

  const value = useMemo(() => ({
    token,
    user,
    loading,
    setToken,
    refreshUser: () => fetchCurrentUser(token),
    clearAuthState
  }), [clearAuthState, fetchCurrentUser, loading, setToken, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
