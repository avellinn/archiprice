import axios from 'axios';
import { getApiBaseUrl } from '../config/env';
import { TOKEN_KEY } from '../constants/storage';

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

let onUnauthorized = null;

function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function clearStoredToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage indisponible: l'état React sera nettoyé par le handler.
  }
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if ([401, 403].includes(error.response?.status) && !error.config?.skipUnauthorizedHandler) {
      clearStoredToken();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error, fallback = 'Une erreur est survenue') {
  return error.response?.data?.error ?? error.message ?? fallback;
}

export default api;
