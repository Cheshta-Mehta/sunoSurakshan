import type { SoundCategoryStatus } from './audio/soundCategories';

export type ScreenId =
  | 'home'
  | 'permission'
  | 'listening'
  | 'alert'
  | 'settings'
  | 'history'
  | 'diagnostics'
  | 'test';

export interface DetectionEvent {
  id: string;
  /** User-facing category id (e.g. 'fire_alarm'). */
  categoryId: string;
  /** Raw YAMNet class label that triggered the alert. */
  yamnetLabel: string;
  /** Model confidence score, 0..1. */
  score: number;
  /** ISO timestamp string. */
  timestamp: string;
  /** 'live' from microphone, 'clip' from a prerecorded test file. */
  source: 'live' | 'clip';
}

export interface SoundSettings {
  /** Per-category enabled flags. */
  enabled: Record<string, boolean>;
  /** Per-category confidence thresholds (0..1). */
  thresholds: Record<string, number>;
  /** Cooldown between repeated alerts of the same category, in ms. */
  cooldownMs: number;
  /** Vibration on alert where supported. */
  vibration: boolean;
  /** Screen flashing / pulsing border on alert. */
  visualFlash: boolean;
  /** Loud beep alarm sound on alert. */
  soundAlarm: boolean;
  /** Number of consecutive qualifying detections required before alerting. */
  confirmCount: number;
}

export type ModelLoadState =
  | { status: 'idle' }
  | { status: 'loading'; progress: number }
  | { status: 'ready' }
  | { status: 'error'; message: string };

export type ConnectivityState = 'online' | 'offline';

export interface CategoryReadiness {
  id: string;
  status: SoundCategoryStatus;
  ready: boolean;
}

/** Top-N prediction from the model for debugging / test-clip mode. */
export interface Prediction {
  label: string;
  score: number;
}
