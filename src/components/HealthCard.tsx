import { useEffect, useState } from 'react';
import { getTrend, healthPct, type TrendPoint } from '@/lib/health';

export function HealthCard({ machineId, threshold }: { machineId: string; threshold: number }) {
  const [trend, setTrend] = useState<TrendPoint[]>([]);

  useEffect(() => {
    const load = () => setTrend(getTrend(machineId));
    load();
    const t = window.setInterval(load, 5000);
    return () => window.clearInterval(t);
  }, [machineId]);

  if (trend.length === 0) {
    return (
      <section className="rounded-2xl border border-ink-500 bg-ink-800 p-4">
        <h2 className="font-semibold">Machine health trend</h2>
        <p className="mt-1 text-sm text-slate-400">Keep monitoring - daily health appears here after about 30 s.</p>
      </section>
    );
  }

  const pcts = trend.map((p) => healthPct(p.avg, threshold));
  const today = pcts[pcts.length - 1];
  const worsening = pcts.length >= 3 && pcts[pcts.length - 1] <= pcts[0] - 15;

  return (
    <section className="rounded-2xl border border-ink-500 bg-ink-800 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Machine health trend</h2>
        <span className={`font-mono text-2xl font-bold ${today >= 70 ? 'text-green-300' : today >= 40 ? 'text-amber-300' : 'text-red-300'}`}>
          {today}%
        </span>
      </div>
      <div className="mt-3 flex h-16 items-end gap-2">
        {trend.map((p, i) => (
          <div key={p.day} className="flex flex-1 flex-col items-center gap-1">
            <div className="w-full rounded-t bg-teal-400/80" style={{ height: `${Math.max(4, pcts[i] * 0.5)}px` }} />
            <span className="text-[10px] text-slate-500">{p.day.slice(5)}</span>
          </div>
        ))}
      </div>
      {worsening && (
        <p className="mt-2 text-sm text-amber-300">Health is dropping over the last days - consider scheduling maintenance.</p>
      )}
    </section>
  );
}
