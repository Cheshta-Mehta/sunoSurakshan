import { useCallback, useEffect, useState } from 'react';
import type { AnomalyEvent } from '@/types';
import { loadEvents, saveEvents } from '@/lib/storage';

export function useEventHistory() {
  const [events, setEvents] = useState<AnomalyEvent[]>(loadEvents);

  useEffect(() => {
    saveEvents(events);
  }, [events]);

  const addEvent = useCallback((e: AnomalyEvent) => setEvents((prev) => [e, ...prev].slice(0, 200)), []);
  const ack = useCallback(
    (id: string) =>
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, acknowledgedAt: new Date().toISOString() } : e))),
    [],
  );
  const clear = useCallback(() => setEvents([]), []);
  return { events, addEvent, ack, clear };
}
