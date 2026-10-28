/** Daily average anomaly score per machine -> health % and 7-day trend. */
const KEY = 'suno.machine.health.v1';
type Store = Record<string, Record<string, { sum: number; n: number }>>;

const localDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function load(): Store {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Store;
  } catch {
    return {};
  }
}

export function addHealth(machineId: string, sum: number, n: number): void {
  if (!n) return;
  try {
    const s = load();
    const d = localDay();
    const cur = (s[machineId] ??= {})[d] ?? { sum: 0, n: 0 };
    s[machineId][d] = { sum: cur.sum + sum, n: cur.n + n };
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export interface TrendPoint {
  day: string;
  avg: number;
}

export function getTrend(machineId: string, days = 7): TrendPoint[] {
  const m = load()[machineId] ?? {};
  return Object.keys(m)
    .sort()
    .slice(-days)
    .map((day) => ({ day, avg: m[day].sum / m[day].n }));
}

/** avg score ~1 (normal) => 100%, avg at alarm threshold => 0%. */
export const healthPct = (avg: number, threshold: number) =>
  Math.round(Math.max(0, Math.min(100, 100 - (Math.max(0, avg - 1) / Math.max(0.5, threshold - 1)) * 100)));
