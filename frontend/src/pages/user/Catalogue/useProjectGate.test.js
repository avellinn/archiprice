import { describe, it, expect } from 'vitest';
import {
  getProjectGateGraceEnd,
  setProjectGateGraceEnd,
  isGraceActive,
  shouldOpenGate,
} from './useProjectGate.js';
import { clearUserScopedStorage, getScopedStorageKey } from '../../../services/scopedStorage.js';
import { TOKEN_KEY } from '../../../constants/storage.js';

function createMockLocalStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    key(index) {
      return Array.from(store.keys())[index] || null;
    },
    get length() {
      return store.size;
    },
  };
}

function base64UrlEncode(value) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function createJwtWithUserId(userId) {
  const payload = base64UrlEncode(JSON.stringify({ id: userId }));
  return `header.${payload}.signature`;
}

function setupWindow(userId) {
  const localStorage = createMockLocalStorage();
  global.window = {
    localStorage,
    setInterval: global.setInterval,
    clearInterval: global.clearInterval,
    atob: (value) => Buffer.from(value, 'base64').toString('binary'),
  };
  global.atob = global.window.atob;

  if (userId) {
    global.window.localStorage.setItem(TOKEN_KEY, createJwtWithUserId(userId));
  }

  return localStorage;
}

describe('useProjectGate grace period', () => {
  it('stores a timestamp under a scoped localStorage key', () => {
    const localStorage = setupWindow('user-1');

    const storageKey = getScopedStorageKey('archiprice:catalogue_project_created_at');
    setProjectGateGraceEnd();

    const stored = localStorage.getItem(storageKey);
    expect(stored).toBeTruthy();
    expect(stored).toMatch(/^\d+$/);
    expect(Number(stored)).toBeGreaterThan(Date.now() - 5000);
  });

  it('returns expiry timestamp and isGraceActive is true before 24h', () => {
    setupWindow('user-2');

    const fixedNow = 1700000000000;
    const originalDateNow = Date.now;
    Date.now = () => fixedNow;

    try {
      const storageKey = getScopedStorageKey('archiprice:catalogue_project_created_at');
      const createdAt = fixedNow - 3600_000;
      window.localStorage.setItem(storageKey, String(createdAt));

      expect(getProjectGateGraceEnd()).toBe(createdAt + 24 * 3600_000);
      expect(isGraceActive()).toBe(true);
    } finally {
      Date.now = originalDateNow;
    }
  });

  it('returns false after the grace period expires', () => {
    setupWindow('user-3');

    const fixedNow = 1700000000000;
    const originalDateNow = Date.now;
    Date.now = () => fixedNow;

    try {
      const storageKey = getScopedStorageKey('archiprice:catalogue_project_created_at');
      const createdAt = fixedNow - 24 * 3600_000 - 1;
      window.localStorage.setItem(storageKey, String(createdAt));

      expect(getProjectGateGraceEnd()).toBe(createdAt + 24 * 3600_000);
      expect(isGraceActive()).toBe(false);
    } finally {
      Date.now = originalDateNow;
    }
  });

  it('returns null for absent or invalid key', () => {
    setupWindow('user-4');

    const storageKey = getScopedStorageKey('archiprice:catalogue_project_created_at');
    expect(window.localStorage.getItem(storageKey)).toBeNull();
    expect(getProjectGateGraceEnd()).toBeNull();
    expect(isGraceActive()).toBe(false);

    window.localStorage.setItem(storageKey, 'invalid-timestamp');
    expect(getProjectGateGraceEnd()).toBeNull();
    expect(isGraceActive()).toBe(false);
  });

  it('isolates grace period keys per user', () => {
    setupWindow('user-a');

    const keyA = getScopedStorageKey('archiprice:catalogue_project_created_at');
    setProjectGateGraceEnd();

    window.localStorage.setItem(TOKEN_KEY, createJwtWithUserId('user-b'));
    const keyB = getScopedStorageKey('archiprice:catalogue_project_created_at');
    expect(keyA).not.toBe(keyB);
    expect(window.localStorage.getItem(keyB)).toBeNull();
    expect(window.localStorage.getItem(keyA)).toBeTruthy();
  });

  it('does not remove the grace period key when clearUserScopedStorage is called', () => {
    setupWindow('user-clear');
    const graceKey = getScopedStorageKey('archiprice:catalogue_project_created_at');
    setProjectGateGraceEnd();

    window.localStorage.setItem(`archiprice:workspace:user-clear`, 'draft');
    window.localStorage.setItem(`archiprice:catalogue:user-clear`, 'cached');
    window.localStorage.setItem('archiprice_admin_data', 'metadata');

    clearUserScopedStorage('user-clear');

    expect(window.localStorage.getItem(graceKey)).toBeTruthy();
    expect(window.localStorage.getItem(`archiprice:workspace:user-clear`)).toBeNull();
    expect(window.localStorage.getItem(`archiprice:catalogue:user-clear`)).toBeNull();
    expect(window.localStorage.getItem('archiprice_admin_data')).toBeNull();
  });

  it('prevents opening the gate while grace period is active', () => {
    setupWindow('user-gate');
    setProjectGateGraceEnd();

    expect(shouldOpenGate({
      activeProjectId: '',
      isProjectGateCompleted: false,
      isProjectGateForced: false,
      hasProjectInProgress: false,
      projectsChecked: true,
    })).toBe(false);
  });

  it('opens the gate when no grace period is active and all conditions permit it', () => {
    setupWindow('user-gate-2');

    expect(shouldOpenGate({
      activeProjectId: '',
      isProjectGateCompleted: false,
      isProjectGateForced: false,
      hasProjectInProgress: false,
      projectsChecked: true,
    })).toBe(true);
  });
});
