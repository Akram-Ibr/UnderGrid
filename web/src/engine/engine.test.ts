import { describe, expect, it } from 'vitest';
import { allocate, allocateAll, groupCoverage, totalSupply, zoneStates, DEFAULT_SUPPLY } from './allocation';
import { computeAlerts } from './alerts';
import { hazardEdges, shortestPath } from './routing';
import { deriveReports, filterAbuse, RATE_MAX } from './verify';
import { realNumbers } from './realNumbers';
import { makeSeed } from '../data/seed';
import type { ReportEvent, UgEvent, VoteEvent } from './types';

const NOW = Date.UTC(2026, 10, 16, 15, 0, 0);

const rep = (id: string, dev: string, ts = NOW - 60_000, over: Partial<ReportEvent> = {}): ReportEvent => ({
  kind: 'report', id, type: 'flood', target: { kind: 'edge', id: '032-033' }, level: 4, severity: 2, deviceId: dev, ts, ...over,
});
const vote = (id: string, reportId: string, dev: string, v: 'confirm' | 'dismiss' = 'confirm', ts = NOW - 30_000): VoteEvent => ({
  kind: 'vote', id, reportId, vote: v, deviceId: dev, ts,
});

describe('verification', () => {
  it('stays unverified until 3 distinct residents confirm', () => {
    const base: UgEvent[] = [rep('r1', 'a'), vote('v1', 'r1', 'b')];
    expect(deriveReports(base, NOW)[0].status).toBe('unverified');
    expect(deriveReports([...base, vote('v2', 'r1', 'c')], NOW)[0].status).toBe('verified');
  });

  it('does not count the same device twice or the reporter voting on their own report', () => {
    const ev: UgEvent[] = [rep('r1', 'a'), vote('v1', 'r1', 'b'), vote('v2', 'r1', 'b'), vote('v3', 'r1', 'a')];
    const r = deriveReports(ev, NOW)[0];
    expect(r.confirmers.sort()).toEqual(['a', 'b']);
    expect(r.status).toBe('unverified');
  });

  it('lets a device change its vote (latest wins)', () => {
    const ev: UgEvent[] = [rep('r1', 'a'), vote('v1', 'r1', 'b', 'confirm', NOW - 50_000), vote('v2', 'r1', 'b', 'dismiss', NOW - 10_000)];
    const r = deriveReports(ev, NOW)[0];
    expect(r.confirmers).toEqual(['a']);
    expect(r.dismissers).toEqual(['b']);
  });

  it('expires reports after their time to live', () => {
    const old = rep('r1', 'a', NOW - 7 * 3600_000); // flood ttl is 6 h
    expect(deriveReports([old], NOW)[0].status).toBe('expired');
  });

  it('marks reports dismissed when enough residents say they are not there', () => {
    const ev: UgEvent[] = [rep('r1', 'a'), vote('v1', 'r1', 'b', 'dismiss'), vote('v2', 'r1', 'c', 'dismiss'), vote('v3', 'r1', 'd', 'dismiss')];
    expect(deriveReports(ev, NOW)[0].status).toBe('dismissed');
  });

  it('rate limits a device that floods the system and ignores duplicate ids', () => {
    const spam = Array.from({ length: RATE_MAX + 8 }, (_, i) => rep(`s${i}`, 'spammer', NOW - 60_000 + i));
    expect(filterAbuse(spam).length).toBe(RATE_MAX);
    expect(filterAbuse([rep('x', 'a'), rep('x', 'a')]).length).toBe(1);
  });
});

describe('routing', () => {
  const closed = (edge: string) => {
    const ev: UgEvent[] = [rep('r1', 'a', NOW - 60_000, { target: { kind: 'edge', id: edge } }), vote('v1', 'r1', 'b'), vote('v2', 'r1', 'c')];
    return hazardEdges(deriveReports(ev, NOW));
  };

  it('finds a route and detours around a verified flooded tunnel', () => {
    const open = shortestPath('026', '034', new Set())!;
    expect(open.edges).toContain('032-033');
    const { blocked } = closed('032-033');
    const detour = shortestPath('026', '034', blocked)!;
    expect(detour).not.toBeNull();
    expect(detour.edges).not.toContain('032-033');
    expect(detour.length).toBeGreaterThan(open.length);
  });

  it('treats a flooded junction as closing all its tunnels', () => {
    const ev: UgEvent[] = [rep('r1', 'a', NOW - 60_000, { target: { kind: 'node', id: '032' } }), vote('v1', 'r1', 'b'), vote('v2', 'r1', 'c')];
    const { blocked } = hazardEdges(deriveReports(ev, NOW));
    expect(blocked.has('031-032')).toBe(true);
    expect(blocked.has('032-033')).toBe(true);
    expect(shortestPath('026', '034', blocked)!.nodes).not.toContain('032');
  });

  it('returns null when a destination is cut off', () => {
    const all = new Set(['027-028', '027-435', '026-027']);
    expect(shortestPath('026', '040', all)).toBeNull();
  });

  it('penalises but does not forbid unverified hazards', () => {
    // Still routable through an unverified hazard when the detour costs more than the penalty.
    const r = shortestPath('031', '033', new Set(), new Set(['032-033']))!;
    expect(r).not.toBeNull();
    // A verified closure forces the longer detour; an unverified one does not.
    const forced = shortestPath('031', '033', new Set(['032-033']))!;
    expect(forced.edges).not.toContain('032-033');
    expect(forced.length).toBeGreaterThan(r.length);
    const only = shortestPath('447', '033', new Set(), new Set(['033-447']))!;
    expect(only.edges).toEqual(['033-447']);
  });
});

describe('allocation', () => {
  const reports = deriveReports(makeSeed(NOW), NOW);
  const zones = zoneStates(reports, NOW);

  it('never allocates more than supply or more than demand', () => {
    for (const res of ['power', 'water', 'food'] as const) {
      const rows = allocate(res, zones);
      const supply = totalSupply(res, DEFAULT_SUPPLY);
      for (const rule of ['directorate', 'fair'] as const) {
        expect(rows.reduce((s, r) => s + r[rule], 0)).toBeLessThanOrEqual(supply + 1e-6);
      }
      for (const r of rows) {
        expect(r.fair).toBeLessThanOrEqual(r.demand + 1e-6);
        expect(r.fair / r.demand).toBeGreaterThanOrEqual(0.4 - 1e-6);
      }
    }
  });

  it('uses all of the supply under the fair rule', () => {
    const rows = allocate('power', zones);
    expect(rows.reduce((s, r) => s + r.fair, 0)).toBeCloseTo(totalSupply('power', DEFAULT_SUPPLY), 3);
  });

  it('serves the deep levels better than the Directorate rule while upper levels stay served', () => {
    const all = allocateAll(zones);
    for (const res of ['power', 'water', 'food'] as const) {
      const deepDir = groupCoverage(all[res], [4, 5, 6], 'directorate');
      const deepFair = groupCoverage(all[res], [4, 5, 6], 'fair');
      expect(deepFair).toBeGreaterThan(deepDir);
      expect(groupCoverage(all[res], [1, 2, 3], 'fair')).toBeGreaterThan(0.4);
    }
    expect(all.power.find((r) => r.level === 6)!.coverageDirectorate).toBe(0);
  });

  it('ranks the deepest, hottest, hazard-hit level as top priority and explains why', () => {
    const rows = allocate('power', zones);
    const top = rows.find((r) => r.priority === 1)!;
    expect(top.level).toBe(6);
    expect(top.reason).toMatch(/verified hazard/);
    expect(top.reason).toMatch(/Directorate rule/);
  });

  it('is honest that fully served upper levels give something up', () => {
    const upper = allocate('power', zones).find((r) => r.level === 1)!;
    expect(upper.reason).toMatch(/gives up/);
    expect(upper.reason).not.toMatch(/met under both rules/);
  });

  it('shifts toward a level when residents verify hazards there', () => {
    const calm = zoneStates([], NOW);
    const before = allocate('power', calm).find((r) => r.level === 4)!;
    const after = allocate('power', zones).find((r) => r.level === 4)!;
    expect(after.need).toBeGreaterThan(before.need);
  });
});

describe('alerts and real numbers', () => {
  const reports = deriveReports(makeSeed(NOW), NOW);
  const zones = zoneStates(reports, NOW);

  it('raises critical alerts for deep levels with reasons and an ETA', () => {
    const alerts = computeAlerts(reports, zones);
    const l6 = alerts.find((a) => a.id === 'power-6')!;
    expect(l6.severity).toBe('critical');
    expect(l6.why.length).toBeGreaterThan(0);
    expect(l6.etaHours).toBeGreaterThanOrEqual(1);
    expect(alerts.some((a) => a.id.startsWith('water-'))).toBe(true);
  });

  it('only counts verified reports in Real Numbers', () => {
    const { totals, rows } = realNumbers(reports, zones);
    expect(totals.outages).toBe(2);
    expect(totals.unsafeWater).toBe(2); // level 4 bad-water report is still unverified
    expect(rows.find((r) => r.level === 6)!.residentTemp).toBeGreaterThanOrEqual(40);
    expect(rows.find((r) => r.level === 1)!.residentTemp).toBeNull();
  });

  it('seed leaves a flood at 2 of 3 and verification closes the tunnel', () => {
    const flood = reports.find((r) => r.id === 'seed-flood3')!;
    expect(flood.status).toBe('unverified');
    expect(flood.confirmers.length).toBe(2);
    const more = deriveReports([...makeSeed(NOW), vote('new', 'seed-flood3', 'me')], NOW);
    expect(more.find((r) => r.id === 'seed-flood3')!.status).toBe('verified');
    expect(hazardEdges(more).blocked.has('032-033')).toBe(true);
  });
});
