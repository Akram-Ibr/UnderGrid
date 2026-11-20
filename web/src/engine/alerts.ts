import { targetLabel } from '../data/graph';
import { allocateAll, DEFAULT_SUPPLY, type ZoneState } from './allocation';
import type { Report, SupplyRatio } from './types';
import { VERIFY_THRESHOLD } from './verify';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Alert {
  id: string;
  level: number;
  severity: AlertSeverity;
  title: string;
  message: string;
  why: string[];
  etaHours?: number;
}

const order: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
const TYPE_NAME: Record<string, string> = {
  flood: 'flooding', blocked: 'blocked', no_power: 'a power outage', bad_water: 'unsafe water',
  overheat: 'overheating', supplies: 'supplies', low: 'low supplies',
};

/**
 * Early warnings. Power risk blends the status-quo shortfall, heat, verified outages and time since service.
 * The ETA is a model estimate, not a measurement, and is labelled that way in the UI.
 */
export function computeAlerts(reports: Report[], zones: ZoneState[], ratio: SupplyRatio = DEFAULT_SUPPLY): Alert[] {
  const alloc = allocateAll(zones, ratio);
  const alerts: Alert[] = [];

  for (const z of zones) {
    const verified = reports.filter((r) => r.status === 'verified' && r.level === z.level);
    const power = alloc.power.find((r) => r.level === z.level)!;
    const water = alloc.water.find((r) => r.level === z.level)!;
    const outages = verified.filter((r) => r.type === 'no_power').length;
    const heat = Math.min(1, Math.max(0, (z.temp - 24) / 20));
    const risk = Math.min(1, 0.55 * (1 - power.coverageDirectorate) + 0.15 * heat + 0.15 * Math.min(1, outages / 2) + 0.15 * Math.min(1, z.hoursSinceService / 24));

    if (risk >= 0.3) {
      const why = [
        `${Math.round(power.coverageDirectorate * 100)}% of power need met under current rationing`,
        ...(outages ? [`${outages} verified outage report${outages > 1 ? 's' : ''}`] : []),
        ...(z.temp >= 30 ? [`${z.temp}°C ${z.tempVerified ? 'reported by residents' : 'last known'}`] : []),
      ];
      const eta = Math.max(1, Math.round(30 * (1 - risk)));
      alerts.push({
        id: `power-${z.level}`,
        level: z.level,
        severity: risk >= 0.5 ? 'critical' : 'warning',
        title: `Level ${z.level} ${z.name}: blackout risk`,
        message: outages
          ? 'Power is already failing in parts of this level. Charge devices, store water, move vulnerable people to cooler spaces.'
          : 'Power may cut out soon. Charge devices and store water now.',
        why,
        etaHours: eta,
      });
    }

    const badWater = verified.filter((r) => r.type === 'bad_water');
    if (badWater.length) {
      alerts.push({
        id: `water-${z.level}`,
        level: z.level,
        severity: 'critical',
        title: `Level ${z.level} ${z.name}: do not drink untreated tap water`,
        message: `Residents have verified unsafe water at ${badWater.map((r) => targetLabel(r.target.kind, r.target.id)).join(', ')}. Use stored or boiled water.`,
        why: [`${badWater.length} verified bad-water report${badWater.length > 1 ? 's' : ''}`, `${Math.round(water.coverageDirectorate * 100)}% of water need met`],
      });
    }

    if (z.tempVerified && z.temp >= 38) {
      alerts.push({
        id: `heat-${z.level}`,
        level: z.level,
        severity: 'critical',
        title: `Level ${z.level} ${z.name}: heat stress`,
        message: 'Temperatures are dangerous. Reduce activity, share cooled rooms, and check on children and the elderly.',
        why: [`${z.temp}°C median of verified resident readings`],
      });
    }

    for (const r of verified.filter((x) => x.type === 'flood' || x.type === 'blocked')) {
      alerts.push({
        id: `tunnel-${r.id}`,
        level: z.level,
        severity: 'warning',
        title: `${targetLabel(r.target.kind, r.target.id)} is closed: ${TYPE_NAME[r.type]}`,
        message: 'Verified by residents. Use the Map tab to find a safe route around it.',
        why: [`${r.confirmers.length} residents confirmed`],
      });
    }
  }

  // Early signal: several people report the same thing but it is not verified yet.
  const groups = new Map<string, Report[]>();
  for (const r of reports.filter((x) => x.status === 'unverified')) {
    const key = `${r.level}:${r.type}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  for (const [key, list] of groups) {
    const devices = new Set(list.flatMap((r) => r.confirmers));
    if (devices.size >= 2) {
      const [level, type] = key.split(':');
      alerts.push({
        id: `pending-${key}`,
        level: Number(level),
        severity: 'info',
        title: `Level ${level}: possible ${TYPE_NAME[type]}`,
        message: `${devices.size} residents have reported this, but it needs ${VERIFY_THRESHOLD} to be verified. Confirm it if you can see it.`,
        why: [`${devices.size} of ${VERIFY_THRESHOLD} confirmations`],
      });
    }
  }

  return alerts.sort((a, b) => order[a.severity] - order[b.severity] || b.level - a.level);
}
