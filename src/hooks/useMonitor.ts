import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnomalyEvent, MachineProfile, Phase, Sector, Settings, Severity, StoredBaseline } from '@/types';
import {
  Calibrator,
  NUM_BANDS,
  NUM_FEATURES,
  anomalyScore,
  bandEdges,
  describeHint,
  deserializeBaseline,
  extractFeatures,
  isSilent,
  serializeBaseline,
  topBands,
  type Baseline,
} from '@/audio/anomalyDetector';
import { playAlarm } from '@/audio/alarm';
import { addHealth } from '@/lib/health';

const FFT_SIZE = 2048;
const FRAME_MS = 50;
export const HISTORY_LEN = 200;
const LOCKOUT_MS = 1300; // ignore mic right after our own alarm
const REALARM_MS = 4000; // latched alarms repeat
const HEALTH_FLUSH_MS = 30000;
const CRITICAL_FACTOR = 1.6;

/** Per-sector detection behaviour. */
const SECTOR_CFG: Record<Sector, { confirm: number; holdMs: number; latch: boolean }> = {
  factory: { confirm: 2, holdMs: 2500, latch: false },
  energy: { confirm: 3, holdMs: 4000, latch: false },
  medical: { confirm: 1, holdMs: 0, latch: true }, // fastest reaction, stays until acknowledged
  rail: { confirm: 8, holdMs: 3000, latch: false }, // needs a sustained (~0.4 s) abnormal sound
};

export const thresholdFor = (sensitivity: number) => 5.5 - 0.4 * sensitivity;

interface Options {
  profile: MachineProfile | null;
  settings: Settings;
  onEvent: (e: AnomalyEvent) => void;
  onBaseline: (machineId: string, b: StoredBaseline) => void;
  onAck: (eventId: string) => void;
}

export function useMonitor(opts: Options) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [score, setScore] = useState(0);
  const [severity, setSeverity] = useState<Severity>('normal');
  const [hint, setHint] = useState('');
  const [baselineJustSet, setBaselineJustSet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const history = useRef<number[]>([]);
  const spec = useRef<Float32Array[]>([]);

  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  }, [opts]);

  const rt = useRef({
    ctx: null as AudioContext | null,
    stream: null as MediaStream | null,
    analyser: null as AnalyserNode | null,
    wake: null as WakeLockSentinel | null,
    timer: 0,
    setBanner: 0,
    phase: 'idle' as Phase,
    calStart: 0,
    calibrator: new Calibrator(),
    baseline: null as Baseline | null,
    profileId: null as string | null,
    consecutive: 0,
    lastAnomalyAt: 0,
    lastAlarmAt: 0,
    lockUntil: 0,
    alertActive: false,
    severity: 'normal' as Severity,
    lastEventId: '',
    hSum: 0,
    hN: 0,
    hFlush: 0,
  });

  const flushHealth = () => {
    const r = rt.current;
    if (r.profileId && r.hN > 0) addHealth(r.profileId, r.hSum, r.hN);
    r.hSum = 0;
    r.hN = 0;
    r.hFlush = performance.now();
  };

  const resetAlert = () => {
    const r = rt.current;
    r.consecutive = 0;
    r.alertActive = false;
    r.severity = 'normal';
    r.lockUntil = 0;
    setSeverity('normal');
    setHint('');
  };

  const stop = useCallback(() => {
    const r = rt.current;
    flushHealth();
    window.clearInterval(r.timer);
    window.clearTimeout(r.setBanner);
    r.stream?.getTracks().forEach((t) => t.stop());
    void r.ctx?.close();
    void r.wake?.release().catch(() => {});
    r.ctx = null;
    r.stream = null;
    r.analyser = null;
    r.wake = null;
    r.phase = 'idle';
    r.baseline = null;
    resetAlert();
    history.current = [];
    spec.current = [];
    setPhase('idle');
    setScore(0);
    setProgress(0);
    setBaselineJustSet(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => stop, [stop]);

  // Switching machine stops the current session.
  const profileId = opts.profile?.id ?? null;
  useEffect(() => {
    stop();
    rt.current.profileId = profileId;
  }, [profileId, stop]);

  // Re-acquire the screen wake lock when the tab becomes visible again.
  useEffect(() => {
    const h = async () => {
      const r = rt.current;
      if (document.visibilityState === 'visible' && r.ctx) {
        try {
          r.wake = (await navigator.wakeLock?.request('screen')) ?? null;
        } catch {
          /* ignore */
        }
      }
    };
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, []);

  const startLoop = useCallback(() => {
    const r = rt.current;
    const analyser = r.analyser!;
    const ctx = r.ctx!;
    const freq = new Float32Array(analyser.frequencyBinCount);
    const time = new Float32Array(analyser.fftSize);
    const feat = new Float32Array(NUM_FEATURES);
    const edges = bandEdges(ctx.sampleRate, analyser.fftSize);

    window.clearInterval(r.timer);
    r.hFlush = performance.now();
    r.timer = window.setInterval(() => {
      const now = performance.now();
      const { profile, settings, onEvent, onBaseline } = optsRef.current;
      analyser.getFloatFrequencyData(freq);
      analyser.getFloatTimeDomainData(time);
      extractFeatures(freq, time, edges, feat);

      let s = 0;

      // spectrogram column: deviation from normal per band
      const col = spec.current.length >= HISTORY_LEN ? spec.current.shift()! : new Float32Array(NUM_BANDS);
      col.fill(0);
      if (r.baseline) for (let i = 0; i < NUM_BANDS; i++) col[i] = (feat[i] - r.baseline.mean[i]) / r.baseline.std[i];
      spec.current.push(col);

      if (r.phase === 'calibrating') {
        r.calibrator.add(feat);
        const p = Math.min(1, (now - r.calStart) / (settings.calibrationSec * 1000));
        setProgress(p);
        if (p >= 1) {
          const base = r.calibrator.build();
          if (base) {
            r.baseline = base;
            r.phase = 'monitoring';
            resetAlert();
            setPhase('monitoring');
            if (r.profileId) onBaseline(r.profileId, serializeBaseline(base));
            setBaselineJustSet(true);
            window.clearTimeout(r.setBanner);
            r.setBanner = window.setTimeout(() => setBaselineJustSet(false), 2000);
          } else {
            r.phase = 'idle';
            setPhase('idle');
            setError('Could not learn the sound - please try again.');
          }
        }
      } else if (r.phase === 'monitoring' && r.baseline && profile) {
        const cfg = SECTOR_CFG[profile.sector];
        const latch = cfg.latch || settings.strictMode;
        const threshold = thresholdFor(settings.sensitivity);

        s = anomalyScore(feat, r.baseline);
        const silent = isSilent(feat, r.baseline);
        const abnormal = silent || s > threshold;
        const locked = now < r.lockUntil;

        if (!locked) r.consecutive = abnormal ? r.consecutive + 1 : 0;

        if (!locked && r.consecutive >= cfg.confirm) {
          r.lastAnomalyAt = now;
          const sev: Severity = silent || s > threshold * CRITICAL_FACTOR ? 'critical' : 'warning';
          if (!r.alertActive) {
            const hints = topBands(feat, r.baseline, edges, ctx.sampleRate, analyser.fftSize);
            const text = silent
              ? 'Sound dropped far below normal - machine may have stopped.'
              : describeHint(feat, r.baseline, hints);
            const id = `${Date.now()}-${Math.round(Math.random() * 1e4)}`;
            r.alertActive = true;
            r.severity = sev;
            r.lastEventId = id;
            r.lastAlarmAt = now;
            r.lockUntil = now + LOCKOUT_MS;
            setSeverity(sev);
            setHint(text);
            onEvent({
              id,
              timestamp: new Date().toISOString(),
              score: s,
              machineId: profile.id,
              machineName: profile.name,
              severity: sev,
              kind: silent ? 'silence' : 'abnormal',
              hint: text,
            });
            if (settings.soundAlarm) playAlarm(ctx);
            if (settings.vibration && 'vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 400]);
          } else if (sev === 'critical' && r.severity !== 'critical') {
            r.severity = 'critical';
            setSeverity('critical');
          }
        } else if (r.alertActive) {
          if (latch) {
            // keep re-alarming until someone acknowledges
            if (now - r.lastAlarmAt > REALARM_MS && !locked) {
              r.lastAlarmAt = now;
              r.lockUntil = now + LOCKOUT_MS;
              if (settings.soundAlarm) playAlarm(ctx);
              if (settings.vibration && 'vibrate' in navigator) navigator.vibrate([300, 150, 300]);
            }
          } else if (now - r.lastAnomalyAt > cfg.holdMs) {
            r.alertActive = false;
            r.severity = 'normal';
            setSeverity('normal');
          }
        }

        r.hSum += s;
        r.hN++;
        if (now - r.hFlush > HEALTH_FLUSH_MS) flushHealth();
      }

      history.current.push(s);
      if (history.current.length > HISTORY_LEN) history.current.shift();
      setScore(s);
      setTick((t) => t + 1);
    }, FRAME_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openMic = useCallback(async () => {
    const r = rt.current;
    if (r.ctx) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      // Raw audio: processing would hide exactly the changes we want to detect.
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0;
    ctx.createMediaStreamSource(stream).connect(analyser);
    r.ctx = ctx;
    r.stream = stream;
    r.analyser = analyser;
    try {
      r.wake = (await navigator.wakeLock?.request('screen')) ?? null; // keep screen/mic alive
    } catch {
      r.wake = null;
    }
    startLoop();
  }, [startLoop]);

  const fail = useCallback(
    (e: unknown) => {
      stop();
      const denied = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      setError(
        denied
          ? 'Microphone access was blocked. Allow the microphone in your browser settings and try again.'
          : 'Could not start the microphone on this device.',
      );
    },
    [stop],
  );

  /** "Learn Normal Sound" for the selected machine (saved to that machine's profile). */
  const learnNormal = useCallback(async () => {
    setError(null);
    const r = rt.current;
    try {
      await openMic();
      r.calibrator = new Calibrator();
      r.calStart = performance.now();
      r.baseline = null;
      resetAlert();
      r.phase = 'calibrating';
      history.current = [];
      spec.current = [];
      setProgress(0);
      setPhase('calibrating');
    } catch (e) {
      fail(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openMic, fail]);

  /** Start monitoring using the baseline already saved for this machine. */
  const startMonitoring = useCallback(async () => {
    setError(null);
    const r = rt.current;
    const base = optsRef.current.profile?.baseline;
    if (!base) {
      setError('Learn the normal sound of this machine first.');
      return;
    }
    try {
      await openMic();
      r.baseline = deserializeBaseline(base);
      resetAlert();
      r.phase = 'monitoring';
      setPhase('monitoring');
    } catch (e) {
      fail(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openMic, fail]);

  /** Acknowledge the active alarm (clears it and stamps the log). */
  const acknowledge = useCallback(() => {
    const r = rt.current;
    if (!r.alertActive) return;
    r.alertActive = false;
    r.consecutive = 0;
    r.severity = 'normal';
    r.lockUntil = performance.now() + 1500;
    setSeverity('normal');
    if (r.lastEventId) optsRef.current.onAck(r.lastEventId);
  }, []);

  return {
    phase,
    progress,
    score,
    severity,
    isAlert: severity !== 'normal',
    hint,
    baselineJustSet,
    error,
    tick,
    history,
    spec,
    learnNormal,
    startMonitoring,
    acknowledge,
    stop,
  };
}
