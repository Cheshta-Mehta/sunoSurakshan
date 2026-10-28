import {
  AudioClassifier,
  FilesetResolver,
  type AudioClassifierResult,
  type Category,
} from '@mediapipe/tasks-audio';

const WASM_BASE = '/wasm';
const MODEL_PATH = '/models/yamnet.tflite';
export const YAMNET_SAMPLE_RATE = 16000;
export const YAMNET_CLIP_SAMPLES = 15600; // ~0.975s at 16kHz, YAMNet's expected input length

let classifierPromise: Promise<AudioClassifier> | null = null;

async function loadClassifier(): Promise<AudioClassifier> {
  if (!classifierPromise) {
    classifierPromise = (async () => {
      const fileset = await FilesetResolver.forAudioTasks(WASM_BASE);
      const clf = await AudioClassifier.createFromModelPath(fileset, MODEL_PATH);
      clf.setDefaultSampleRate(YAMNET_SAMPLE_RATE);
      return clf;
    })();
    classifierPromise.catch(() => {
      classifierPromise = null;
    });
  }
  return classifierPromise;
}

export async function initClassifier(): Promise<void> {
  await loadClassifier();
}

export interface ClassificationOutput {
  results: AudioClassifierResult[];
  topCategories: Category[];
}

  export async function classifyAudio(
  samples: Float32Array,
  sampleRate: number,
  maxResults = 10,
  scoreThreshold = 0.01,
): Promise<ClassificationOutput> {
  const clf = await loadClassifier();
  await clf.setOptions({ maxResults, scoreThreshold });

  const processed = sampleRate === YAMNET_SAMPLE_RATE
    ? samples
    : resampleTo16k(samples, sampleRate);

  const results = clf.classify(processed, YAMNET_SAMPLE_RATE);

  const all: Category[] = [];
  for (const result of results) {
    for (const cls of result.classifications) {
      for (const cat of cls.categories) {
        all.push(cat);
      }
    }
  }
  all.sort((a, b) => b.score - a.score);
  return { results, topCategories: all.slice(0, maxResults) };
}

export async function decodeAudioFile(file: Blob): Promise<{ samples: Float32Array; sampleRate: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const channels = audioBuffer.numberOfChannels;
    if (channels === 1) {
      return { samples: new Float32Array(audioBuffer.getChannelData(0)), sampleRate: audioBuffer.sampleRate };
    }
    const data = audioBuffer.getChannelData(0);
    const mono = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      let sum = 0;
      for (let ch = 0; ch < channels; ch++) {
        sum += audioBuffer.getChannelData(ch)[i];
      }
      mono[i] = sum / channels;
    }
    return { samples: mono, sampleRate: audioBuffer.sampleRate };
  } finally {
    void ctx.close();
  }
}

/**
 * Downsample (or upsample) to 16kHz mono using linear interpolation.
 * YAMNet expects 16kHz input; mic AudioContext typically runs at 44.1 or 48kHz.
 */
function resampleTo16k(samples: Float32Array, inputRate: number): Float32Array {
  if (inputRate === YAMNET_SAMPLE_RATE) return samples;
  const ratio = YAMNET_SAMPLE_RATE / inputRate;
  const outputLength = Math.floor(samples.length * ratio);
  const out = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const srcIdx = i / ratio;
    const lo = Math.floor(srcIdx);
    const hi = Math.min(lo + 1, samples.length - 1);
    const frac = srcIdx - lo;
    out[i] = samples[lo] * (1 - frac) + samples[hi] * frac;
  }
  return out;
}
