import { LEVELS } from '../data/graph';
import type { Report } from './types';
import type { ZoneState } from './allocation';

/** What the Directorate publishes. Simulated for the demo. */
export const OFFICIAL = { temp: 26, blackouts: 0, unsafeWater: 0, floodedTunnels: 0 };

export interface RealRow {
  level: number;
  name: string;
  officialTemp: number;
  residentTemp: number | null;
  outages: number;
  unsafeWater: number;
  tunnelHazards: number;
}

export function realNumbers(reports: Report[], zones: ZoneState[]): { rows: RealRow[]; totals: { outages: number; unsafeWater: number; tunnelHazards: number; verified: number } } {
  const verified = reports.filter((r) => r.status === 'verified');
  const rows = LEVELS.map((lv) => {
    const mine = verified.filter((r) => r.level === lv.id);
    const z = zones.find((x) => x.level === lv.id)!;
    return {
      level: lv.id,
      name: lv.name,
      officialTemp: OFFICIAL.temp,
      residentTemp: z.tempVerified ? z.temp : null,
      outages: mine.filter((r) => r.type === 'no_power').length,
      unsafeWater: mine.filter((r) => r.type === 'bad_water').length,
      tunnelHazards: mine.filter((r) => r.type === 'flood' || r.type === 'blocked').length,
    };
  });
  return {
    rows,
    totals: {
      outages: rows.reduce((s, r) => s + r.outages, 0),
      unsafeWater: rows.reduce((s, r) => s + r.unsafeWater, 0),
      tunnelHazards: rows.reduce((s, r) => s + r.tunnelHazards, 0),
      verified: verified.length,
    },
  };
}
