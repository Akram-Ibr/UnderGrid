import { EDGES, EDGE_BY_ID, NODE_BY_ID, NODES, edgeLength, incidentEdges } from '../data/graph';
import type { Report } from './types';

const HAZARDS = new Set(['flood', 'blocked']);

/** Segments closed by VERIFIED hazards, and segments with merely reported (unverified) hazards. */
export function hazardEdges(reports: Report[]): { blocked: Set<string>; pending: Set<string> } {
  const blocked = new Set<string>();
  const pending = new Set<string>();
  for (const r of reports) {
    if (!HAZARDS.has(r.type)) continue;
    const target = r.status === 'verified' ? blocked : r.status === 'unverified' ? pending : null;
    if (!target) continue;
    if (r.target.kind === 'edge') target.add(r.target.id);
    else for (const e of incidentEdges(r.target.id)) target.add(e.id);
  }
  return { blocked, pending };
}

export interface Route {
  nodes: string[];
  edges: string[];
  length: number;
}

/** Dijkstra. Blocked segments are skipped; unverified-hazard segments cost 1.6x so they are avoided when possible. */
export function shortestPath(from: string, to: string, blocked: Set<string>, pending: Set<string> = new Set()): Route | null {
  if (!NODE_BY_ID.has(from) || !NODE_BY_ID.has(to)) return null;
  const dist = new Map<string, number>(NODES.map((x) => [x.id, Infinity]));
  const prev = new Map<string, { node: string; edge: string }>();
  const done = new Set<string>();
  dist.set(from, 0);

  while (done.size < NODES.length) {
    let cur: string | null = null;
    let best = Infinity;
    for (const [id, d] of dist) if (!done.has(id) && d < best) { best = d; cur = id; }
    if (cur === null) break;
    done.add(cur);
    if (cur === to) break;
    for (const e of EDGES) {
      if (blocked.has(e.id)) continue;
      const other = e.from === cur ? e.to : e.to === cur ? e.from : null;
      if (!other || done.has(other)) continue;
      const w = edgeLength(e) * (pending.has(e.id) ? 1.6 : 1);
      if (best + w < dist.get(other)!) {
        dist.set(other, best + w);
        prev.set(other, { node: cur, edge: e.id });
      }
    }
  }

  if (!Number.isFinite(dist.get(to)!)) return null;
  const nodes = [to];
  const edges: string[] = [];
  let at = to;
  while (at !== from) {
    const p = prev.get(at)!;
    edges.unshift(p.edge);
    nodes.unshift(p.node);
    at = p.node;
  }
  const length = edges.reduce((s, id) => s + edgeLength(EDGE_BY_ID.get(id)!), 0);
  return { nodes, edges, length };
}

/** Rough walking time: 1 map unit ~ 1.8 m at 1.3 m/s. */
export const walkMinutes = (length: number) => Math.max(1, Math.round((length * 1.8) / 1.3 / 60));
