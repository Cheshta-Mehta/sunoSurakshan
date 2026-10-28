import { useCallback, useEffect, useState } from 'react';
import type { MachineProfile, Sector, StoredBaseline } from '@/types';
import { loadActiveId, loadProfiles, saveActiveId, saveProfiles } from '@/lib/storage';

export function useProfiles() {
  const [profiles, setProfiles] = useState<MachineProfile[]>(loadProfiles);
  const [activeId, setActiveId] = useState<string>(() => loadActiveId() ?? '');

  const active = profiles.find((p) => p.id === activeId) ?? profiles[0] ?? null;
  const activeKey = active?.id;

  useEffect(() => saveProfiles(profiles), [profiles]);
  useEffect(() => {
    if (activeKey) saveActiveId(activeKey);
  }, [activeKey]);

  const add = useCallback((name: string, sector: Sector) => {
    const id = `m-${Date.now()}`;
    setProfiles((p) => [...p, { id, name: name.trim() || 'New machine', sector, baseline: null, createdAt: new Date().toISOString() }]);
    setActiveId(id);
  }, []);

  const remove = useCallback((id: string) => {
    setProfiles((p) => (p.length > 1 ? p.filter((x) => x.id !== id) : p));
    setActiveId('');
  }, []);

  const setBaseline = useCallback((id: string, baseline: StoredBaseline) => {
    setProfiles((p) => p.map((x) => (x.id === id ? { ...x, baseline } : x)));
  }, []);

  return { profiles, active, setActive: setActiveId, add, remove, setBaseline };
}
