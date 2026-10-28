import { useCallback, useState } from 'react';
import type { AnomalyEvent } from '@/types';
import { loadEvents, saveEvents } from '@/lib/storage';

export function useEventHistory() {
  const [events, setEvents] = useState<AnomalyEvent[]>(loadEvents);
  const addEvent = useCallback((e: AnomalyEvent) => {
    setEvents((prev) => {
      const next = [e, ...prev].slice(0, 200);
      saveEvents(next);
      return next;
    });
  }, []);
  const clear = useCallback(() => {
    saveEvents([]);
    setEvents([]);
  }, []);
  return { events, addEvent, clear };
}
