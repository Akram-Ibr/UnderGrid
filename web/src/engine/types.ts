export type ReportType = 'flood' | 'blocked' | 'no_power' | 'bad_water' | 'overheat' | 'supplies' | 'low';
export type Resource = 'power' | 'water' | 'food';
export type TargetKind = 'node' | 'edge';

export interface Target {
  kind: TargetKind;
  id: string;
}

export interface ReportEvent {
  kind: 'report';
  id: string;
  type: ReportType;
  target: Target;
  level: number;
  severity: 1 | 2 | 3;
  /** overheat: degrees C; no_power: hours without power; supplies: units available; low: days left */
  value?: number;
  resource?: Resource;
  deviceId: string;
  ts: number;
}

export interface VoteEvent {
  kind: 'vote';
  id: string;
  reportId: string;
  vote: 'confirm' | 'dismiss';
  deviceId: string;
  ts: number;
}

export type UgEvent = ReportEvent | VoteEvent;

export type ReportStatus = 'unverified' | 'verified' | 'expired' | 'dismissed';

export interface Report extends ReportEvent {
  confirmers: string[];
  dismissers: string[];
  status: ReportStatus;
  needed: number;
  expiresAt: number;
  confidence: number;
}

export type SupplyRatio = Record<Resource, number>;
