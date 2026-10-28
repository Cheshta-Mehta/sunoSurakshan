import { useCallback, useEffect, useState } from 'react';
import type { SoundSettings } from '@/types';
import { loadSettings, saveSettings } from '@/lib/storage';

/**
 * Settings persisted to localStorage. Exposes typed accessors and
 * per-category toggle/threshold helpers used by the settings screen.
 */
export function useSettings() {
  const [settings, setSettings] = useState<SoundSettings>(() => loadSettings());

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const toggleCategory = useCallback((id: string, enabled: boolean) => {
    setSettings((s) => ({ ...s, enabled: { ...s.enabled, [id]: enabled } }));
  }, []);

  const setThreshold = useCallback((id: string, threshold: number) => {
    setSettings((s) => ({ ...s, thresholds: { ...s.thresholds, [id]: threshold } }));
  }, []);

  const setOption = useCallback(
    (key: 'cooldownMs' | 'vibration' | 'visualFlash' | 'soundAlarm' | 'confirmCount', value: number | boolean) => {
      setSettings((s) => ({ ...s, [key]: value }) as SoundSettings);
    },
    [],
  );

  return { settings, toggleCategory, setThreshold, setOption };
}
