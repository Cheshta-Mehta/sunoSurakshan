/**
 * Lightweight on-device anomaly detector (per-band mean/std, z-score distance).
 * Extras: baseline (de)serialisation, fault hints, silence detection.
 */
import type { StoredBaseline } from '@/types';

export const NUM_BANDS = 24;
export const NUM_FEATURES = NUM_BANDS + 1; // + overall loudness
const MIN_DB = -100;
const MIN_STD_DB = 3;
/** Loudness this many sigmas BELOW normal = machine stopped / silent. */
const SILENCE_Z = 3;

export interface Baseline {
  mean: Float32Array;
  std: Float32Array;
}

export interface BandHint {
  loHz: number;
  hiHz: number;
  z: number;
}

export const serializeBaseline = (b: Baseline): StoredBaseline => ({
  mean: Array.from(b.mean),
  std: Array.from(b.std),
});

export const deserializeBaseline = (o: StoredBaseline): Baseline => ({
  mean: Float32Array.from(o.mean),
  std: Float32Array.from(o.std),
});

export function bandEdges(sampleRate: number, fftSize: number): number[] {
  const binHz = sampleRate / fftSize;
  const maxBin = fftSize / 2 - 1;
  const lo = 60 / binHz;
  const hi = Math.min(12000 / binHz, maxBin);
  const edges: number[] = [];
  for (let i = 0; i <= NUM_BANDS; i++) {
    const e = Math.round(lo * Math.pow(hi / lo, i / NUM_BANDS));
    edges.push(i === 0 ? Math.max(1, e) : Math.max(edges[i - 1] + 1, e));
  }
  return edges;
}

export function extractFeatures(
  freqDb: Float32Array,
  timeData: Float32Array,
  edges: number[],
  out: Float32Array,
): void {
  for (let b = 0; b < NUM_BANDS; b++) {
    let sum = 0;
    let n = 0;
    for (let k = edges[b]; k < edges[b + 1] && k < freqDb.length; k++) {
      const v = freqDb[k];
      sum += Number.isFinite(v) ? Math.max(v, MIN_DB) : MIN_DB;
      n++;
    }
    out[b] = n ? sum / n : MIN_DB;
  }
  let sq = 0;
  for (let i = 0; i < timeData.length; i++) sq += timeData[i] * timeData[i];
  out[NUM_BANDS] = 20 * Math.log10(Math.sqrt(sq / timeData.length) + 1e-8);
}

export class Calibrator {
  private frames: Float32Array[] = [];

  add(features: Float32Array): void {
    this.frames.push(Float32Array.from(features));
  }

  get count(): number {
    return this.frames.length;
  }

  build(): Baseline | null {
    const n = this.frames.length;
    if (n < 5) return null;
    const mean = new Float32Array(NUM_FEATURES);
    const std = new Float32Array(NUM_FEATURES);
    for (const f of this.frames) for (let i = 0; i < NUM_FEATURES; i++) mean[i] += f[i] / n;
    for (const f of this.frames) for (let i = 0; i < NUM_FEATURES; i++) std[i] += (f[i] - mean[i]) ** 2 / n;
    for (let i = 0; i < NUM_FEATURES; i++) std[i] = Math.max(Math.sqrt(std[i]), MIN_STD_DB);
    return { mean, std };
  }
}

/** 0 = exactly normal. ~4+ = clearly unusual. Works for louder OR quieter-than-normal. */
export function anomalyScore(f: Float32Array, base: Baseline): number {
  let sumSq = 0;
  for (let i = 0; i < NUM_BANDS; i++) {
    const z = (f[i] - base.mean[i]) / base.std[i];
    sumSq += z * z;
  }
  const spectrumScore = Math.sqrt(sumSq / NUM_BANDS);
  const loudnessScore = Math.abs(f[NUM_BANDS] - base.mean[NUM_BANDS]) / base.std[NUM_BANDS];
  return Math.max(spectrumScore, loudnessScore);
}

/** True when the overall level is far BELOW normal (machine stopped). */
export function isSilent(f: Float32Array, base: Baseline): boolean {
  return (f[NUM_BANDS] - base.mean[NUM_BANDS]) / base.std[NUM_BANDS] < -SILENCE_Z;
}

/** The k bands that deviate most from normal, with their Hz range. */
export function topBands(
  f: Float32Array,
  base: Baseline,
  edges: number[],
  sampleRate: number,
  fftSize: number,
  k = 3,
): BandHint[] {
  const binHz = sampleRate / fftSize;
  return Array.from({ length: NUM_BANDS }, (_, i) => ({
    z: (f[i] - base.mean[i]) / base.std[i],
    loHz: Math.round(edges[i] * binHz),
    hiHz: Math.round(edges[i + 1] * binHz),
  }))
    .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
    .slice(0, k);
}

/** Indicative only: a hint about the TYPE of change, not a diagnosis. */
export function describeHint(f: Float32Array, base: Baseline, hints: BandHint[]): string {
  const h = hints[0];
  if (!h) return 'Sound pattern differs from normal';
  const c = (h.loHz + h.hiHz) / 2;
  const kind =
    c < 250
      ? 'low-frequency rumble (imbalance / misalignment type)'
      : c < 2000
        ? 'mid-frequency band (looseness / knocking type)'
        : 'high-frequency band (bearing whine / friction type)';
  const dB = f[NUM_BANDS] - base.mean[NUM_BANDS];
  return `${h.z > 0 ? 'Rise' : 'Drop'} at ${h.loHz}-${h.hiHz} Hz: ${kind}. Loudness ${dB >= 0 ? '+' : ''}${dB.toFixed(0)} dB vs normal.`;
}
