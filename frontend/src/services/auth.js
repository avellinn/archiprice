import { API_ROUTES } from '../constants/api';
import { TOKEN_KEY } from '../constants/storage';
import api from './api';

const LEGACY_TOKEN_KEY = 'token';

export function getStoredToken() {
  const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacy && !localStorage.getItem(TOKEN_KEY)) {
    localStorage.setItem(TOKEN_KEY, legacy);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function register({ name, email, password }) {
  const { data } = await api.post(API_ROUTES.auth.register, { name, email, password });
  return data;
}

export async function login({ email, password }) {
  const { data } = await api.post(API_ROUTES.auth.login, { email, password });
  return data;
}

export async function fetchMe() {
  const { data } = await api.get(API_ROUTES.auth.me);
  return data.user;
}
