import { useEffect } from 'react';
import { REALTIME_EVENT } from '../services/realtime';

/**
 * Recharge les données quand le backend publie un événement SSE correspondant.
 * @param {() => void} refresh - fonction de rechargement (fetch, load, etc.)
 * @param {string[]|null} entities - entités à écouter ; null = toutes les entités CRUD
 */
export default function useRealtimeRefresh(refresh, entities = null) {
  useEffect(() => {
    if (typeof refresh !== 'function') return undefined;

    function handleRealtimeEvent(event) {
      const payload = event?.detail;
      if (!payload || payload.type === 'connected') return;

      const entity = String(payload.entity || '');
      if (Array.isArray(entities) && entities.length > 0 && !entities.includes(entity)) return;

      refresh();
    }

    window.addEventListener(REALTIME_EVENT, handleRealtimeEvent);
    return () => window.removeEventListener(REALTIME_EVENT, handleRealtimeEvent);
  }, [refresh, entities]);
}
