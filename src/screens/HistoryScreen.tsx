import { History as HistoryIcon, Trash2, Inbox } from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { soundById } from '@/audio/soundCategories';
import type { DetectionEvent } from '@/types';

interface HistoryScreenProps {
  events: DetectionEvent[];
  onClear: () => void;
}

export function HistoryScreen({ events, onClear }: HistoryScreenProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="flex items-center gap-3">
        <HistoryIcon className="h-7 w-7 text-teal-300" />
        <h1 className="text-2xl font-bold text-slate-50 sm:text-3xl">Recent Event History</h1>
      </div>
      <p className="mt-2 text-slate-300">
        A local log of detected sounds. This list never leaves your device.
      </p>

      <Card
        title={`${events.length} event${events.length === 1 ? '' : 's'}`}
        icon={<HistoryIcon className="h-5 w-5" />}
        className="mt-8"
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={events.length === 0}
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        }
      >
        {events.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center text-slate-400">
            <Inbox className="mb-3 h-10 w-10 opacity-50" />
            <p>No events yet. Detected sounds will appear here when listening is active.</p>
          </div>
        ) : (
          <ul className="scroll-slim max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {events.map((event) => {
              const cat = soundById(event.categoryId);
              const Icon = cat.icon;
              return (
                <li
                  key={event.id}
                  className="flex items-center gap-3 rounded-xl border border-ink-500/40 bg-ink-600/40 p-3 animate-slide-up"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-700 text-teal-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-slate-100">{cat.label}</p>
                      {event.source === 'clip' && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200">
                          Test clip
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-slate-400">
                      <span className="font-mono">{event.yamnetLabel}</span> · {Math.round(event.score * 100)}% ·{' '}
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
