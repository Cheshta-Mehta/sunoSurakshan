import type { ReactNode } from 'react';

type Tone = 'teal' | 'green' | 'amber' | 'red' | 'muted';

const toneClasses: Record<Tone, string> = {
  teal: 'bg-teal-500/15 text-teal-200 border-teal-400/30',
  green: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
  amber: 'bg-amber-500/15 text-amber-200 border-amber-400/30',
  red: 'bg-red-500/15 text-red-200 border-red-400/30',
  muted: 'bg-ink-600 text-slate-300 border-ink-400/40',
};

interface StatusBadgeProps {
  tone: Tone;
  label: string;
  icon?: ReactNode;
  pulse?: boolean;
}

/** Small inline status pill used across the app for connection/model/permission states. */
export function StatusBadge({ tone, label, icon, pulse }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${toneClasses[tone]}`}
      role="status"
    >
      <span className={`h-2 w-2 rounded-full bg-current ${pulse ? 'animate-pulse' : ''}`} />
      {icon}
      {label}
    </span>
  );
}
