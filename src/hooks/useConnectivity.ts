import { useEffect, useState } from 'react';
import type { ConnectivityState } from '@/types';

/**
 * Tracks browser online/offline status via the Network Information APIs.
 * `navigator.onLine` is the source of truth; this keeps React state in sync.
 */
export function useConnectivity(): ConnectivityState {
  const [state, setState] = useState<ConnectivityState>(
    typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
  );

  useEffect(() => {
    const on = () => setState('online');
    const off = () => setState('offline');
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return state;
}
