import { allocate, groupCoverage, type ZoneState } from '../engine/allocation';
import type { Report } from '../engine/types';
import { pct } from '../labels';
import { plural } from './PageHead';

interface Props {
  reports: Report[];
  zones: ZoneState[];
  closed: number;
  go: (tab: 'map' | 'share' | 'report') => void;
}

export function Home({ reports, zones, closed, go }: Props) {
  const verified = reports.filter((r) => r.status === 'verified').length;
  const waiting = reports.filter((r) => r.status === 'unverified').length;
  const rows = allocate('power', zones);
  const was = groupCoverage(rows, [4, 5, 6], 'directorate');
  const now = groupCoverage(rows, [4, 5, 6], 'fair');

  return (
    <div className="home">
      <section className="hero">
        <h2>What is really happening underground, shared fairly.</h2>
        <p className="lead">
          Residents report what they see. A report counts once three neighbors confirm it. Those real numbers decide who gets power, water and food, deepest levels first, even when the network is cut.
        </p>
        <div className="cta">
          <button type="button" className="btn primary big" onClick={() => go('map')}>See the map</button>
          <button type="button" className="btn secondary big" onClick={() => go('report')}>Report what you see</button>
        </div>
      </section>

      <section className="stat-row" aria-label="Right now">
        <article className="card stat" style={{ ['--tc' as string]: 'var(--food)' }}>
          <span className="tag" style={{ ['--c' as string]: 'var(--food)' }}>Verified by residents</span>
          <p className="big-num">{verified}</p>
          <p className="muted">{plural(closed, 'tunnel')} closed because of them</p>
        </article>
        <article className="card stat" style={{ ['--tc' as string]: 'var(--power)' }}>
          <span className="tag" style={{ ['--c' as string]: 'var(--power)' }}>Waiting for you</span>
          <p className="big-num">{waiting}</p>
          <p className="muted">Reports that need a third neighbor to confirm</p>
          <button type="button" className="btn quiet" onClick={() => go('map')}>Review them</button>
        </article>
        <article className="card stat" style={{ ['--tc' as string]: 'var(--danger)' }}>
          <span className="tag" style={{ ['--c' as string]: 'var(--danger)' }}>Deep levels, power</span>
          <p className="big-num"><span className="was">{pct(was)}</span> <span className="to-word">to</span> {pct(now)}</p>
          <p className="muted">of need met, Directorate rule against UnderGrid</p>
          <button type="button" className="btn quiet" onClick={() => go('share')}>See who gets what</button>
        </article>
      </section>

      <section className="how" aria-label="How it works">
        <article><h3>Residents report</h3><p>Flooding, outages, bad water, heat, spare supplies. No name, no account.</p></article>
        <article><h3>Neighbors confirm</h3><p>Nothing goes public until three different people agree. Old reports expire.</p></article>
        <article><h3>Everyone gets a fairer share</h3><p>Verified numbers steer supplies, warnings and safe routes. It all keeps working offline.</p></article>
      </section>
    </div>
  );
}
