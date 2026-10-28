import type { AnomalyEvent, MachineProfile, Settings } from '@/types';

const EVENTS_KEY = 'suno.machine.events.v2';
const SETTINGS_KEY = 'suno.machine.settings.v2';
const PROFILES_KEY = 'suno.machine.profiles.v1';
const ACTIVE_KEY = 'suno.machine.active.v1';

export const defaultSettings = (): Settings => ({
  sensitivity: 6,
  soundAlarm: true,
  vibration: true,
  strictMode: false,
  calibrationSec: 3,
});

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* in-memory only */
  }
}

export const loadSettings = (): Settings => ({ ...defaultSettings(), ...read<Partial<Settings>>(SETTINGS_KEY, {}) });
export const saveSettings = (s: Settings) => write(SETTINGS_KEY, s);

export const loadEvents = (): AnomalyEvent[] => read<AnomalyEvent[]>(EVENTS_KEY, []);
export const saveEvents = (e: AnomalyEvent[]) => write(EVENTS_KEY, e.slice(0, 200));

export const defaultProfile = (): MachineProfile => ({
  id: 'm-default',
  name: 'Machine 1',
  sector: 'factory',
  baseline: null,
  createdAt: new Date().toISOString(),
});

export function loadProfiles(): MachineProfile[] {
  const p = read<MachineProfile[]>(PROFILES_KEY, []);
  return p.length ? p : [defaultProfile()];
}
export const saveProfiles = (p: MachineProfile[]) => write(PROFILES_KEY, p);
export const loadActiveId = (): string | null => read<string | null>(ACTIVE_KEY, null);
export const saveActiveId = (id: string) => write(ACTIVE_KEY, id);
