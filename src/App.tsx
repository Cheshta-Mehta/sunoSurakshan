import { useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Mic, RotateCcw, Square, Trash2, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import { LiveGraph } from '@/components/LiveGraph';
import { useConnectivity } from '@/hooks/useConnectivity';
import { useEventHistory } from '@/hooks/useEventHistory';
import { useMonitor, thresholdFor, HISTORY_LEN } from '@/hooks/useMonitor';
import { usePWAStatus } from '@/hooks/usePWAStatus';
import { useSettings } from '@/hooks/useSettings';
import type { AnomalyEvent } from '@/types';

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
};

export default function App() {
  const connectivity = useConnectivity();
  const pwa = usePWAStatus();
  const { settings, update } = useSettings();
  const { events, addEvent, clear } = useEventHistory();

  const onEvent = useCallback((e: AnomalyEvent) => addEvent(e), [addEvent]);
  const m = useMonitor({ settings, onEvent });

  const threshold = thresholdFor(settings.sensitivity);
  const monitoring = m.phase === 'monitoring';
  const calibrating = m.phase === 'calibrating';

  let status = { label: 'NOT CALIBRATED', sub: 'Tap "Learn Normal Sound" next to the machine', tone: 'text-slate-300 bg-ink-700 border-ink-500' };
  if (calibrating) {
    const left = Math.max(0, Math.ceil(3 - m.progress * 3));
    status = { label: `LEARNING… ${left}s`, sub: 'Keep the environment in its normal state', tone: 'text-cyan-300 bg-ink-700 border-cyan-500' };
  } else if (monitoring && m.isAlert) {
    status = { label: '🚨 ANOMALY DETECTED!', sub: 'Unusual sound - check the machine now', tone: 'text-white bg-accent-red border-red-300 animate-alert-flash' };
  } else if (monitoring && m.baselineJustSet) {
    status = { label: 'BASELINE SET!', sub: 'Now monitoring live', tone: 'text-cyan-200 bg-ink-700 border-cyan-400' };
  } else if (monitoring) {
    status = { label: 'NORMAL', sub: 'Sound matches the learned baseline', tone: 'text-green-300 bg-green-950 border-accent-green' };
  }

  return (
    <div className={`min-h-screen transition-colors ${m.isAlert ? 'bg-red-950' : 'bg-ink-900'}`}>
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SunoSuraksha</h1>
            <p className="text-sm text-slate-400">Smart watch for machines &amp; equipment</p>
          </div>
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${
              connectivity === 'offline' ? 'border-accent-green text-green-300' : 'border-ink-400 text-slate-300'
            }`}
          >
            {connectivity === 'offline' ? <WifiOff size={16} /> : <Wifi size={16} />}
            {connectivity === 'offline' ? 'Offline - fully working' : 'Online'}
            {pwa.offlineReady && <span className="text-xs text-slate-400">· cached</span>}
          </div>
        </header>

        {/* Status banner */}
        <section
          aria-live="assertive"
          className={`rounded-2xl border-2 px-6 py-8 text-center ${status.tone}`}
        >
          <div className="flex items-center justify-center gap-3 text-3xl font-extrabold tracking-wide sm:text-5xl">
            {monitoring && !m.isAlert && !m.baselineJustSet && <CheckCircle2 size={40} />}
            {monitoring && m.isAlert && <AlertTriangle size={40} />}
            {status.label}
          </div>
          <p className="mt-2 text-sm opacity-90">{status.sub}</p>
          {calibrating && (
            <div className="mx-auto mt-4 h-2 max-w-sm overflow-hidden rounded-full bg-ink-500">
              <div className="h-full bg-cyan-400 transition-all" style={{ width: `${m.progress * 100}%` }} />
            </div>
          )}
        </section>

        {m.error && (
          <p role="alert" className="rounded-xl border border-accent-red bg-red-950 px-4 py-3 text-sm text-red-200">
            {m.error}
          </p>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={m.learnNormal}
            disabled={calibrating}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-400 px-5 py-4 text-lg font-bold text-ink-900 hover:bg-teal-300 disabled:opacity-60"
          >
            {monitoring ? <RotateCcw size={20} /> : <Mic size={20} />}
            {monitoring ? 'Re-learn Normal Sound' : 'Learn Normal Sound'}
          </button>
          {m.phase !== 'idle' && (
            <button
              onClick={m.stop}
              className="flex items-center justify-center gap-2 rounded-xl border border-ink-400 px-5 py-4 font-semibold hover:bg-ink-700"
            >
              <Square size={18} /> Stop
            </button>
          )}
        </div>

        {/* Live graph */}
        <section className="space-y-2">
          <div className="flex items-baseline justify-between text-sm text-slate-400">
            <h2 className="font-semibold text-slate-200">Live sound activity</h2>
            <span>
              Difference from normal: <span className="font-mono text-slate-200">{m.score.toFixed(1)}</span> · alarm at{' '}
              <span className="font-mono text-accent-amber">{threshold.toFixed(1)}</span>
            </span>
          </div>
          <LiveGraph history={m.history} tick={m.tick} threshold={threshold} length={HISTORY_LEN} alert={m.isAlert} />
        </section>

        {/* Settings */}
        <section className="grid gap-4 rounded-2xl border border-ink-500 bg-ink-800 p-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 flex justify-between font-semibold text-slate-200">
              Sensitivity <span className="font-mono text-slate-400">{settings.sensitivity}/10</span>
            </span>
            <input
              type="range"
              min={1}
              max={10}
              value={settings.sensitivity}
              onChange={(e) => update({ sensitivity: Number(e.target.value) })}
              className="w-full accent-teal-400"
            />
            <span className="text-xs text-slate-400">Higher = alarms on smaller changes</span>
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => update({ soundAlarm: !settings.soundAlarm })}
              aria-pressed={settings.soundAlarm}
              className="flex items-center gap-2 rounded-lg border border-ink-400 px-4 py-2 text-sm font-semibold hover:bg-ink-700"
            >
              {settings.soundAlarm ? <Volume2 size={18} /> : <VolumeX size={18} />}
              Alarm sound {settings.soundAlarm ? 'ON' : 'OFF'}
            </button>
          </div>
        </section>

        {/* Event log */}
        <section className="rounded-2xl border border-ink-500 bg-ink-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Anomaly log ({events.length})</h2>
            {events.length > 0 && (
              <button onClick={clear} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white">
                <Trash2 size={15} /> Clear
              </button>
            )}
          </div>
          {events.length === 0 ? (
            <p className="text-sm text-slate-400">No unusual sounds recorded yet.</p>
          ) : (
            <ul className="scroll-slim max-h-64 space-y-2 overflow-y-auto">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between rounded-lg bg-ink-700 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 text-red-300">
                    <AlertTriangle size={15} /> Unusual sound
                  </span>
                  <span className="font-mono text-slate-200">{fmtTime(e.timestamp)}</span>
                  <span className="font-mono text-slate-400">score {e.score.toFixed(1)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="pb-4 text-center text-xs text-slate-500">
          100% on-device · no audio leaves your phone or laptop · works without internet. Prototype - not a certified
          safety system.
        </footer>
      </div>
    </div>
  );
}
