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

export function clearUserScopedStorage(userId, userEmail = '') {
  if (!canUseBrowserStorage()) return;

  try {
    const scope = String(userId || '');
    const emailScope = String(userEmail || '').toLowerCase();
    const keysToRemove = [];

    for (let index = 0; index < window.localStorage.length; index++) {
      const key = window.localStorage.key(index);
      if (!key) continue;
      if (scope && key.includes(`:${scope}`)) {
        keysToRemove.push(key);
      }
      if (emailScope && key.toLowerCase().includes(emailScope)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    window.localStorage.removeItem('archiprice_admin_data');
    window.localStorage.removeItem('archiprice:admin-hidden-simulations');
    window.localStorage.removeItem('archiprice:user-dismissed-notifications');
    window.localStorage.removeItem('archiprice:user-support-hidden-items');
  } catch {
    // ignore storage errors
  }
}

export function getScopedStorageKey(baseKey) {
  return `${baseKey}:${getCurrentStorageScope()}`;
}
