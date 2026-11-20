import type { ReportType } from '../engine/types';

const PATHS: Record<ReportType, string> = {
  flood: 'M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0',
  blocked: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5.6 5.6l12.8 12.8',
  no_power: 'M13 2 5 14h6l-1 8 8-12h-6z',
  bad_water: 'M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11zM12 12v4M12 18.5v.5',
  overheat: 'M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0zM12 9v7',
  supplies: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  low: 'M12 4v11M12 19v1.5',
};

export function Icon({ type, size = 20 }: { type: ReportType; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[type]} />
    </svg>
  );
}

export function iconPath(type: ReportType) { return PATHS[type]; }
