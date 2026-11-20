import { useState } from 'react';
import { LEVEL_BY_ID } from '../data/graph';
import type { Alert } from '../engine/alerts';
import { PageHead, plural } from './PageHead';

const LABEL = { critical: 'Act now', warning: 'Be ready', info: 'Possible' } as const;
const COLOR = { critical: 'var(--danger)', warning: 'var(--power)', info: 'var(--faint)' } as const;

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function AlertCard({ a }: { a: Alert }) {
  return (
    <article className={`card alert ${a.severity}`} style={{ ['--tc' as string]: COLOR[a.severity] }}>
      <header>
        <span className="tag" style={{ ['--c' as string]: COLOR[a.severity] }}>{LABEL[a.severity]}</span>
        <span className="muted">Level {a.level} {LEVEL_BY_ID.get(a.level)?.name}</span>
      </header>
      <h3>{cap(a.title.replace(/^Level \d+ [^:]+: /, ''))}</h3>
      <p>{a.message}</p>
      {a.etaHours !== undefined && <p className="eta">About {a.etaHours} h before power fails <span className="muted">(estimate)</span></p>}
      <details className="more tight">
        <summary>Why this alert</summary>
        <ul>{a.why.map((w) => <li key={w}>{w}</li>)}</ul>
      </details>
    </article>
  );
}

export function Alerts({ alerts }: { alerts: Alert[] }) {
  const [all, setAll] = useState(false);
  const urgent = alerts.filter((a) => a.severity === 'critical').length;
  const shown = all ? alerts : alerts.slice(0, 3);

  return (
    <>
      <PageHead title="Alerts" lead={urgent ? `${urgent} need action now.` : alerts.length ? 'Nothing urgent right now.' : 'No alerts.'} />
      {alerts.length === 0 && <p className="empty">Alerts appear when residents verify a hazard or a level's supply falls short.</p>}
      <div className="list wide">
        {shown.map((a) => <AlertCard key={a.id} a={a} />)}
      </div>
      {alerts.length > 3 && (
        <button type="button" className="btn secondary spaced" onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show ${plural(alerts.length - 3, 'more alert')}`}
        </button>
      )}
    </>
  );
}
