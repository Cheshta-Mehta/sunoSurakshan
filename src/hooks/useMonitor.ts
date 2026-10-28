import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnomalyEvent, Phase, Settings } from '@/types';
import {
  Calibrator,
  NUM_FEATURES,
  anomalyScore,
  bandEdges,
  extractFeatures,
  type Baseline,
} from '@/audio/anomalyDetector';
import { playAlarm } from '@/audio/alarm';

const FFT_SIZE = 2048;
const FRAME_MS = 50;
const CALIBRATION_MS = 3000;
/** Consecutive abnormal frames needed before alerting (filters 1-frame glitches). */
const CONFIRM_FRAMES = 2;
/** Alert stays red this long after the last abnormal frame. */
const HOLD_MS = 2500;
export const HISTORY_LEN = 200;

/** Sensitivity 1..10 -> score threshold (higher sensitivity = lower threshold). */
export const thresholdFor = (sensitivity: number) => 5.5 - 0.4 * sensitivity;

interface Options {
  settings: Settings;
  onEvent: (e: AnomalyEvent) => void;
}

export function useMonitor({ settings, onEvent }: Options) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [score, setScore] = useState(0);
  const [isAlert, setIsAlert] = useState(false);
  const [baselineJustSet, setBaselineJustSet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  /** Rolling score history for the graph (read by the canvas). */
  const history = useRef<number[]>([]);

  const settingsRef = useRef(settings);
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    settingsRef.current = settings;
    onEventRef.current = onEvent;
  }, [settings, onEvent]);

  const rt = useRef({
    ctx: null as AudioContext | null,
    stream: null as MediaStream | null,
    analyser: null as AnalyserNode | null,
    timer: 0,
    phase: 'idle' as Phase,
    calStart: 0,
    calibrator: new Calibrator(),
    baseline: null as Baseline | null,
    consecutive: 0,
    lastAnomalyAt: 0,
    alertActive: false,
    setBanner: 0,
  });

  const stop = useCallback(() => {
    const r = rt.current;
    window.clearInterval(r.timer);
    window.clearTimeout(r.setBanner);
    r.stream?.getTracks().forEach((t) => t.stop());
    void r.ctx?.close();
    r.ctx = null;
    r.stream = null;
    r.analyser = null;
    r.phase = 'idle';
    r.baseline = null;
    r.alertActive = false;
    r.consecutive = 0;
    history.current = [];
    setPhase('idle');
    setIsAlert(false);
    setScore(0);
    setProgress(0);
    setBaselineJustSet(false);
  }, []);

  useEffect(() => stop, [stop]);

  const startLoop = useCallback(() => {
    const r = rt.current;
    const analyser = r.analyser!;
    const ctx = r.ctx!;
    const freq = new Float32Array(analyser.frequencyBinCount);
    const time = new Float32Array(analyser.fftSize);
    const feat = new Float32Array(NUM_FEATURES);
    const edges = bandEdges(ctx.sampleRate, analyser.fftSize);

    window.clearInterval(r.timer);
    r.timer = window.setInterval(() => {
      const now = performance.now();
      analyser.getFloatFrequencyData(freq);
      analyser.getFloatTimeDomainData(time);
      extractFeatures(freq, time, edges, feat);

      let s = 0;

      if (r.phase === 'calibrating') {
        r.calibrator.add(feat);
        const p = Math.min(1, (now - r.calStart) / CALIBRATION_MS);
        setProgress(p);
        if (p >= 1) {
          const base = r.calibrator.build();
          if (base) {
            r.baseline = base;
            r.phase = 'monitoring';
            r.consecutive = 0;
            r.alertActive = false;
            setPhase('monitoring');
            setBaselineJustSet(true);
            window.clearTimeout(r.setBanner);
            r.setBanner = window.setTimeout(() => setBaselineJustSet(false), 2000);
          } else {
            r.phase = 'idle';
            setPhase('idle');
            setError('Could not learn the sound - please try again.');
          }
        }
      } else if (r.phase === 'monitoring' && r.baseline) {
        s = anomalyScore(feat, r.baseline);
        const threshold = thresholdFor(settingsRef.current.sensitivity);
        r.consecutive = s > threshold ? r.consecutive + 1 : 0;

        if (r.consecutive >= CONFIRM_FRAMES) {
          r.lastAnomalyAt = now;
          if (!r.alertActive) {
            r.alertActive = true;
            setIsAlert(true);
            onEventRef.current({
              id: `${Date.now()}-${Math.round(Math.random() * 1e4)}`,
              timestamp: new Date().toISOString(),
              score: s,
            });
            if (settingsRef.current.soundAlarm) playAlarm(ctx);
            if (settingsRef.current.vibration && 'vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 400]);
          }
        } else if (r.alertActive && now - r.lastAnomalyAt > HOLD_MS) {
          r.alertActive = false;
          setIsAlert(false);
        }
      }

      history.current.push(s);
      if (history.current.length > HISTORY_LEN) history.current.shift();
      setScore(s);
      setTick((t) => t + 1);
    }, FRAME_MS);
  }, []);

  /** "Learn Normal Sound": opens the mic if needed, then listens for 3 seconds. */
  const learnNormal = useCallback(async () => {
    setError(null);
    const r = rt.current;
    try {
      if (!r.ctx) {
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
        startLoop();
      }
      r.calibrator = new Calibrator();
      r.calStart = performance.now();
      r.baseline = null;
      r.alertActive = false;
      r.consecutive = 0;
      r.phase = 'calibrating';
      history.current = [];
      setIsAlert(false);
      setProgress(0);
      setPhase('calibrating');
    } catch (e) {
      stop();
      const denied = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      setError(
        denied
          ? 'Microphone access was blocked. Allow the microphone in your browser settings and try again.'
          : 'Could not start the microphone on this device.',
      );
    }
  }, [startLoop, stop]);

  return { phase, progress, score, isAlert, baselineJustSet, error, tick, history, learnNormal, stop };
}
