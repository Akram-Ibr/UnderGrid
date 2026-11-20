import { LEVELS } from '../data/graph';
import type { Report, Resource, SupplyRatio } from './types';

export const DEFAULT_SUPPLY: SupplyRatio = { power: 0.62, water: 0.7, food: 0.75 };
export const RESOURCES: Resource[] = ['power', 'water', 'food'];
export const UNITS: Record<Resource, string> = { power: 'MW', water: 'kL/day', food: 't/day' };
export const RESOURCE_LABEL: Record<Resource, string> = { power: 'Power', water: 'Water', food: 'Food' };

const PER_CAPITA: Record<Resource, number> = { power: 0.5, water: 120, food: 0.6 };
/** Every level gets at least this share of its demand under the fair rule. */
export const FLOOR = 0.4;

const HAZARD_TYPES = new Set(['flood', 'blocked', 'no_power', 'bad_water', 'overheat']);

export interface ZoneState {
  level: number;
  name: string;
  depth: number;
  population: number;
  temp: number;
  tempVerified: boolean;
  hazards: number;
  hoursSinceService: number;
}

export interface AllocRow {
  level: number;
  name: string;
  demand: number;
  directorate: number;
  fair: number;
  coverageDirectorate: number;
  coverageFair: number;
  need: number;
  priority: number;
  reason: string;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Per-level conditions derived ONLY from verified reports (plus last-known baseline temperature). */
export function zoneStates(reports: Report[], now: number): ZoneState[] {
  return LEVELS.map((lv) => {
    const verified = reports.filter((r) => r.status === 'verified' && r.level === lv.id);
    const temps = verified.filter((r) => r.type === 'overheat' && typeof r.value === 'number').map((r) => r.value as number);
    const outageAges = verified.filter((r) => r.type === 'no_power').map((r) => (now - r.ts) / 3600_000 + (r.value ?? 0));
    return {
      level: lv.id,
      name: lv.name,
      depth: lv.depth,
      population: lv.population,
      temp: temps.length ? Math.round(median(temps)) : lv.baseTemp,
      tempVerified: temps.length > 0,
      hazards: verified.filter((r) => HAZARD_TYPES.has(r.type)).length,
      hoursSinceService: Math.min(48, outageAges.length ? Math.max(...outageAges) : 0),
    };
  });
}

export function demandFor(resource: Resource, z: Pick<ZoneState, 'population' | 'temp'>): number {
  const base = z.population * PER_CAPITA[resource];
  if (resource === 'power') return base * (1 + Math.max(0, z.temp - 28) / 25); // cooling load
  if (resource === 'water') return base * (1 + Math.max(0, z.temp - 30) / 60);
  return base;
}

/** Total supply is fixed from baseline demand, so heat and hazards raise need without creating supply. */
export function totalSupply(resource: Resource, ratio: SupplyRatio): number {
  const baseline = LEVELS.reduce((s, lv) => s + demandFor(resource, { population: lv.population, temp: lv.baseTemp }), 0);
  return baseline * ratio[resource];
}

/** Directorate rule: upper levels are served first, in full, until supply runs out. */
export function directorateAllocation(zones: ZoneState[], demand: Map<number, number>, supply: number): Map<number, number> {
  let remaining = supply;
  const out = new Map<number, number>();
  for (const z of [...zones].sort((a, b) => a.depth - b.depth)) {
    const a = Math.min(demand.get(z.level)!, remaining);
    out.set(z.level, a);
    remaining -= a;
  }
  return out;
}

/** Need score in [0, 1]. Shortfall is measured against the status quo (the Directorate rule). */
export function needScore(z: ZoneState, shortfall: number): number {
  const heat = Math.min(1, Math.max(0, (z.temp - 24) / 20));
  const depth = (z.depth - 1) / 5;
  const hazard = Math.min(1, z.hazards / 4);
  const hours = Math.min(1, z.hoursSinceService / 48);
  return 0.4 * shortfall + 0.2 * heat + 0.15 * depth + 0.15 * hazard + 0.1 * hours;
}

/** Weighted fair share: a floor for everyone, then the rest by population x need, capped at demand with redistribution. */
export function fairAllocation(zones: ZoneState[], demand: Map<number, number>, need: Map<number, number>, supply: number): Map<number, number> {
  const alloc = new Map<number, number>();
  let floorSum = 0;
  for (const z of zones) floorSum += demand.get(z.level)! * FLOOR;
  const scale = floorSum > supply ? supply / floorSum : 1;
  let used = 0;
  for (const z of zones) {
    const a = demand.get(z.level)! * FLOOR * scale;
    alloc.set(z.level, a);
    used += a;
  }
  let remaining = supply - used;
  for (let i = 0; i < 25 && remaining > 1e-9; i++) {
    const active = zones.filter((z) => alloc.get(z.level)! < demand.get(z.level)! - 1e-9);
    if (!active.length) break;
    const totalW = active.reduce((s, z) => s + z.population * (0.05 + need.get(z.level)!), 0);
    let given = 0;
    for (const z of active) {
      const share = (remaining * z.population * (0.05 + need.get(z.level)!)) / totalW;
      const add = Math.min(share, demand.get(z.level)! - alloc.get(z.level)!);
      alloc.set(z.level, alloc.get(z.level)! + add);
      given += add;
    }
    remaining -= given;
  }
  return alloc;
}

function reasonFor(z: ZoneState, resource: Resource, rank: number, covDir: number, covFair: number): string {
  const parts: string[] = [];
  if (z.hazards > 0) parts.push(`${z.hazards} verified hazard${z.hazards > 1 ? 's' : ''}`);
  if (z.temp >= 30) parts.push(`${z.temp}°C${z.tempVerified ? ' (resident-verified)' : ' (last known)'}`);
  if (covDir < 0.9) parts.push(`only ${Math.round(covDir * 100)}% of ${resource} need met under the Directorate rule`);
  if (z.hoursSinceService >= 1) parts.push(`${Math.round(z.hoursSinceService)} h since last full service`);
  if (z.depth >= 5) parts.push('deep level');
  if (covDir >= 0.9 && covFair < covDir - 0.05) parts.push(`fully served today, gives up ${Math.round((covDir - covFair) * 100)} points of ${resource} so deeper levels get some, and still keeps ${Math.round(covFair * 100)}%`);
  return parts.length ? `Priority ${rank}: ${parts.join(', ')}.` : `Priority ${rank}: needs are currently met under both rules.`;
}

export function allocate(resource: Resource, zones: ZoneState[], ratio: SupplyRatio = DEFAULT_SUPPLY): AllocRow[] {
  const demand = new Map(zones.map((z) => [z.level, demandFor(resource, z)]));
  const supply = totalSupply(resource, ratio);
  const dir = directorateAllocation(zones, demand, supply);
  const need = new Map(zones.map((z) => [z.level, needScore(z, 1 - dir.get(z.level)! / demand.get(z.level)!)]));
  const fair = fairAllocation(zones, demand, need, supply);
  const ranked = [...zones].sort((a, b) => need.get(b.level)! - need.get(a.level)!).map((z) => z.level);

  return zones.map((z) => {
    const d = demand.get(z.level)!;
    const covDir = dir.get(z.level)! / d;
    const rank = ranked.indexOf(z.level) + 1;
    return {
      level: z.level,
      name: z.name,
      demand: d,
      directorate: dir.get(z.level)!,
      fair: fair.get(z.level)!,
      coverageDirectorate: covDir,
      coverageFair: fair.get(z.level)! / d,
      need: need.get(z.level)!,
      priority: rank,
      reason: reasonFor(z, resource, rank, covDir, fair.get(z.level)! / d),
    };
  });
}

export function allocateAll(zones: ZoneState[], ratio: SupplyRatio = DEFAULT_SUPPLY): Record<Resource, AllocRow[]> {
  return { power: allocate('power', zones, ratio), water: allocate('water', zones, ratio), food: allocate('food', zones, ratio) };
}

/** Coverage of a group of levels (e.g. deep levels 4-6) as a share of their combined demand. */
export function groupCoverage(rows: AllocRow[], levels: number[], rule: 'directorate' | 'fair'): number {
  const sel = rows.filter((r) => levels.includes(r.level));
  const d = sel.reduce((s, r) => s + r.demand, 0);
  return d ? sel.reduce((s, r) => s + r[rule], 0) / d : 0;
}
