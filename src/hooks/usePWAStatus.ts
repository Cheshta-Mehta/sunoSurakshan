import { useCallback, useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

export type SWState = 'idle' | 'registering' | 'installed' | 'error';

export interface PWAStatus {
  swState: SWState;
  /** True only after the service worker reports it has finished caching all precache entries. */
  offlineReady: boolean;
  /** True when a new SW version is waiting to activate. */
  needRefresh: boolean;
  /** Error message if registration failed. */
  error: string | null;
  /** Force-activate the waiting service worker. */
  updateSW: () => Promise<void>;
}

export function usePWAStatus(): PWAStatus {
  const [swState, setSwState] = useState<SWState>('idle');
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateFn, setUpdateFn] = useState<() => Promise<void>>(async () => {});

  useEffect(() => {
    const updateSW = registerSW({
      immediate: true,
      onRegisterError(regError) {
        setError(regError?.message ?? 'Service worker registration failed');
        setSwState('error');
      },
      onRegisteredSW(_swUrl, registration) {
        setSwState('installed');
        void registration?.update();
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
      onNeedRefresh() {
        setNeedRefresh(true);
      },
    });

    setUpdateFn(() => async () => {
      await updateSW(true);
    });
  }, []);

  const handleUpdateSW = useCallback(async () => {
    await updateFn();
    setNeedRefresh(false);
  }, [updateFn]);

  return {
    swState,
    offlineReady,
    needRefresh,
    error,
    updateSW: handleUpdateSW,
  };
}
