import { matchCategory, type SoundCategory } from '@/audio/soundCategories';
import type { Prediction, DetectionEvent, SoundSettings } from '@/types';

export type AlertPriority = 'critical' | 'high' | 'medium' | 'low';

export interface AlertConfig {
  categoryId: string;
  displayName: string;
  description: string;
  priority: AlertPriority;
  defaultThreshold: number;
  confirmCount: number;
  defaultCooldownMs: number;
  visualFlashEnabled: boolean;
}

export const ALERT_CONFIGS: Record<string, AlertConfig> = {
  fire_alarm: {
    categoryId: 'fire_alarm',
    displayName: 'Fire / Smoke Alarm',
    description: 'Smoke detectors and fire alarms',
    priority: 'critical',
    defaultThreshold: 0.3,
    confirmCount: 1,
    defaultCooldownMs: 10000,
    visualFlashEnabled: true,
  },
  siren: {
    categoryId: 'siren',
    displayName: 'Siren',
    description: 'Emergency vehicle sirens',
    priority: 'critical',
    defaultThreshold: 0.3,
    confirmCount: 1,
    defaultCooldownMs: 8000,
    visualFlashEnabled: true,
  },
  glass_break: {
    categoryId: 'glass_break',
    displayName: 'Glass Breaking',
    description: 'Shattering glass',
    priority: 'high',
    defaultThreshold: 0.3,
    confirmCount: 1,
    defaultCooldownMs: 10000,
    visualFlashEnabled: true,
  },
  baby_cry: {
    categoryId: 'baby_cry',
    displayName: 'Baby Crying',
    description: 'Infant crying',
    priority: 'medium',
    defaultThreshold: 0.3,
    confirmCount: 1,
    defaultCooldownMs: 15000,
    visualFlashEnabled: false,
  },
  doorbell: {
    categoryId: 'doorbell',
    displayName: 'Doorbell',
    description: 'Doorbell chime',
    priority: 'low',
    defaultThreshold: 0.3,
    confirmCount: 1,
    defaultCooldownMs: 10000,
    visualFlashEnabled: false,
  },
  dog_bark: {
    categoryId: 'dog_bark',
    displayName: 'Dog Barking',
    description: 'Dog barks',
    priority: 'low',
    defaultThreshold: 0.3,
    confirmCount: 1,
    defaultCooldownMs: 10000,
    visualFlashEnabled: false,
  },
};

const priorityOrder: Record<AlertPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export interface AlertEngineState {
  /** Per-category consecutive detection streak above threshold. */
  streaks: Record<string, number>;
  /** Per-category last alert timestamp (ms epoch). */
  lastAlertTime: Record<string, number>;
}

export interface AlertEvaluation {
  shouldAlert: boolean;
  event: DetectionEvent | null;
  category: SoundCategory | null;
  reason: string;
}

export function createAlertEngineState(): AlertEngineState {
  return { streaks: {}, lastAlertTime: {} };
}

/**
 * Evaluate a batch of predictions against alert rules.
 * Uses the verified label mapping, thresholds, confirmation counts, and cooldowns.
 * Does not invent predictions or fabricate events.
 */
export function evaluateAlert(
  predictions: Prediction[],
  settings: SoundSettings,
  engineState: AlertEngineState,
  source: 'live' | 'clip',
  now: number = Date.now(),
): AlertEvaluation {
  const defaultReason = 'No supported category met the threshold';

  for (const pred of predictions) {
    if (!pred.label) continue;

    const cat = matchCategory(pred.label, pred.score, settings.thresholds);
    if (!cat) continue;
    if (cat.status === 'unsupported') continue;
    if (!(settings.enabled[cat.id] ?? true)) {
      continue;
    }

    const config = ALERT_CONFIGS[cat.id];
    if (!config) continue;

    const currentStreak = (engineState.streaks[cat.id] ?? 0) + 1;
    engineState.streaks[cat.id] = currentStreak;

    // Use the user's global confirmCount setting, but allow per-category override from config
    const confirmCount = settings.confirmCount ?? config.confirmCount;
    if (currentStreak < confirmCount) {
      return {
        shouldAlert: false,
        event: null,
        category: cat,
        reason: `Confirmation: ${currentStreak}/${confirmCount} detections for ${cat.label}`,
      };
    }

    const lastAlert = engineState.lastAlertTime[cat.id] ?? 0;
    const cooldown = settings.cooldownMs;
    if (now - lastAlert < cooldown) {
      return {
        shouldAlert: false,
        event: null,
        category: cat,
        reason: `${cat.label} in cooldown (${((now - lastAlert) / 1000).toFixed(1)}s elapsed)`,
      };
    }

    engineState.lastAlertTime[cat.id] = now;
    engineState.streaks[cat.id] = 0;

    const event: DetectionEvent = {
      id: `${cat.id}-${now}`,
      categoryId: cat.id,
      yamnetLabel: pred.label,
      score: pred.score,
      timestamp: new Date(now).toISOString(),
      source,
    };

    return {
      shouldAlert: true,
      event,
      category: cat,
      reason: `${cat.label} detected at ${(pred.score * 100).toFixed(0)}% (confirmed after ${confirmCount} detection${confirmCount > 1 ? 's' : ''})`,
    };
  }

  return {
    shouldAlert: false,
    event: null,
    category: null,
    reason: defaultReason,
  };
}

export function getPriority(categoryId: string): AlertPriority {
  return ALERT_CONFIGS[categoryId]?.priority ?? 'low';
}

export function sortByPriority(categories: SoundCategory[]): SoundCategory[] {
  return [...categories].sort((a, b) => {
    const pa = getPriority(a.id);
    const pb = getPriority(b.id);
    return priorityOrder[pa] - priorityOrder[pb];
  });
}

export function getConfirmCount(categoryId: string): number {
  return ALERT_CONFIGS[categoryId]?.confirmCount ?? 1;
}
