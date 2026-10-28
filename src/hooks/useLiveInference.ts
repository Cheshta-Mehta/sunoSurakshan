import { useCallback, useEffect, useRef, useState } from 'react';
import type { ModelLoadState, Prediction } from '@/types';
import { classifyAudio, YAMNET_SAMPLE_RATE, YAMNET_CLIP_SAMPLES } from '@/audio/classifier';

export type MicState = 'idle' | 'requesting' | 'active' | 'paused' | 'error';

export interface LiveInferenceDiagnostics {
  micState: MicState;
  audioContextState: AudioContextState | 'none';
  inputSampleRate: number;
  lastInferenceTime: number | null;
  lastInferenceDuration: number | null;
  error: string | null;
}

export interface LiveInferenceResult {
  predictions: Prediction[];
  inferenceMs: number;
  timestamp: number;
}

interface UseLiveInferenceOptions {
  modelState: ModelLoadState;
  onResult?: (result: LiveInferenceResult) => void;
}

const PROCESSOR_BUFFER_SIZE = 4096;
const BUFFER_TARGET = YAMNET_CLIP_SAMPLES; // ~15600 samples at 16kHz

export function useLiveInference({ modelState, onResult }: UseLiveInferenceOptions) {
  const [micState, setMicState] = useState<MicState>('idle');
  const [diagnostics, setDiagnostics] = useState<LiveInferenceDiagnostics>({
    micState: 'idle',
    audioContextState: 'none',
    inputSampleRate: 0,
    lastInferenceTime: null,
    lastInferenceDuration: null,
    error: null,
  });
  const [latestPredictions, setLatestPredictions] = useState<Prediction[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const isPausedRef = useRef(false);
  const isInferringRef = useRef(false);
  const onResultRef = useRef(onResult);
  const audioBufferRef = useRef<Float32Array[]>([]);
  const audioBufferLenRef = useRef(0);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const modelReady = modelState.status === 'ready';

  const updateDiagnostics = useCallback((patch: Partial<LiveInferenceDiagnostics>) => {
    setDiagnostics((prev) => ({ ...prev, ...patch }));
  }, []);

  const stopAllResources = useCallback(() => {
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current.onaudioprocess = null;
      processorNodeRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      void audioContextRef.current.close();
    }
    audioContextRef.current = null;
    isPausedRef.current = false;
    isInferringRef.current = false;
    audioBufferRef.current = [];
    audioBufferLenRef.current = 0;
  }, []);

  const start = useCallback(async () => {
    if (!modelReady) return;
    if (micState === 'active' || micState === 'requesting') return;

    setMicState('requesting');
    updateDiagnostics({ micState: 'requesting', error: null });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      mediaStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const source = ctx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      const processor = ctx.createScriptProcessor(PROCESSOR_BUFFER_SIZE, 1, 1);
      processorNodeRef.current = processor;

      processor.onaudioprocess = (event: AudioProcessingEvent) => {
        if (isPausedRef.current) return;

        const input = event.inputBuffer.getChannelData(0);
        audioBufferRef.current.push(new Float32Array(input));
        audioBufferLenRef.current += input.length;

        const neededSamples = Math.ceil(BUFFER_TARGET * (ctx.sampleRate / YAMNET_SAMPLE_RATE));
        if (audioBufferLenRef.current < neededSamples || isInferringRef.current) return;

        const combined = new Float32Array(audioBufferLenRef.current);
        let offset = 0;
        for (const chunk of audioBufferRef.current) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        const windowStart = combined.length - neededSamples;
        const windowed = combined.slice(windowStart);

        audioBufferRef.current = [];
        audioBufferLenRef.current = 0;

        isInferringRef.current = true;
        const startTime = performance.now();

        classifyAudio(windowed, ctx.sampleRate, 10, 0.01)
          .then(({ topCategories }) => {
            const preds: Prediction[] = topCategories.map((c) => ({
              label: c.categoryName,
              score: c.score,
            }));
            const duration = performance.now() - startTime;
            const now = Date.now();
            setLatestPredictions(preds);
            updateDiagnostics({
              lastInferenceTime: now,
              lastInferenceDuration: duration,
            });
            onResultRef.current?.({ predictions: preds, inferenceMs: duration, timestamp: now });
          })
          .catch((err) => {
            updateDiagnostics({
              error: err instanceof Error ? err.message : 'Inference error',
            });
          })
          .finally(() => {
            isInferringRef.current = false;
          });
      };

      source.connect(processor);
      // Connect to a zero-gain destination to keep the ScriptProcessor running
      // without routing mic audio back to the speakers (which would cause feedback).
      const mutedGain = ctx.createGain();
      mutedGain.gain.value = 0;
      processor.connect(mutedGain);
      mutedGain.connect(ctx.destination);

      isPausedRef.current = false;
      setMicState('active');
      updateDiagnostics({
        micState: 'active',
        audioContextState: ctx.state,
        inputSampleRate: ctx.sampleRate,
        error: null,
      });
    } catch (err) {
      let message = 'Failed to access microphone.';
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
          message = 'Microphone permission denied. Please allow access in your browser settings.';
        } else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
          message = 'No microphone found on this device.';
        } else {
          message = err.message;
        }
      }
      setMicState('error');
      updateDiagnostics({ micState: 'error', error: message });
      stopAllResources();
    }
  }, [modelReady, micState, updateDiagnostics, stopAllResources]);

  const pause = useCallback(() => {
    if (micState !== 'active') return;
    isPausedRef.current = true;
    setMicState('paused');
    updateDiagnostics({ micState: 'paused' });
  }, [micState, updateDiagnostics]);

  const resume = useCallback(() => {
    if (micState !== 'paused') return;
    isPausedRef.current = false;
    setMicState('active');
    updateDiagnostics({ micState: 'active' });
  }, [micState, updateDiagnostics]);

  const stop = useCallback(() => {
    stopAllResources();
    setMicState('idle');
    setLatestPredictions([]);
    updateDiagnostics({
      micState: 'idle',
      audioContextState: 'none',
      inputSampleRate: 0,
      lastInferenceTime: null,
      lastInferenceDuration: null,
      error: null,
    });
  }, [stopAllResources, updateDiagnostics]);

  const toggle = useCallback(() => {
    if (micState === 'active') {
      pause();
    } else if (micState === 'paused') {
      resume();
    } else if (micState === 'idle' || micState === 'error') {
      void start();
    }
  }, [micState, pause, resume, start]);

  useEffect(() => {
    return () => {
      stopAllResources();
    };
  }, [stopAllResources]);

  useEffect(() => {
    if (!modelReady && micState !== 'idle') {
      stop();
    }
  }, [modelReady, micState, stop]);

  return {
    micState,
    diagnostics,
    latestPredictions,
    start,
    pause,
    resume,
    stop,
    toggle,
  };
}
