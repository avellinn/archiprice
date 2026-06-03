import { getApiBaseUrl } from '../config/env';
import { TOKEN_KEY } from '../constants/storage';

export const REALTIME_EVENT = 'archiprice:realtime-event';

function getStoredToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return '';
  }
}

function getRealtimeUrl(token) {
  const baseUrl = getApiBaseUrl();
  const route = `/api/realtime?token=${encodeURIComponent(token)}`;
  return baseUrl ? `${baseUrl}${route}` : route;
}

function emitRealtimeEvent(payload) {
  window.dispatchEvent(new CustomEvent(REALTIME_EVENT, { detail: payload }));
}

export function connectRealtime({ onEvent } = {}) {
  if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
    return () => {};
  }

  const token = getStoredToken();
  if (!token) return () => {};

  const source = new window.EventSource(getRealtimeUrl(token));

  source.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      emitRealtimeEvent(payload);
      onEvent?.(payload);
    } catch {
      // Un message SSE invalide ne doit pas casser l'interface.
    }
  };

  source.onerror = () => {
    // EventSource gère la reconnexion; on laisse le navigateur réessayer.
  };

  return () => source.close();
}
