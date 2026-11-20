import { useEffect, useMemo, useState } from 'react';
import { EDGES, LEVELS, NODES, NODE_BY_ID, EDGE_BY_ID, LEVEL_BY_ID, targetLabel } from '../data/graph';
import { shortestPath, walkMinutes } from '../engine/routing';
import type { Report } from '../engine/types';
import { TYPE_META } from '../labels';
import { iconPath } from './Icon';
import { PageHead, plural } from './PageHead';
import { ReportCard } from './ReportCard';
import type { Store, Snapshot } from '../store/store';

interface Props {
  snap: Snapshot;
  reports: Report[];
  hazards: { blocked: Set<string>; pending: Set<string> };
  store: Store;
  focusReportId: string | null;
  onReportHere: (target: string) => void;
}

const mid = (id: string) => {
  const e = EDGE_BY_ID.get(id)!;
  const a = NODE_BY_ID.get(e.from)!;
  const b = NODE_BY_ID.get(e.to)!;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
};

function markerPos(r: Report, slot: number) {
  const base = r.target.kind === 'node' ? NODE_BY_ID.get(r.target.id)! : mid(r.target.id);
  return { x: base.x + slot * 22, y: base.y - 26 - (slot % 2) * 4 };
}

export function MapView({ snap, reports, hazards, store, focusReportId, onReportHere }: Props) {
  const [level, setLevel] = useState<number | 'all'>('all');
  const [selReport, setSelReport] = useState<string | null>(focusReportId);
  const [selNode, setSelNode] = useState<string | null>(null);
  const [from, setFrom] = useState('026');
  const [to, setTo] = useState('040');

  useEffect(() => { if (focusReportId) setSelReport(focusReportId); }, [focusReportId]);

  const live = useMemo(() => reports.filter((r) => r.status === 'verified' || r.status === 'unverified'), [reports]);
  const route = useMemo(() => shortestPath(from, to, hazards.blocked, hazards.pending), [from, to, hazards]);
  const direct = useMemo(() => shortestPath(from, to, new Set()), [from, to]);

  const slots = new Map<string, number>();
  const placed = live.map((r) => {
    const key = `${r.target.kind}:${r.target.id}`;
    const slot = slots.get(key) ?? 0;
    slots.set(key, slot + 1);
    return { r, ...markerPos(r, slot) };
  });

  const detour = route && direct && route.length > direct.length + 1 ? walkMinutes(route.length) - walkMinutes(direct.length) : 0;
  const closedOnWay = direct ? direct.edges.filter((e) => hazards.blocked.has(e)) : [];
  const inLevel = (r: Report) => level === 'all' || r.level === level;
  const needs = live.filter((r) => r.status === 'unverified' && inLevel(r)).slice(0, 3);
  const verifiedList = live.filter((r) => r.status === 'verified' && inLevel(r));
  const sel = selReport ? reports.find((r) => r.id === selReport) : null;
  const waiting = live.filter((r) => r.status === 'unverified').length;

  return (
    <>
      <PageHead title="Map" lead={`${plural(hazards.blocked.size, 'tunnel')} closed, ${plural(waiting, 'report')} waiting for confirmation.`}>
        <label className="level-pick">Show
          <select value={level} onChange={(e) => setLevel(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
            <option value="all">All levels</option>
            {LEVELS.map((lv) => <option key={lv.id} value={lv.id}>Level {lv.id} {lv.name}</option>)}
          </select>
        </label>
      </PageHead>

      <div className="split">
        <section className="panel-main" aria-label="Tunnel map">
          <div className="map-wrap card flat">
            <svg viewBox="0 0 1040 660" className="map" role="img" aria-label="Map of the tunnels with reported hazards">
              {EDGES.map((e) => {
                const a = NODE_BY_ID.get(e.from)!;
                const b = NODE_BY_ID.get(e.to)!;
                const closed = hazards.blocked.has(e.id);
                const pending = hazards.pending.has(e.id);
                const m = mid(e.id);
                return (
                  <g key={e.id}>
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="tunnel" />
                    {pending && !closed && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="tunnel pending" />}
                    {closed && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="tunnel closed" />}
                    {closed && <text x={m.x} y={m.y + 5} textAnchor="middle" className="x-mark">{'×'}</text>}
                  </g>
                );
              })}
              {route && route.edges.map((id) => {
                const e = EDGE_BY_ID.get(id)!;
                const a = NODE_BY_ID.get(e.from)!;
                const b = NODE_BY_ID.get(e.to)!;
                return <line key={`route-${id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="tunnel route" />;
              })}
              {NODES.map((n) => {
                const lv = LEVEL_BY_ID.get(n.level)!;
                const dim = level !== 'all' && level !== n.level;
                const isEnd = n.id === from || n.id === to;
                return (
                  <g key={n.id} className={`node ${dim ? 'dim' : ''} ${selNode === n.id ? 'sel' : ''} ${isEnd ? 'end' : ''}`} transform={`translate(${n.x} ${n.y})`}
                    tabIndex={0} role="button" aria-label={`Junction ${n.id}, level ${n.level}`}
                    onClick={() => setSelNode(n.id)} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setSelNode(n.id); } }}>
                    <circle r="16" className="hit" />
                    <circle r={isEnd ? 10 : 7} stroke={lv.color} className="junction" />
                    <text y="26" textAnchor="middle">{n.id}</text>
                  </g>
                );
              })}
              {placed.map(({ r, x, y }) => {
                const meta = TYPE_META[r.type];
                const dim = level !== 'all' && level !== r.level;
                const verified = r.status === 'verified';
                return (
                  <g key={r.id} transform={`translate(${x} ${y})`} className={`marker ${verified ? 'verified' : 'unverified'} ${dim ? 'dim' : ''} ${selReport === r.id ? 'sel' : ''}`}
                    style={{ ['--tc' as string]: meta.color }} tabIndex={0} role="button"
                    aria-label={`${meta.label}, ${verified ? 'verified' : 'waiting for confirmation'}, ${targetLabel(r.target.kind, r.target.id)}`}
                    onClick={() => setSelReport(r.id)} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setSelReport(r.id); } }}>
                    <circle r="14" />
                    <g transform="translate(-9 -9) scale(0.75)"><path d={iconPath(r.type)} fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></g>
                  </g>
                );
              })}
            </svg>
          </div>
          <details className="more key">
            <summary>Map key</summary>
            <ul className="legend" aria-label="Map key">
              <li><svg width="34" height="12"><line x1="2" y1="6" x2="32" y2="6" className="tunnel" /></svg>Open tunnel</li>
              <li><svg width="34" height="12"><line x1="2" y1="6" x2="32" y2="6" className="tunnel closed static" /></svg>Closed, verified</li>
              <li><svg width="34" height="12"><line x1="2" y1="6" x2="32" y2="6" className="tunnel pending" /></svg>Reported, not verified</li>
              <li><svg width="34" height="12"><line x1="2" y1="6" x2="32" y2="6" className="tunnel route" /></svg>Safe route</li>
              <li><span className="swatch solid" />Solid marker: verified</li>
              <li><span className="swatch dashed" />Dashed marker: waiting</li>
            </ul>
          </details>
        </section>

        <aside className="panel-side" aria-label="Route and reports">
          {sel ? (
            <section>
              <h3 className="side-h">Selected report</h3>
              <ReportCard report={sel} deviceId={snap.deviceId} now={snap.now} store={store} selected />
              <button type="button" className="btn quiet" onClick={() => setSelReport(null)}>Back to the list</button>
            </section>
          ) : (
            <section>
              <h3 className="side-h">Can you confirm these?</h3>
              {needs.length === 0 && <p className="empty">Nothing is waiting for confirmation{level === 'all' ? '' : ` on level ${level}`}.</p>}
              <div className="list">
                {needs.map((r) => <ReportCard key={r.id} report={r} deviceId={snap.deviceId} now={snap.now} store={store} onSelect={() => setSelReport(r.id)} />)}
              </div>
            </section>
          )}

          <section className="card route-card">
            <h3>Safe route</h3>
            <div className="route-pick">
              <select aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)}>{NODES.map((n) => <option key={n.id} value={n.id}>From {n.id}, level {n.level}</option>)}</select>
              <select aria-label="To" value={to} onChange={(e) => setTo(e.target.value)}>{NODES.map((n) => <option key={n.id} value={n.id}>To {n.id}, level {n.level}</option>)}</select>
            </div>
            {from === to ? <p className="muted">Pick two different junctions.</p> : route ? (
              <p className="route-sum">
                <strong>About {walkMinutes(route.length)} min on foot.</strong>
                {closedOnWay.length > 0 && <> Avoids {plural(closedOnWay.length, 'closed tunnel')}{detour > 0 ? `, adding ${detour} min` : ''}.</>}
              </p>
            ) : <p className="warn-text">No safe route. Every way is closed by a verified hazard.</p>}
          </section>

          {selNode && (
            <section className="card">
              <h3>Junction {selNode}</h3>
              <p className="muted">Level {NODE_BY_ID.get(selNode)!.level} {LEVEL_BY_ID.get(NODE_BY_ID.get(selNode)!.level)!.name}</p>
              <div className="actions wrap">
                <button type="button" className="btn small secondary" onClick={() => setFrom(selNode)}>Route from here</button>
                <button type="button" className="btn small secondary" onClick={() => setTo(selNode)}>Route to here</button>
                <button type="button" className="btn small primary" onClick={() => onReportHere(`node:${selNode}`)}>Report here</button>
              </div>
            </section>
          )}

          {verifiedList.length > 0 && !sel && (
            <details className="more">
              <summary>Verified reports ({verifiedList.length})</summary>
              <div className="list">
                {verifiedList.map((r) => <ReportCard key={r.id} report={r} deviceId={snap.deviceId} now={snap.now} store={store} onSelect={() => setSelReport(r.id)} />)}
              </div>
            </details>
          )}
        </aside>
      </div>
    </>
  );
}
