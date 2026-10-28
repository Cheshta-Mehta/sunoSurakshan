import { useState } from 'react';
import {
  AlertTriangle, BellOff, CheckCircle2, Download, Mic, Play, Plus, RotateCcw, Square, Trash2, Vibrate, Volume2, VolumeX, Wifi, WifiOff,
} from 'lucide-react';
import { LiveGraph } from '@/components/LiveGraph';
import { Spectrogram } from '@/components/Spectrogram';
import { HealthCard } from '@/components/HealthCard';
import { useConnectivity } from '@/hooks/useConnectivity';
import { useEventHistory } from '@/hooks/useEventHistory';
import { useMonitor, thresholdFor, HISTORY_LEN } from '@/hooks/useMonitor';
import { usePWAStatus } from '@/hooks/usePWAStatus';
import { useProfiles } from '@/hooks/useProfiles';
import { useSettings } from '@/hooks/useSettings';
import { downloadCsv, eventsToCsv } from '@/lib/export';
import type { Sector } from '@/types';

const SECTORS: Record<Sector, string> = {
  factory: 'Factory / Machinery',
  energy: 'Solar / Wind / Grid',
  medical: 'Medical / ICU (strict)',
  rail: 'Railway / Metro',
};

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
};

export default function App() {
  const connectivity = useConnectivity();
  const pwa = usePWAStatus();
  const { settings, update } = useSettings();
  const { events, addEvent, ack, clear } = useEventHistory();
  const P = useProfiles();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [sector, setSector] = useState<Sector>('factory');

  const m = useMonitor({ profile: P.active, settings, onEvent: addEvent, onBaseline: P.setBaseline, onAck: ack });

  const threshold = thresholdFor(settings.sensitivity);
  const monitoring = m.phase === 'monitoring';
  const calibrating = m.phase === 'calibrating';
  const critical = m.severity === 'critical';
  const strict = P.active?.sector === 'medical' || settings.strictMode;

  let status = { label: 'NOT CALIBRATED', sub: 'Tap "Learn Normal Sound" next to the machine', tone: 'text-slate-300 bg-ink-700 border-ink-500' };
  if (calibrating) {
    const left = Math.max(0, Math.ceil(settings.calibrationSec * (1 - m.progress)));
    status = { label: `LEARNING… ${left}s`, sub: 'Keep the environment in its normal state', tone: 'text-cyan-300 bg-ink-700 border-cyan-500' };
  } else if (monitoring && m.isAlert) {
    status = critical
      ? { label: '🚨 CRITICAL ANOMALY!', sub: m.hint || 'Check the machine now', tone: 'text-white bg-accent-red border-red-300 animate-alert-flash' }
      : { label: '⚠️ ANOMALY DETECTED', sub: m.hint || 'Unusual sound - check the machine', tone: 'text-ink-900 bg-accent-amber border-amber-200' };
  } else if (monitoring && m.baselineJustSet) {
    status = { label: 'BASELINE SET!', sub: 'Saved for this machine - now monitoring live', tone: 'text-cyan-200 bg-ink-700 border-cyan-400' };
  } else if (monitoring) {
    status = { label: 'NORMAL', sub: 'Sound matches the learned baseline', tone: 'text-green-300 bg-green-950 border-accent-green' };
  } else if (P.active?.baseline) {
    status = { label: 'READY', sub: 'Baseline saved - tap "Start monitoring"', tone: 'text-teal-200 bg-ink-700 border-teal-500' };
  }

  const addMachine = () => {
    P.add(name, sector);
    setName('');
    setAdding(false);
  };

  return (
    <div className={`min-h-screen transition-colors ${m.isAlert ? (critical ? 'bg-red-950' : 'bg-amber-950') : 'bg-ink-900'}`}>
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

        {/* Machine profiles */}
        <section className="space-y-3 rounded-2xl border border-ink-500 bg-ink-800 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Machine"
              value={P.active?.id ?? ''}
              onChange={(e) => P.setActive(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-ink-400 bg-ink-700 px-3 py-2 text-sm"
            >
              {P.profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {SECTORS[p.sector]} {p.baseline ? '✓' : ''}
                </option>
              ))}
            </select>
            <button onClick={() => setAdding((a) => !a)} className="flex items-center gap-1 rounded-lg border border-ink-400 px-3 py-2 text-sm font-semibold hover:bg-ink-700">
              <Plus size={16} /> Add
            </button>
            {P.profiles.length > 1 && P.active && (
              <button
                onClick={() => window.confirm(`Delete "${P.active!.name}"?`) && P.remove(P.active!.id)}
                aria-label="Delete machine"
                className="rounded-lg border border-ink-400 p-2 text-slate-400 hover:bg-ink-700 hover:text-white"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          {adding && (
            <div className="flex flex-wrap gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Machine name (e.g. Pump-3)"
                className="min-w-0 flex-1 rounded-lg border border-ink-400 bg-ink-700 px-3 py-2 text-sm"
              />
              <select value={sector} onChange={(e) => setSector(e.target.value as Sector)} className="rounded-lg border border-ink-400 bg-ink-700 px-3 py-2 text-sm">
                {(Object.keys(SECTORS) as Sector[]).map((s) => (
                  <option key={s} value={s}>{SECTORS[s]}</option>
                ))}
              </select>
              <button onClick={addMachine} className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-bold text-ink-900 hover:bg-teal-300">Save</button>
            </div>
          )}
        </section>

        {/* Status banner */}
        <section aria-live="assertive" className={`rounded-2xl border-2 px-6 py-8 text-center ${status.tone}`}>
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
          {monitoring && m.isAlert && (
            <button
              onClick={m.acknowledge}
              className="mx-auto mt-5 flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-lg font-bold text-ink-900 hover:bg-slate-200"
            >
              <BellOff size={20} /> Acknowledge
            </button>
          )}
          {monitoring && strict && <p className="mt-3 text-xs opacity-80">Strict mode: alarm repeats until acknowledged</p>}
        </section>

        {m.error && (
          <p role="alert" className="rounded-xl border border-accent-red bg-red-950 px-4 py-3 text-sm text-red-200">{m.error}</p>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={m.learnNormal}
            disabled={calibrating}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-400 px-5 py-4 text-lg font-bold text-ink-900 hover:bg-teal-300 disabled:opacity-60"
          >
            {P.active?.baseline ? <RotateCcw size={20} /> : <Mic size={20} />}
            {P.active?.baseline ? 'Re-learn Normal Sound' : 'Learn Normal Sound'}
          </button>
          {m.phase === 'idle' && P.active?.baseline && (
            <button onClick={m.startMonitoring} className="flex items-center justify-center gap-2 rounded-xl border border-teal-400 px-5 py-4 font-semibold text-teal-200 hover:bg-ink-700">
              <Play size={18} /> Start monitoring
            </button>
          )}
          {m.phase !== 'idle' && (
            <button onClick={m.stop} className="flex items-center justify-center gap-2 rounded-xl border border-ink-400 px-5 py-4 font-semibold hover:bg-ink-700">
              <Square size={18} /> Stop
            </button>
          )}
        </div>

        {/* Live graph + spectrogram */}
        <section className="space-y-2">
          <div className="flex items-baseline justify-between text-sm text-slate-400">
            <h2 className="font-semibold text-slate-200">Live sound activity</h2>
            <span>
              Difference from normal: <span className="font-mono text-slate-200">{m.score.toFixed(1)}</span> · alarm at{' '}
              <span className="font-mono text-accent-amber">{threshold.toFixed(1)}</span>
            </span>
          </div>
          <LiveGraph history={m.history} tick={m.tick} threshold={threshold} length={HISTORY_LEN} alert={m.isAlert} />
          <p className="pt-2 text-sm font-semibold text-slate-200">Spectrogram <span className="font-normal text-slate-400">(blue = normal, red = unusual frequency)</span></p>
          <Spectrogram spec={m.spec} tick={m.tick} length={HISTORY_LEN} />
        </section>

        {P.active && <HealthCard machineId={P.active.id} threshold={threshold} />}

        {/* Settings */}
        <section className="grid gap-4 rounded-2xl border border-ink-500 bg-ink-800 p-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 flex justify-between font-semibold text-slate-200">
              Sensitivity <span className="font-mono text-slate-400">{settings.sensitivity}/10</span>
            </span>
            <input type="range" min={1} max={10} value={settings.sensitivity} onChange={(e) => update({ sensitivity: Number(e.target.value) })} className="w-full accent-teal-400" />
            <span className="text-xs text-slate-400">Higher = alarms on smaller changes</span>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-200">Learning time</span>
            <select
              value={settings.calibrationSec}
              disabled={calibrating}
              onChange={(e) => update({ calibrationSec: Number(e.target.value) })}
              className="w-full rounded-lg border border-ink-400 bg-ink-700 px-3 py-2"
            >
              {[3, 10, 30, 60].map((s) => (
                <option key={s} value={s}>{s} seconds{s === 3 ? ' (demo)' : s >= 30 ? ' (recommended for real machines)' : ''}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button onClick={() => update({ soundAlarm: !settings.soundAlarm })} aria-pressed={settings.soundAlarm} className="flex items-center gap-2 rounded-lg border border-ink-400 px-4 py-2 text-sm font-semibold hover:bg-ink-700">
              {settings.soundAlarm ? <Volume2 size={18} /> : <VolumeX size={18} />} Alarm sound {settings.soundAlarm ? 'ON' : 'OFF'}
            </button>
            <button onClick={() => update({ vibration: !settings.vibration })} aria-pressed={settings.vibration} className="flex items-center gap-2 rounded-lg border border-ink-400 px-4 py-2 text-sm font-semibold hover:bg-ink-700">
              <Vibrate size={18} /> Vibration {settings.vibration ? 'ON' : 'OFF'}
            </button>
            <button onClick={() => update({ strictMode: !settings.strictMode })} aria-pressed={settings.strictMode} className="flex items-center gap-2 rounded-lg border border-ink-400 px-4 py-2 text-sm font-semibold hover:bg-ink-700">
              <BellOff size={18} /> Strict mode {strict ? 'ON' : 'OFF'}
            </button>
          </div>
        </section>

        {/* Event log */}
        <section className="rounded-2xl border border-ink-500 bg-ink-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Anomaly log ({events.length})</h2>
            {events.length > 0 && (
              <div className="flex gap-4">
                <button onClick={() => downloadCsv(`sunosuraksha-log-${Date.now()}.csv`, eventsToCsv(events))} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white">
                  <Download size={15} /> CSV
                </button>
                <button onClick={clear} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white">
                  <Trash2 size={15} /> Clear
                </button>
              </div>
            )}
          </div>
          {events.length === 0 ? (
            <p className="text-sm text-slate-400">No unusual sounds recorded yet.</p>
          ) : (
            <ul className="scroll-slim max-h-72 space-y-2 overflow-y-auto">
              {events.map((e) => (
                <li key={e.id} className="rounded-lg bg-ink-700 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`flex items-center gap-2 ${e.severity === 'critical' ? 'text-red-300' : 'text-amber-300'}`}>
                      <AlertTriangle size={15} /> {e.machineName ?? 'Machine'} · {e.severity ?? 'warning'}
                    </span>
                    <span className="font-mono text-slate-200">{fmtTime(e.timestamp)}</span>
                    <span className="font-mono text-slate-400">score {e.score.toFixed(1)}</span>
                  </div>
                  {e.hint && <p className="mt-1 text-xs text-slate-400">{e.hint}</p>}
                  <p className="mt-1 text-xs text-slate-500">{e.acknowledgedAt ? `Acknowledged ${fmtTime(e.acknowledgedAt)}` : 'Not acknowledged'}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="pb-4 text-center text-xs text-slate-500">
          100% on-device · no audio leaves your phone or laptop · works without internet. Prototype - not a certified safety system.
        </footer>
      </div>
    </div>
  );
}
