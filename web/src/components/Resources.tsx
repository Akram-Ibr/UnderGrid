import { useMemo, useState } from 'react';
import { NODES, EDGE_BY_ID } from '../data/graph';
import { RESOURCES, RESOURCE_LABEL } from '../engine/allocation';
import { shortestPath, walkMinutes } from '../engine/routing';
import type { Report, Resource } from '../engine/types';
import { RESOURCE_COLOR } from '../labels';
import { PageHead, plural } from './PageHead';
import { ReportCard } from './ReportCard';
import type { Snapshot, Store } from '../store/store';
import type { Draft } from './ReportForm';

interface Props {
  snap: Snapshot;
  reports: Report[];
  hazards: { blocked: Set<string>; pending: Set<string> };
  store: Store;
  onDraft: (d: Draft) => void;
}

const anchor = (r: Report) => (r.target.kind === 'node' ? r.target.id : EDGE_BY_ID.get(r.target.id)!.from);

export function Resources({ snap, reports, hazards, store, onDraft }: Props) {
  const [at, setAt] = useState('040');
  const [res, setRes] = useState<Resource | 'all'>('all');

  const supplies = useMemo(() => {
    return reports
      .filter((r) => r.type === 'supplies' && (r.status === 'verified' || r.status === 'unverified') && (res === 'all' || r.resource === res))
      .map((r) => {
        const route = shortestPath(at, anchor(r), hazards.blocked, hazards.pending);
        return { r, minutes: route ? walkMinutes(route.length) : null };
      })
      .sort((a, b) => (a.minutes ?? 1e9) - (b.minutes ?? 1e9));
  }, [reports, at, res, hazards]);

  const low = reports
    .filter((r) => r.type === 'low' && (r.status === 'verified' || r.status === 'unverified') && (res === 'all' || r.resource === res))
    .sort((a, b) => (a.value ?? 99) - (b.value ?? 99));

  return (
    <>
      <PageHead title="Supplies" lead={`${plural(supplies.length, 'place')} sharing supplies, ${plural(low.length, 'neighborhood')} running low.`}>
        <div className="actions wrap">
          <button type="button" className="btn primary" onClick={() => onDraft({ type: 'supplies', target: `node:${at}` })}>Share supplies</button>
          <button type="button" className="btn secondary" onClick={() => onDraft({ type: 'low', target: `node:${at}` })}>Report running low</button>
        </div>
      </PageHead>

      <section className="filters">
        <label className="level-pick">I am at
          <select value={at} onChange={(e) => setAt(e.target.value)}>{NODES.map((n) => <option key={n.id} value={n.id}>Junction {n.id}, level {n.level}</option>)}</select>
        </label>
        <div className="seg" role="group" aria-label="Resource">
          <button type="button" className={res === 'all' ? 'on' : ''} onClick={() => setRes('all')}>All</button>
          {RESOURCES.map((x) => (
            <button key={x} type="button" className={res === x ? 'on' : ''} style={{ ['--sc' as string]: RESOURCE_COLOR[x] }} onClick={() => setRes(x)}>{RESOURCE_LABEL[x]}</button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="side-h">Near you</h3>
        {supplies.length === 0 && <p className="empty">No one has shared supplies yet. Share yours so neighbors can find it.</p>}
        <div className="grid">
          {supplies.map(({ r, minutes }) => (
            <ReportCard key={r.id} report={r} deviceId={snap.deviceId} now={snap.now} store={store}
              extra={<p className="eta">{minutes === null ? 'No safe route from where you are' : `About ${minutes} min on foot`}</p>} />
          ))}
        </div>
      </section>

      {low.length > 0 && (
        <section>
          <h3 className="side-h">Running low</h3>
          <div className="grid">
            {low.map((r) => <ReportCard key={r.id} report={r} deviceId={snap.deviceId} now={snap.now} store={store} />)}
          </div>
        </section>
      )}
    </>
  );
}
