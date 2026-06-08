import { TOKEN_KEY } from '../constants/storage';

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decodedPayload = window.atob(normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '='));
    return JSON.parse(decodedPayload);
  } catch {
    return null;
  }
}

export function getCurrentStorageScope() {
  if (!canUseBrowserStorage()) return 'anonymous';

  try {
    const token = window.localStorage.getItem(TOKEN_KEY);
    const payload = token ? decodeJwtPayload(token) : null;
    return String(payload?.id || payload?._id || payload?.sub || 'anonymous');
  } catch {
    return 'anonymous';
  }
}

export function getScopedStorageKey(baseKey) {
  return `${baseKey}:${getCurrentStorageScope()}`;
}
