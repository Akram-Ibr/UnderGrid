import { makeSeed } from '../data/seed';
import { levelOfTarget } from '../data/graph';
import type { ReportEvent, Resource, ReportType, Target, UgEvent, VoteEvent } from '../engine/types';
import { clearEvents, loadEvents, saveEvents } from './db';
import { apiUrl, getServer, normalizeServer, saveServer } from './config';

export type LinkState = 'online' | 'cut' | 'unreachable';

export interface Snapshot {
  events: UgEvent[];
  now: number;
  deviceId: string;
  /** Directorate shutdown demo switch. When true the server link is cut and only peers can sync. */
  shutdown: boolean;
  server: LinkState;
  outbox: number;
  peers: number;
  lastSync: number | null;
  mesh: { sent: number; received: number };
  /** Shared server address, '' when this device uses the server it was loaded from. */
  serverUrl: string;
  /** Devices that have talked to the shared server in the last few seconds. */
  online: number;
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

function getDeviceId(): string {
  try {
    const k = 'undergrid.device';
    let id = sessionStorage.getItem(k) ?? localStorage.getItem(k);
    if (!id) id = `dev-${uid().slice(0, 8)}`;
    // Each browser tab acts as a separate resident device so two tabs can demo peer sync.
    sessionStorage.setItem(k, id);
    return id;
  } catch {
    return `dev-${uid().slice(0, 8)}`;
  }
}

const isEvent = (x: unknown): x is UgEvent => {
  const e = x as UgEvent;
  return !!e && typeof e.id === 'string' && typeof e.deviceId === 'string' && typeof e.ts === 'number' && (e.kind === 'report' || e.kind === 'vote');
};

/**
 * Offline-first store. The event log is append-only and merged by id, so any order of delivery
 * (server, peer tab, outbox replay) converges to the same state on every device.
 */
export class Store {
  private events = new Map<string, UgEvent>();
  private outbox = new Set<string>();
  private listeners = new Set<() => void>();
  private channel: BroadcastChannel | null = null;
  private peerSeen = new Map<string, number>();
  private snap: Snapshot;
  private timer: ReturnType<typeof setInterval> | null = null;
  private poll: ReturnType<typeof setInterval> | null = null;
  private ready: Promise<void>;
  /** How many entries of the server's log this device has already received. */
  private serverSeq = 0;
  private syncing = false;
  private syncAgain = false;

  constructor() {
    this.snap = {
      events: [], now: Date.now(), deviceId: getDeviceId(), shutdown: false, server: 'online',
      outbox: 0, peers: 0, lastSync: null, mesh: { sent: 0, received: 0 },
      serverUrl: getServer(), online: 0,
    };
    this.ready = this.init();
  }

  private async init() {
    const stored = await loadEvents();
    if (stored.length === 0) {
      const seed = makeSeed(Date.now());
      this.ingest(seed, false);
      await saveEvents(seed);
    } else {
      this.ingest(stored, false);
    }
    this.setupMesh();
    this.timer = setInterval(() => {
      this.snap = { ...this.snap, now: Date.now(), peers: this.livePeers() };
      this.emit();
    }, 5000);
    window.addEventListener('online', () => void this.sync());
    // Other people's reports arrive by polling the shared server every few seconds.
    this.poll = setInterval(() => { if (!this.snap.shutdown) void this.sync(); }, 3000);
    void this.sync();
    this.rebuild();
  }

  whenReady() { return this.ready; }
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getSnapshot = () => this.snap;
  private emit() { for (const l of this.listeners) l(); }

  private rebuild(patch: Partial<Snapshot> = {}) {
    this.snap = { ...this.snap, ...patch, events: [...this.events.values()], outbox: this.outbox.size, now: Date.now(), peers: this.livePeers() };
    this.emit();
  }

  private livePeers() {
    const cutoff = Date.now() - 12_000;
    let n = 0;
    for (const t of this.peerSeen.values()) if (t > cutoff) n++;
    return n;
  }

  /** Merge events into the log. Returns the ones that were new. */
  private ingest(list: unknown[], persist = true): UgEvent[] {
    const fresh: UgEvent[] = [];
    for (const raw of list) {
      if (!isEvent(raw) || this.events.has(raw.id)) continue;
      this.events.set(raw.id, raw);
      fresh.push(raw);
    }
    if (persist && fresh.length) void saveEvents(fresh);
    return fresh;
  }

  // ---- local actions -------------------------------------------------------
  addReport(input: { type: ReportType; target: Target; severity: 1 | 2 | 3; value?: number; resource?: Resource }): ReportEvent {
    const e: ReportEvent = {
      kind: 'report', id: `r-${uid()}`, type: input.type, target: input.target, severity: input.severity,
      level: levelOfTarget(input.target.kind, input.target.id), value: input.value, resource: input.resource,
      deviceId: this.snap.deviceId, ts: Date.now(),
    };
    this.local(e);
    return e;
  }

  addVote(reportId: string, vote: 'confirm' | 'dismiss'): VoteEvent {
    const e: VoteEvent = { kind: 'vote', id: `v-${uid()}`, reportId, vote, deviceId: this.snap.deviceId, ts: Date.now() };
    this.local(e);
    return e;
  }

  private local(e: UgEvent) {
    this.ingest([e]);
    this.outbox.add(e.id);
    this.broadcast([e]);
    this.rebuild();
    void this.sync();
  }

  // ---- server sync ---------------------------------------------------------
  async sync(): Promise<void> {
    if (this.snap.shutdown) { this.rebuild({ server: 'cut' }); return; }
    if (this.syncing) { this.syncAgain = true; return; }
    this.syncing = true;
    try {
      const pending = [...this.outbox].map((id) => this.events.get(id)).filter(Boolean) as UgEvent[];
      const res = await fetch(apiUrl('/api/sync'), {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ events: pending, since: this.serverSeq, deviceId: this.snap.deviceId }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { events: UgEvent[]; seq: number; online?: number };
      for (const e of pending) this.outbox.delete(e.id);
      this.serverSeq = data.seq;
      const fresh = this.ingest(data.events);
      if (fresh.length) this.broadcast(fresh);
      const changed = fresh.length > 0 || this.snap.server !== 'online' || this.snap.online !== (data.online ?? 0) || pending.length > 0;
      if (changed) this.rebuild({ server: 'online', lastSync: Date.now(), online: data.online ?? 0 });
      else this.snap = { ...this.snap, lastSync: Date.now() };
    } catch {
      if (this.snap.server !== 'unreachable') this.rebuild({ server: 'unreachable' });
    } finally {
      this.syncing = false;
      if (this.syncAgain) { this.syncAgain = false; void this.sync(); }
    }
  }

  /**
   * Point this device at a shared server (or back to its own). Everything this device created is
   * re-sent so the new server catches up, and everything the server holds comes back.
   */
  setServerUrl(raw: string): { ok: boolean; error?: string } {
    const clean = normalizeServer(raw);
    if (clean === null) return { ok: false, error: 'That does not look like a server address. Try https://your-app.onrender.com' };
    saveServer(clean);
    this.serverSeq = 0;
    for (const e of this.events.values()) if (!e.id.startsWith('seed-')) this.outbox.add(e.id);
    this.rebuild({ serverUrl: clean, online: 0, server: 'online' });
    void this.sync();
    return { ok: true };
  }

  /** Demo switch: the Directorate cuts the network. */
  setShutdown(on: boolean) {
    this.rebuild({ shutdown: on, server: on ? 'cut' : this.snap.server });
    if (!on) void this.sync();
  }

  async reset() {
    // A local or desktop server allows a full reset. A shared hosted server refuses, so only this device is cleared.
    try { await fetch(apiUrl('/api/reset'), { method: 'POST' }); } catch { /* offline */ }
    this.events.clear(); this.outbox.clear();
    this.serverSeq = 0;
    await clearEvents();
    const seed = makeSeed(Date.now());
    this.ingest(seed);
    this.rebuild();
    void this.sync();
  }

  // ---- peer-to-peer mesh (BroadcastChannel simulates nearby devices) --------
  private setupMesh() {
    if (typeof BroadcastChannel === 'undefined') return;
    this.channel = new BroadcastChannel('undergrid-mesh');
    this.channel.onmessage = (msg: MessageEvent) => {
      const m = msg.data as { type: string; from: string; events?: unknown[] };
      if (!m || m.from === this.snap.deviceId) return;
      this.peerSeen.set(m.from, Date.now());
      if (m.type === 'hello') {
        // Newcomer: share everything we have so a device that was offline catches up.
        this.channel?.postMessage({ type: 'events', from: this.snap.deviceId, events: [...this.events.values()] });
        this.snap = { ...this.snap, mesh: { ...this.snap.mesh, sent: this.snap.mesh.sent + this.events.size } };
      } else if (m.type === 'events' && Array.isArray(m.events)) {
        const fresh = this.ingest(m.events);
        // Events heard from peers still need to reach the server later.
        for (const e of fresh) this.outbox.add(e.id);
        this.rebuild({ mesh: { ...this.snap.mesh, received: this.snap.mesh.received + fresh.length } });
        if (fresh.length) void this.sync();
      }
      this.rebuild();
    };
    this.channel.postMessage({ type: 'hello', from: this.snap.deviceId });
    setInterval(() => this.channel?.postMessage({ type: 'ping', from: this.snap.deviceId }), 5000);
  }

  private broadcast(events: UgEvent[]) {
    if (!this.channel) return;
    this.channel.postMessage({ type: 'events', from: this.snap.deviceId, events });
    this.snap = { ...this.snap, mesh: { ...this.snap.mesh, sent: this.snap.mesh.sent + events.length } };
  }

  destroy() { if (this.timer) clearInterval(this.timer); if (this.poll) clearInterval(this.poll); this.channel?.close(); }
}

export const store = new Store();
