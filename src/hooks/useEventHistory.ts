import { useCallback, useEffect, useState } from 'react';
import type { DetectionEvent } from '@/types';
import { clearEvents, loadEvents, saveEvents } from '@/lib/storage';

/** Timestamped local event history, persisted to localStorage (newest first). */
export function useEventHistory() {
  const [events, setEvents] = useState<DetectionEvent[]>(() => loadEvents());

  useEffect(() => {
    saveEvents(events);
  }, [events]);

  const addEvent = useCallback((event: DetectionEvent) => {
    setEvents((prev) => [event, ...prev].slice(0, 200));
  }, []);

  const clear = useCallback(() => {
    clearEvents();
    setEvents([]);
  }, []);

  return { events, addEvent, clear };
}
