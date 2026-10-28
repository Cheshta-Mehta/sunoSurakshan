import type { AnomalyEvent } from '@/types';

const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function eventsToCsv(events: AnomalyEvent[]): string {
  const head = ['time', 'machine', 'severity', 'type', 'score', 'hint', 'acknowledged_at'];
  const rows = events.map((e) =>
    [e.timestamp, e.machineName, e.severity, e.kind, e.score.toFixed(2), e.hint, e.acknowledgedAt ?? ''].map(esc).join(','),
  );
  return [head.join(','), ...rows].join('\n');
}

export function downloadCsv(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
