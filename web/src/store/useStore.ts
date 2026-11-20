import { useMemo, useSyncExternalStore } from 'react';
import { zoneStates } from '../engine/allocation';
import { deriveReports } from '../engine/verify';
import { hazardEdges } from '../engine/routing';
import { store } from './store';

export function useUnderGrid() {
  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const derived = useMemo(() => {
    const reports = deriveReports(snap.events, snap.now);
    const zones = zoneStates(reports, snap.now);
    const hazards = hazardEdges(reports);
    return { reports, zones, hazards };
  }, [snap.events, snap.now]);
  return { snap, ...derived, store };
}
