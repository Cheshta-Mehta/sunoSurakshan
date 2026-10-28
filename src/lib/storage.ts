import type { AnomalyEvent, Settings } from '@/types';

const EVENTS_KEY = 'suno.machine.events.v1';
const SETTINGS_KEY = 'suno.machine.settings.v1';

export const defaultSettings = (): Settings => ({ sensitivity: 6, soundAlarm: true, vibration: true });

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultSettings(), ...(JSON.parse(raw) as Partial<Settings>) } : defaultSettings();
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* in-memory only */
  }
}

export function loadEvents(): AnomalyEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as AnomalyEvent[]) : [];
  } catch {
    return [];
  }
}

export function saveEvents(events: AnomalyEvent[]): void {
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(0, 200)));
  } catch {
    /* ignore */
  }
}
