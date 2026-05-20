import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthContext from './authContext';
import { setUnauthorizedHandler } from '../services/api';
import {
  fetchMe,
  getStoredToken,
  login as loginRequest,
  register as registerRequest,
  setStoredToken,
} from '../services/auth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getStoredToken()));

  const clearSession = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  const applySession = useCallback((token, userData) => {
    setStoredToken(token);
    setUser(userData);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    if (!loading) return undefined;

    let isActive = true;

    fetchMe()
      .then((userData) => {
        if (isActive) setUser(userData);
      })
      .catch(() => {
        if (isActive) clearSession();
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [clearSession, loading]);

  const login = useCallback(
    async (credentials) => {
      const { token, user: userData } = await loginRequest(credentials);
      applySession(token, userData);
      return userData;
    },
    [applySession],
  );

  const register = useCallback(
    async (payload) => {
      const { token, user: userData } = await registerRequest(payload);
      applySession(token, userData);
      return userData;
    },
    [applySession],
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
