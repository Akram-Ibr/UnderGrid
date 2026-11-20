import { levelOfTarget } from './graph';
import type { Resource, ReportType, UgEvent } from '../engine/types';

/** Simulated demo data. Every id is fixed, so devices that seed independently merge cleanly. */
export function makeSeed(now: number): UgEvent[] {
  const base = Math.floor(now / (15 * 60_000)) * 15 * 60_000;
  const ev: UgEvent[] = [];
  let k = 0;
  const min = (m: number) => base - m * 60_000;

  const report = (key: string, dev: string, type: ReportType, kind: 'node' | 'edge', id: string, ago: number, extra: { sev?: 1 | 2 | 3; value?: number; resource?: Resource } = {}) => {
    ev.push({ kind: 'report', id: `seed-${key}`, type, target: { kind, id }, level: levelOfTarget(kind, id), severity: extra.sev ?? 2, value: extra.value, resource: extra.resource, deviceId: dev, ts: min(ago) });
  };
  const confirm = (key: string, devs: string[], ago: number) => {
    devs.forEach((d, i) => ev.push({ kind: 'vote', id: `seed-v${k++}`, reportId: `seed-${key}`, vote: 'confirm', deviceId: d, ts: min(ago - i) }));
  };

  // Verified, deep-level conditions the Directorate does not publish.
  report('heat6', 'sim-a', 'overheat', 'node', '040', 95, { sev: 3, value: 42 });
  confirm('heat6', ['sim-b', 'sim-c', 'sim-d'], 90);
  report('heat6b', 'sim-e', 'overheat', 'node', '473', 80, { sev: 3, value: 40 });
  confirm('heat6b', ['sim-a', 'sim-f'], 75);
  report('heat5', 'sim-b', 'overheat', 'node', '037', 70, { sev: 3, value: 38 });
  confirm('heat5', ['sim-c', 'sim-g'], 66);
  report('heat4', 'sim-d', 'overheat', 'node', '034', 60, { sev: 2, value: 34 });
  confirm('heat4', ['sim-e', 'sim-h'], 55);

  report('power6', 'sim-c', 'no_power', 'node', '039', 120, { sev: 3, value: 14 });
  confirm('power6', ['sim-a', 'sim-d', 'sim-g'], 110);
  report('power5', 'sim-f', 'no_power', 'node', '453', 100, { sev: 2, value: 6 });
  confirm('power5', ['sim-b', 'sim-h'], 95);

  report('water5', 'sim-g', 'bad_water', 'node', '036', 85, { sev: 3 });
  confirm('water5', ['sim-a', 'sim-c'], 80);
  report('water6', 'sim-h', 'bad_water', 'node', '474', 50, { sev: 3 });
  confirm('water6', ['sim-b', 'sim-d'], 45);

  report('blocked5', 'sim-a', 'blocked', 'edge', '037-038', 130, { sev: 2 });
  confirm('blocked5', ['sim-e', 'sim-f'], 120);

  report('supply5', 'sim-e', 'supplies', 'node', '453', 40, { value: 120, resource: 'food' });
  confirm('supply5', ['sim-a', 'sim-b'], 35);
  report('supply2', 'sim-f', 'supplies', 'node', '029', 30, { value: 300, resource: 'water' });
  confirm('supply2', ['sim-c', 'sim-g'], 25);

  report('low6', 'sim-d', 'low', 'node', '473', 20, { value: 2, resource: 'food' });
  confirm('low6', ['sim-e'], 15);

  // Demo centerpiece: flooding with 2 of 3 confirmations. One more resident verifies it and the tunnel closes.
  report('flood3', 'sim-b', 'flood', 'edge', '032-033', 12, { sev: 3 });
  confirm('flood3', ['sim-h'], 8);

  // Another pending report on a different level.
  report('water4', 'sim-g', 'bad_water', 'node', '035', 6, { sev: 2 });

  return ev;
}
