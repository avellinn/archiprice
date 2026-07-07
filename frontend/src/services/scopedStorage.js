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

export function clearUserScopedStorage(userId) {
  if (!canUseBrowserStorage()) return;

  try {
    const scope = String(userId || '');
    const keysToRemove = [];

    // Clés à préserver même si elles contiennent le scope utilisateur —
    // elles doivent persister à travers les reconnexions et changements de session.
    const PRESERVED_KEY_PREFIXES = [
      'archiprice:catalogue_project_created_at:',
    ];

    for (let index = 0; index < window.localStorage.length; index++) {
      const key = window.localStorage.key(index);
      if (!key) continue;
      // Ne pas supprimer les clés protégées
      if (PRESERVED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) continue;
      if (scope && key.includes(`:${scope}`)) {
        keysToRemove.push(key);
      }
      if (key.startsWith('archiprice:supplier-')
        || key.startsWith('archiprice:workspace-')
        || key.startsWith('archiprice:catalogue-')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    // Note : archiprice:catalogue_project_created_at n'est PAS supprimé ici
    // car la période de grâce de 24h doit persister à travers les reconnexions.
    [
      'archiprice_admin_data',
      'archiprice:admin-hidden-simulations',
      'archiprice:user-dismissed-notifications',
      'archiprice:user-support-hidden-items',
      'archiprice_user_profile_preferences',
      'archiprice:admin-notifications-seen-at',
    ].forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // ignore storage errors
  }
}

export function clearBrowserSessionStorage() {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') return;

  try {
    window.sessionStorage.clear();
  } catch {
    // ignore storage errors
  }
}

export async function clearBrowserCaches() {
  if (typeof window === 'undefined' || !('caches' in window)) return;

  try {
    const cacheKeys = await window.caches.keys();
    await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
  } catch {
    // ignore cache API errors
  }
}

export function getScopedStorageKey(baseKey) {
  return `${baseKey}:${getCurrentStorageScope()}`;
}
