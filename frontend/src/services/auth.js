import { API_ROUTES } from '../constants/api';
import { TOKEN_KEY } from '../constants/storage';
import api from './api';

const LEGACY_TOKEN_KEY = 'token';

export function getStoredToken() {
  try {
    const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (legacy && !localStorage.getItem(TOKEN_KEY)) {
      localStorage.setItem(TOKEN_KEY, legacy);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    }
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Le mode privé peut bloquer le stockage; l'état React reste la source active.
  }
}

export async function register(payload) {
  const { data } = await api.post(API_ROUTES.auth.register, payload);
  return data;
}

export async function login({ email, password }) {
  const { data } = await api.post(API_ROUTES.auth.login, { email, password });
  return data;
}

export async function requestPasswordReset(email) {
  const { data } = await api.post(API_ROUTES.auth.forgotPassword, { email });
  return data;
}

export async function resetPassword({ token, password }) {
  const { data } = await api.post(API_ROUTES.auth.resetPassword, { token, password });
  return data;
}

export async function fetchMe() {
  const { data } = await api.get(API_ROUTES.auth.me);
  return data.user;
}

export async function updateMe(payload) {
  const { data } = await api.patch(API_ROUTES.auth.updateMe, payload);
  return data.user;
}

export async function changePassword(payload) {
  const { data } = await api.patch(API_ROUTES.auth.changePassword, payload);
  return data;
}
