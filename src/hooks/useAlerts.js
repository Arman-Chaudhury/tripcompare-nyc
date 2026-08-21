import { useEffect, useState } from 'react';
import { loadAlerts, readCache, ALERT_TTL_MS } from '../lib/alerts.js';

export function useAlerts() {
  const [state, setState] = useState(() => ({ data: readCache(), status: 'loading', online: navigator.onLine }));

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      if (!navigator.onLine) {
        setState((s) => ({ ...s, status: 'offline', online: false }));
        return;
      }
      try {
        const data = await loadAlerts();
        if (!cancelled) setState({ data, status: 'ok', online: true });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, status: 'failed', online: navigator.onLine }));
      }
    };
    refresh();
    const id = setInterval(refresh, ALERT_TTL_MS);
    const on = () => refresh();
    const off = () => setState((s) => ({ ...s, status: 'offline', online: false }));
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return state;
}
