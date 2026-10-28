import {
  Flame,
  Wine,
  Baby,
  BellRing,
  Siren,
  Dog,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

/**
 * Target sounds SunoSuraksha aims to alert on. Each entry maps one or more
 * YAMNet class labels (521-class AudioSet ontology) to a user-facing category.
 *
 * IMPORTANT: YAMNet is a general sound-event classifier and may not have a
 * dedicated class for every target. Categories whose mapping cannot be
 * reliably matched are marked `status: 'experimental'` or `'unsupported'`.
 * No labels, confidence values, or capabilities are invented here.
 *
 * The `yamnetLabels` array lists YAMNet class names verified against the
 * actual model label map (`yamnet_class_map.csv`, the official 521-class
 * AudioSet ontology shipped with YAMNet). Each label has been confirmed to
 * exist in the model's output.
 */

export type SoundCategoryStatus = 'supported' | 'experimental' | 'unsupported';

export interface SoundCategory {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Candidate YAMNet AudioSet class names to match. */
  yamnetLabels: string[];
  status: SoundCategoryStatus;
  /** Default minimum confidence (0..1) to trigger an alert. */
  defaultThreshold: number;
  /** Default UI color accent token. */
  accent: 'red' | 'amber' | 'teal' | 'cyan' | 'green';
}

export const SOUND_CATEGORIES: SoundCategory[] = [
  {
    id: 'fire_alarm',
    label: 'Fire / Smoke Alarm',
    description: 'Smoke detectors and fire alarms',
    icon: Flame,
    yamnetLabels: ['Smoke detector, smoke alarm', 'Fire alarm', 'Alarm'],
    status: 'supported',
    defaultThreshold: 0.3,
    accent: 'red',
  },
  {
    id: 'glass_break',
    label: 'Glass Breaking',
    description: 'Shattering glass',
    icon: Wine,
    yamnetLabels: ['Glass', 'Shatter', 'Smash, crash', 'Breaking'],
    status: 'supported',
    defaultThreshold: 0.3,
    accent: 'amber',
  },
  {
    id: 'baby_cry',
    label: 'Baby Crying',
    description: 'Infant crying',
    icon: Baby,
    yamnetLabels: ['Baby cry, infant cry', 'Crying, sobbing'],
    status: 'supported',
    defaultThreshold: 0.3,
    accent: 'cyan',
  },
  {
    id: 'doorbell',
    label: 'Doorbell',
    description: 'Doorbell chime',
    icon: BellRing,
    yamnetLabels: ['Doorbell'],
    status: 'supported',
    defaultThreshold: 0.3,
    accent: 'teal',
  },
  {
    id: 'siren',
    label: 'Siren',
    description: 'Emergency vehicle sirens',
    icon: Siren,
    yamnetLabels: ['Siren', 'Civil defense siren', 'Police car (siren)', 'Ambulance (siren)', 'Fire engine, fire truck (siren)', 'Car alarm'],
    status: 'supported',
    defaultThreshold: 0.3,
    accent: 'red',
  },
  {
    id: 'dog_bark',
    label: 'Dog Barking',
    description: 'Dog barks',
    icon: Dog,
    yamnetLabels: ['Dog', 'Bark', 'Bow-wow', 'Whimper (dog)'],
    status: 'supported',
    defaultThreshold: 0.3,
    accent: 'amber',
  },
];

export const UNKNOWN_CATEGORY: SoundCategory = {
  id: 'unknown',
  label: 'Unknown sound',
  description: 'A sound was detected but not mapped',
  icon: HelpCircle,
  yamnetLabels: [],
  status: 'unsupported',
  defaultThreshold: 0.5,
  accent: 'amber',
};

export const soundById = (id: string): SoundCategory =>
  SOUND_CATEGORIES.find((c) => c.id === id) ?? UNKNOWN_CATEGORY;

/**
 * Map a raw YAMNet class label + score to a user-facing sound category.
 * Returns null when no enabled category matches above its threshold.
 * No values are invented: only categories whose yamnetLabels include the
 * incoming label are considered.
 */
export function matchCategory(
  yamnetLabel: string,
  score: number,
  thresholds: Record<string, number>,
): SoundCategory | null {
  for (const cat of SOUND_CATEGORIES) {
    const threshold = thresholds[cat.id] ?? cat.defaultThreshold;
    if (score < threshold) continue;
    if (cat.yamnetLabels.some((l) => l.toLowerCase() === yamnetLabel.toLowerCase())) {
      return cat;
    }
  }
  return null;
}
