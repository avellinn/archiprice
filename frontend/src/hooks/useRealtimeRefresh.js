import { useEffect, useRef } from 'react';
import { REALTIME_EVENT } from '../services/realtime';

/**
 * Recharge les données quand le backend publie un événement SSE correspondant.
 * @param {() => void} refresh - fonction de rechargement (fetch, load, etc.)
 * @param {string[]|null} entities - entités à écouter ; null = toutes les entités CRUD
 */
export default function useRealtimeRefresh(refresh, entities = null) {
  const refreshRef = useRef(refresh);
  const entitiesKey = Array.isArray(entities) ? [...entities].sort().join('|') : '*';

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (typeof refreshRef.current !== 'function') return undefined;
    const acceptedEntities = entitiesKey === '*' ? null : new Set(entitiesKey.split('|'));
    let debounceTimer;

    function scheduleRefresh() {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => refreshRef.current?.(), 120);
    }

    function handleRealtimeEvent(event) {
      const payload = event?.detail;
      if (!payload || payload.type === 'connected') return;

      const entity = String(payload.entity || '');
      if (acceptedEntities && !acceptedEntities.has(entity)) return;

      scheduleRefresh();
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') scheduleRefresh();
    }

    window.addEventListener(REALTIME_EVENT, handleRealtimeEvent);
    window.addEventListener('focus', scheduleRefresh);
    window.addEventListener('archiprice:dashboard-refresh', scheduleRefresh);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearTimeout(debounceTimer);
      window.removeEventListener(REALTIME_EVENT, handleRealtimeEvent);
      window.removeEventListener('focus', scheduleRefresh);
      window.removeEventListener('archiprice:dashboard-refresh', scheduleRefresh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [entitiesKey]);
}
