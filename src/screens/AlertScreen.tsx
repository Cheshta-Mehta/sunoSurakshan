import { useEffect, useRef } from 'react';
import { X, Vibrate, Volume2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/Button';
import { soundById } from '@/audio/soundCategories';
import { getPriority, type AlertPriority } from '@/audio/alertEngine';
import { AlarmSound } from '@/audio/alarmSound';
import type { DetectionEvent } from '@/types';

interface AlertScreenProps {
  event: DetectionEvent | null;
  visualFlash: boolean;
  vibration: boolean;
  soundAlarm: boolean;
  reducedMotion: boolean;
  onDismiss: () => void;
}

const priorityBorder: Record<AlertPriority, string> = {
  critical: 'border-red-400',
  high: 'border-amber-400',
  medium: 'border-cyan-400',
  low: 'border-teal-400',
};

const priorityAccent: Record<AlertPriority, string> = {
  critical: 'text-red-300',
  high: 'text-amber-300',
  medium: 'text-cyan-300',
  low: 'text-teal-300',
};

const priorityBg: Record<AlertPriority, string> = {
  critical: 'bg-red-500/10',
  high: 'bg-amber-500/10',
  medium: 'bg-cyan-500/10',
  low: 'bg-teal-500/10',
};

const priorityLabel: Record<AlertPriority, string> = {
  critical: 'CRITICAL ALERT',
  high: 'HIGH PRIORITY ALERT',
  medium: 'ALERT',
  low: 'NOTIFICATION',
};

export function AlertScreen({
  event,
  visualFlash,
  vibration,
  soundAlarm,
  reducedMotion,
  onDismiss,
}: AlertScreenProps) {
  const cat = event ? soundById(event.categoryId) : null;
  const priority = event ? getPriority(event.categoryId) : 'low';
  const alarmRef = useRef<AlarmSound | null>(null);

  useEffect(() => {
    if (!event || !soundAlarm) return;
    const alarm = new AlarmSound();
    alarmRef.current = alarm;
    alarm.start(priority);
    return () => {
      alarm.stop();
      alarmRef.current = null;
    };
  }, [event, soundAlarm, priority]);

  useEffect(() => {
    if (!event || !vibration || !('vibrate' in navigator)) return;
    const pattern =
      priority === 'critical'
        ? [400, 150, 400, 150, 400, 150, 800]
        : priority === 'high'
          ? [300, 120, 300, 120, 600]
          : [300, 120, 600];
    navigator.vibrate?.(pattern);
  }, [event, vibration, priority]);

  useEffect(() => {
    if (!event) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [event, onDismiss]);

  if (!event || !cat) return null;

  const Icon = cat.icon;
  const accentText = priorityAccent[priority];
  const borderColor = priorityBorder[priority];
  const bgTint = priorityBg[priority];
  const flashClass = visualFlash && !reducedMotion ? 'animate-border-flash' : '';

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alert-title"
      aria-describedby="alert-desc"
      aria-live="assertive"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center bg-ink-900 ${flashClass}`}
    >
      <div
        className={`flex h-40 w-40 items-center justify-center rounded-full border-4 ${borderColor} ${bgTint} ${
          visualFlash && !reducedMotion ? 'animate-pulse' : ''
        }`}
      >
        <Icon className={`h-20 w-20 ${accentText}`} />
      </div>

      <p className={`mt-6 text-sm font-semibold uppercase tracking-widest ${accentText}`}>
        {priorityLabel[priority]}
      </p>
      <h1 id="alert-title" className="mt-2 text-4xl font-extrabold text-slate-50 sm:text-5xl">
        {cat.label.toUpperCase()} DETECTED
      </h1>
      <p id="alert-desc" className="mt-3 max-w-md text-lg text-slate-200">
        {cat.description}. {event.source === 'clip' ? '(Test clip)' : ''}
      </p>
      <p className="mt-2 text-sm text-slate-400">
        Model label: <span className="font-mono">{event.yamnetLabel}</span> · Score:{' '}
        {Math.round(event.score * 100)}%
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {new Date(event.timestamp).toLocaleString()}
      </p>

      <div className="mt-8 flex items-center gap-3">
        <Button size="xl" variant="danger" onClick={onDismiss} autoFocus>
          <X className="h-6 w-6" />
          Acknowledge & dismiss
        </Button>
      </div>

      <div className="mt-4 flex flex-col items-center gap-2 text-xs text-slate-500">
        <p className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          This is a visual alert. It does not rely on color alone.
          {'vibrate' in navigator ? (
            <span className="ml-2 inline-flex items-center gap-1">
              <Vibrate className="h-4 w-4" /> Vibration active
            </span>
          ) : null}
          {soundAlarm ? (
            <span className="ml-2 inline-flex items-center gap-1">
              <Volume2 className="h-4 w-4" /> Beep alarm active
            </span>
          ) : null}
        </p>
        <p className="flex items-center gap-2 max-w-md text-center">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
          This is an accessibility prototype, not a certified safety device. It cannot replace
          certified fire alarms, smoke alarms, or emergency warning systems.
        </p>
      </div>
    </div>
  );
}
