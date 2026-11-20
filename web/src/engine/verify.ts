import type { Report, ReportType, UgEvent, ReportEvent, VoteEvent } from './types';

/** Distinct residents needed before a report becomes public. */
export const VERIFY_THRESHOLD = 3;

export const TTL_HOURS: Record<ReportType, number> = {
  flood: 6,
  blocked: 24,
  no_power: 12,
  bad_water: 12,
  overheat: 8,
  supplies: 6,
  low: 12,
};

/** Anti-abuse: a device may add at most RATE_MAX events inside any RATE_WINDOW_MS window. */
export const RATE_MAX = 12;
export const RATE_WINDOW_MS = 10 * 60 * 1000;

/** Drops duplicate ids and events from devices that exceed the rate limit. Deterministic, so every device agrees. */
export function filterAbuse(events: UgEvent[]): UgEvent[] {
  const seen = new Set<string>();
  const unique: UgEvent[] = [];
  for (const e of events) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    unique.push(e);
  }
  const byDevice = new Map<string, UgEvent[]>();
  for (const e of unique) {
    const list = byDevice.get(e.deviceId) ?? [];
    list.push(e);
    byDevice.set(e.deviceId, list);
  }
  const kept = new Set<string>();
  for (const list of byDevice.values()) {
    list.sort((a, b) => a.ts - b.ts);
    const window: number[] = [];
    for (const e of list) {
      while (window.length && e.ts - window[0] >= RATE_WINDOW_MS) window.shift();
      if (window.length < RATE_MAX) {
        window.push(e.ts);
        kept.add(e.id);
      }
    }
  }
  return unique.filter((e) => kept.has(e.id));
}

/**
 * Turns the append-only event log into report views.
 * - The reporter counts as the first confirmation.
 * - Each other device gets one vote per report (its latest vote wins).
 * - Verified = enough DISTINCT confirmers; dismissed = enough distinct dismissers; expired = past its TTL.
 */
export function deriveReports(events: UgEvent[], now: number, threshold = VERIFY_THRESHOLD): Report[] {
  const clean = filterAbuse(events);
  const reports = new Map<string, ReportEvent>();
  const votes = new Map<string, VoteEvent[]>();
  for (const e of clean) {
    if (e.kind === 'report') reports.set(e.id, e);
    else {
      const list = votes.get(e.reportId) ?? [];
      list.push(e);
      votes.set(e.reportId, list);
    }
  }

  const out: Report[] = [];
  for (const r of reports.values()) {
    const latest = new Map<string, VoteEvent>();
    for (const v of (votes.get(r.id) ?? []).sort((a, b) => a.ts - b.ts)) {
      if (v.deviceId === r.deviceId) continue; // reporter cannot vote on their own report
      latest.set(v.deviceId, v);
    }
    const confirmers = [r.deviceId];
    const dismissers: string[] = [];
    for (const v of latest.values()) (v.vote === 'confirm' ? confirmers : dismissers).push(v.deviceId);

    const expiresAt = r.ts + TTL_HOURS[r.type] * 3600_000;
    let status: Report['status'] = 'unverified';
    if (now >= expiresAt) status = 'expired';
    else if (dismissers.length >= threshold && dismissers.length > confirmers.length) status = 'dismissed';
    else if (confirmers.length >= threshold && confirmers.length > dismissers.length) status = 'verified';

    out.push({
      ...r,
      confirmers,
      dismissers,
      status,
      needed: threshold,
      expiresAt,
      confidence: Math.min(1, confirmers.length / threshold),
    });
  }
  return out.sort((a, b) => b.ts - a.ts);
}

export const isLive = (r: Report) => r.status === 'verified' || r.status === 'unverified';
