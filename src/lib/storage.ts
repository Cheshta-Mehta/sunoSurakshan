import type { DetectionEvent, SoundSettings } from '@/types';
import { SOUND_CATEGORIES } from '@/audio/soundCategories';

const EVENTS_KEY = 'suno.events.v1';
const SETTINGS_KEY = 'suno.settings.v1';

export const defaultSettings = (): SoundSettings => {
  const enabled: Record<string, boolean> = {};
  const thresholds: Record<string, number> = {};
  for (const cat of SOUND_CATEGORIES) {
    enabled[cat.id] = true;
    thresholds[cat.id] = cat.defaultThreshold;
  }
  return { enabled, thresholds, cooldownMs: 5000, vibration: true, visualFlash: true, soundAlarm: true, confirmCount: 1 };
};

export function loadSettings(): SoundSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw) as Partial<SoundSettings>;
    return { ...defaultSettings(), ...parsed };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings: SoundSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage may be unavailable; settings stay in-memory only */
  }
}

export function loadEvents(): DetectionEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DetectionEvent[];
  } catch {
    return [];
  }
}

export function saveEvents(events: DetectionEvent[]): void {
  try {
    // Cap history to keep localStorage small; keep newest 200.
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(0, 200)));
  } catch {
    /* ignore quota errors */
  }
}

export function clearEvents(): void {
  try {
    localStorage.removeItem(EVENTS_KEY);
  } catch {
    /* ignore */
  }
}
