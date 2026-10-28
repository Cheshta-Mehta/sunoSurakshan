/**
 * Lightweight on-device anomaly detector.
 *
 * Each audio frame is turned into a feature vector: the average level (dB) in
 * NUM_BANDS log-spaced frequency bands + overall loudness (dB). During
 * calibration we learn the mean and spread of every feature. Afterwards, a
 * frame's anomaly score is how many "standard deviations" it sits away from the
 * learned normal. No model files, no network - just statistics.
 */

export const NUM_BANDS = 24;
export const NUM_FEATURES = NUM_BANDS + 1; // + overall loudness
const MIN_DB = -100;
/** Floor for the spread so a very steady room doesn't make us hypersensitive. */
const MIN_STD_DB = 3;

export interface Baseline {
  mean: Float32Array;
  std: Float32Array;
}

/** FFT-bin edges for log-spaced bands between ~60 Hz and ~12 kHz. */
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
