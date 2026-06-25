import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthContext from './authContext';
import { setUnauthorizedHandler } from '../services/api';
import {
  fetchMe,
  getStoredToken,
  changePassword as changePasswordRequest,
  login as loginRequest,
  register as registerRequest,
  setStoredToken,
  updateMe as updateMeRequest,
} from '../services/auth';
import { clearUserScopedStorage } from '../services/scopedStorage';
import { getRandomAvatarColor } from '../utils/userDisplay';

const AVATAR_COLOR_KEY = 'archiprice_avatar_color';
const AVATAR_LAST_COLOR_KEY = 'archiprice_last_avatar_color';

function withSessionAvatarColor(userData, shouldRefresh = false) {
  if (!userData) return userData;

  const previousSessionColor = (() => {
    try {
      return sessionStorage.getItem(AVATAR_COLOR_KEY);
    } catch {
      return '';
    }
  })();
  const previousStoredColor = (() => {
    try {
      return localStorage.getItem(AVATAR_LAST_COLOR_KEY);
    } catch {
      return '';
    }
  })();
  const previousColor = shouldRefresh ? previousStoredColor : previousSessionColor;

  const avatarColor = shouldRefresh || !previousSessionColor
    ? getRandomAvatarColor(previousColor)
    : previousSessionColor;

  try {
    sessionStorage.setItem(AVATAR_COLOR_KEY, avatarColor);
    localStorage.setItem(AVATAR_LAST_COLOR_KEY, avatarColor);
  } catch {
    // Le rendu peut continuer même si sessionStorage est indisponible.
  }

  return { ...userData, avatarColor };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getStoredToken()));

  const clearSession = useCallback(() => {
    setStoredToken(null);
    try {
      sessionStorage.removeItem(AVATAR_COLOR_KEY);
    } catch {
      // Ignore storage errors.
    }
    setUser(null);
  }, []);

  const applySession = useCallback((token, userData, shouldRefreshAvatar = false) => {
    setStoredToken(token);
    setUser(withSessionAvatarColor(userData, shouldRefreshAvatar));
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
        if (isActive) setUser(withSessionAvatarColor(userData));
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

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return undefined;

    let isActive = true;
    const refreshSession = () => {
      fetchMe()
        .then((userData) => {
          if (!isActive) return;
          setUser((currentUser) => withSessionAvatarColor({
            ...(currentUser || {}),
            ...userData,
            avatarColor: currentUser?.avatarColor,
          }));
        })
        .catch(() => {
          if (isActive) clearSession();
        });
    };

    const intervalId = window.setInterval(refreshSession, 15000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [clearSession, user?.id]);

  const login = useCallback(
    async (credentials) => {
      const { token, user: userData } = await loginRequest(credentials);
      clearUserScopedStorage(userData.id || userData._id, userData.email);
      applySession(token, userData, true);
      return userData;
    },
    [applySession],
  );

  const register = useCallback(
    async (payload) => {
      const { token, user: userData } = await registerRequest(payload);
      clearUserScopedStorage(userData.id || userData._id, userData.email);
      applySession(token, userData, true);
      return userData;
    },
    [applySession],
  );

  const updateProfile = useCallback(
    async (payload) => {
      const userData = await updateMeRequest(payload);
      setUser((currentUser) => withSessionAvatarColor({
        ...(currentUser || {}),
        ...userData,
        avatarColor: currentUser?.avatarColor,
      }));
      return userData;
    },
    [],
  );

  const changePassword = useCallback(
    async (payload) => changePasswordRequest(payload),
    [],
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
      updateProfile,
      changePassword,
      logout,
    }),
    [user, loading, login, register, updateProfile, changePassword, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
