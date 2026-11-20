import type { Report, ReportType, Resource } from './engine/types';
import { UNITS } from './engine/allocation';

export interface TypeMeta {
  label: string;
  /** what the resident is saying, in plain words */
  hint: string;
  color: string;
  hazard: boolean;
}

export const TYPE_META: Record<ReportType, TypeMeta> = {
  flood: { label: 'Flooding', hint: 'Water or sewage in a tunnel', color: '#3fc1c9', hazard: true },
  blocked: { label: 'Tunnel blocked', hint: 'Collapse, debris or a locked gate', color: '#ff5a3c', hazard: true },
  no_power: { label: 'No power', hint: 'Lights or fans are out', color: '#f4c20d', hazard: false },
  bad_water: { label: 'Unsafe water', hint: 'Taps smell, taste or look wrong', color: '#4aa8ff', hazard: false },
  overheat: { label: 'Too hot', hint: 'Report the temperature you can read', color: '#ff8a3d', hazard: false },
  supplies: { label: 'Supplies here', hint: 'Water, food or power you can share', color: '#7cc85a', hazard: false },
  low: { label: 'Running low', hint: 'Your neighborhood is short on something', color: '#e0a95a', hazard: false },
};

export const REPORT_TYPES = Object.keys(TYPE_META) as ReportType[];
export const SEVERITY_LABEL = { 1: 'Minor', 2: 'Serious', 3: 'Severe' } as const;
export const RESOURCE_COLOR: Record<Resource, string> = { power: '#f4c20d', water: '#4aa8ff', food: '#7cc85a' };

export function valueText(r: Pick<Report, 'type' | 'value' | 'resource'>): string {
  if (r.value === undefined) return '';
  const res = r.resource ?? 'water';
  switch (r.type) {
    case 'overheat': return `${r.value}°C`;
    case 'no_power': return `${r.value} h without power`;
    case 'supplies': return `${r.value} ${UNITS[res]} of ${res} available`;
    case 'low': return `${r.value} day${r.value === 1 ? '' : 's'} of ${res} left`;
    default: return '';
  }
}

export function ago(ts: number, now: number): string {
  const m = Math.max(0, Math.round((now - ts) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return `${h} h ago`;
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;
