import { useState } from 'react';
import { EDGES, NODES, LEVELS, targetLabel } from '../data/graph';
import { RESOURCES, RESOURCE_LABEL } from '../engine/allocation';
import type { ReportType, Resource } from '../engine/types';
import { REPORT_TYPES, SEVERITY_LABEL, TYPE_META } from '../labels';
import { Icon } from './Icon';
import { PageHead } from './PageHead';
import type { Store } from '../store/store';

export interface Draft { type?: ReportType; target?: string; resource?: Resource }

interface Props {
  store: Store;
  draft: Draft | null;
  online: boolean;
  onDone: (reportId: string) => void;
}

export function ReportForm({ store, draft, online, onDone }: Props) {
  const [type, setType] = useState<ReportType>(draft?.type ?? 'flood');
  const [target, setTarget] = useState(draft?.target ?? 'node:032');
  const [severity, setSeverity] = useState<1 | 2 | 3>(2);
  const [temp, setTemp] = useState(38);
  const [hours, setHours] = useState(4);
  const [qty, setQty] = useState(100);
  const [days, setDays] = useState(2);
  const [resource, setResource] = useState<Resource>(draft?.resource ?? 'water');
  const [sent, setSent] = useState<string | null>(null);

  const submit = () => {
    const [kind, id] = target.split(':') as ['node' | 'edge', string];
    const value = type === 'overheat' ? temp : type === 'no_power' ? hours : type === 'supplies' ? qty : type === 'low' ? days : undefined;
    const res = type === 'supplies' || type === 'low' ? resource : undefined;
    const r = store.addReport({ type, target: { kind, id }, severity, value, resource: res });
    setSent(r.id);
  };

  if (sent) {
    return (
      <div className="narrow">
        <section className="card done-card" aria-live="polite" style={{ ['--tc' as string]: 'var(--food)' }}>
          <h2>Reported</h2>
          <p>{online ? 'Your report is saved and sent.' : 'Your report is saved on this device. Nearby devices already have it, and the server gets it when a link returns.'}</p>
          <p className="muted">It goes public once 3 different residents confirm it. Until then it shows as a dashed marker.</p>
          <div className="actions wrap">
            <button type="button" className="btn primary" onClick={() => onDone(sent)}>See it on the map</button>
            <button type="button" className="btn quiet" onClick={() => setSent(null)}>Add another</button>
          </div>
        </section>
      </div>
    );
  }

  const meta = TYPE_META[type];
  return (
    <div className="narrow">
      <PageHead title="Report what you see" lead="Takes a few seconds. No name, no account." />
      <form className="form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <section className="card" style={{ ['--tc' as string]: meta.color }}>
          <h3>What is happening</h3>
          <div className="type-grid" role="radiogroup" aria-label="Report type">
            {REPORT_TYPES.map((t) => (
              <button key={t} type="button" role="radio" aria-checked={type === t} className={`type-btn ${type === t ? 'on' : ''}`} style={{ ['--tc' as string]: TYPE_META[t].color }} onClick={() => setType(t)}>
                <span className="badge"><Icon type={t} size={22} /></span>
                <strong>{TYPE_META[t].label}</strong>
              </button>
            ))}
          </div>
          <p className="muted hint">{meta.hint}</p>
        </section>

        <section className="card">
          <h3>Where</h3>
          <select aria-label="Where" value={target} onChange={(e) => setTarget(e.target.value)}>
            {LEVELS.map((lv) => (
              <optgroup key={lv.id} label={`Level ${lv.id} ${lv.name}`}>
                {NODES.filter((n) => n.level === lv.id).map((n) => <option key={n.id} value={`node:${n.id}`}>{targetLabel('node', n.id)}</option>)}
                {EDGES.filter((e) => Math.max(NODES.find((n) => n.id === e.from)!.level, NODES.find((n) => n.id === e.to)!.level) === lv.id).map((e) => <option key={e.id} value={`edge:${e.id}`}>{targetLabel('edge', e.id)}</option>)}
              </optgroup>
            ))}
          </select>

          {type === 'overheat' && <label className="field">Temperature you can read (°C)<input type="number" min={20} max={70} value={temp} onChange={(e) => setTemp(Number(e.target.value))} /></label>}
          {type === 'no_power' && <label className="field">Hours without power<input type="number" min={0} max={72} value={hours} onChange={(e) => setHours(Number(e.target.value))} /></label>}
          {(type === 'supplies' || type === 'low') && (
            <div className="row2">
              <label className="field">Which resource
                <select value={resource} onChange={(e) => setResource(e.target.value as Resource)}>{RESOURCES.map((r) => <option key={r} value={r}>{RESOURCE_LABEL[r]}</option>)}</select>
              </label>
              {type === 'supplies'
                ? <label className="field">How much you can share<input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} /></label>
                : <label className="field">Days left<input type="number" min={0} max={30} value={days} onChange={(e) => setDays(Number(e.target.value))} /></label>}
            </div>
          )}
        </section>

        <section className="card">
          <h3>How bad is it</h3>
          <div className="seg" role="group" aria-label="Severity">
            {([1, 2, 3] as const).map((s) => (
              <button key={s} type="button" className={severity === s ? 'on' : ''} aria-pressed={severity === s} onClick={() => setSeverity(s)}>{SEVERITY_LABEL[s]}</button>
            ))}
          </div>
        </section>

        <button type="submit" className="btn primary big wide">Send report</button>
        <p className="muted center">This device gets a random ID, so no one can confirm their own report.</p>
      </form>
    </div>
  );
}
