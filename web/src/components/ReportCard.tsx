import type { ReactNode } from 'react';
import { TYPE_META, ago, valueText } from '../labels';
import { targetLabel, LEVEL_BY_ID } from '../data/graph';
import type { Report } from '../engine/types';
import { Icon } from './Icon';
import type { Store } from '../store/store';

export function Meter({ have, need }: { have: number; need: number }) {
  return (
    <span className="meter" role="img" aria-label={`${have} of ${need} residents`}>
      {Array.from({ length: need }, (_, i) => <i key={i} className={i < have ? 'on' : ''} />)}
    </span>
  );
}

const STATUS_TEXT: Record<Report['status'], string> = {
  verified: 'Verified', unverified: 'Waiting', expired: 'Expired', dismissed: 'Dismissed',
};
const STATUS_COLOR: Record<Report['status'], string> = {
  verified: 'var(--food)', unverified: 'var(--power)', expired: 'var(--faint)', dismissed: 'var(--faint)',
};

interface Props {
  report: Report;
  deviceId: string;
  now: number;
  store: Store;
  selected?: boolean;
  onSelect?: () => void;
  extra?: ReactNode;
}

export function ReportCard({ report: r, deviceId, now, store, selected, onSelect, extra }: Props) {
  const meta = TYPE_META[r.type];
  const mine = r.deviceId === deviceId;
  const confirmed = r.confirmers.includes(deviceId) && !mine;
  const dismissed = r.dismissers.includes(deviceId);
  const lv = LEVEL_BY_ID.get(r.level);
  const vt = valueText(r);
  const open = r.status === 'unverified' || r.status === 'verified';
  const showActions = open && (r.status === 'unverified' || selected);

  return (
    <article className={`card rc ${r.status} ${selected ? 'selected' : ''}`} style={{ ['--tc' as string]: meta.color }}>
      <button type="button" className="rc-head" onClick={onSelect} disabled={!onSelect} aria-pressed={onSelect ? !!selected : undefined}>
        <span className="badge"><Icon type={r.type} /></span>
        <span className="rc-text">
          <strong>{meta.label}</strong>
          <span>{targetLabel(r.target.kind, r.target.id)}, level {r.level} {lv?.name}</span>
        </span>
        <span className="tag" style={{ ['--c' as string]: STATUS_COLOR[r.status] }}>{STATUS_TEXT[r.status]}</span>
      </button>
      {vt && <p className="rc-value">{vt}</p>}
      <div className="rc-meta">
        <Meter have={r.confirmers.length} need={r.needed} />
        <span>{r.confirmers.length} of {r.needed} confirmed, {ago(r.ts, now)}</span>
      </div>
      {extra}
      {showActions && (
        <div className="actions">
          {mine ? <span className="muted">You reported this</span> : (
            <>
              <button type="button" className={`btn small ${confirmed ? 'done' : 'primary'}`} onClick={() => store.addVote(r.id, 'confirm')} disabled={confirmed}>
                {confirmed ? 'You confirmed' : 'Confirm it'}
              </button>
              <button type="button" className={`btn small quiet ${dismissed ? 'done' : ''}`} onClick={() => store.addVote(r.id, 'dismiss')} disabled={dismissed}>
                {dismissed ? 'You said not there' : 'Not there'}
              </button>
            </>
          )}
        </div>
      )}
    </article>
  );
}
