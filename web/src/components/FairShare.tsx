import { useMemo, useState } from 'react';
import { LEVEL_BY_ID } from '../data/graph';
import { RESOURCES, RESOURCE_LABEL, UNITS, allocate, groupCoverage, totalSupply, DEFAULT_SUPPLY, type ZoneState } from '../engine/allocation';
import type { Resource } from '../engine/types';
import { RESOURCE_COLOR, pct } from '../labels';
import { PageHead } from './PageHead';

export function FairShare({ zones }: { zones: ZoneState[] }) {
  const [res, setRes] = useState<Resource>('power');
  const [ratio, setRatio] = useState(DEFAULT_SUPPLY);
  const [open, setOpen] = useState<number | null>(6);

  const rows = useMemo(() => allocate(res, zones, ratio), [res, zones, ratio]);
  const supply = totalSupply(res, ratio);
  const dDir = groupCoverage(rows, [4, 5, 6], 'directorate');
  const dFair = groupCoverage(rows, [4, 5, 6], 'fair');
  const uDir = groupCoverage(rows, [1, 2, 3], 'directorate');
  const uFair = groupCoverage(rows, [1, 2, 3], 'fair');

  return (
    <div style={{ ['--rc' as string]: RESOURCE_COLOR[res] }}>
      <PageHead title="Fair share" lead={`When there is not enough ${RESOURCE_LABEL[res].toLowerCase()}, who gets it? Compare the Directorate rule with UnderGrid.`}>
        <div className="seg" role="group" aria-label="Resource">
          {RESOURCES.map((x) => (
            <button key={x} type="button" className={res === x ? 'on' : ''} aria-pressed={res === x} style={{ ['--sc' as string]: RESOURCE_COLOR[x] }} onClick={() => setRes(x)}>{RESOURCE_LABEL[x]}</button>
          ))}
        </div>
      </PageHead>

      <section className="duo">
        <article className="card stat" style={{ ['--tc' as string]: 'var(--danger)' }}>
          <span className="tag" style={{ ['--c' as string]: 'var(--danger)' }}>Deep levels 4 to 6</span>
          <p className="big-num"><span className="was">{pct(dDir)}</span> <span className="to-word">to</span> {pct(dFair)}</p>
          <p className="muted">of their need met</p>
        </article>
        <article className="card stat" style={{ ['--tc' as string]: 'var(--water)' }}>
          <span className="tag" style={{ ['--c' as string]: 'var(--water)' }}>Upper levels 1 to 3</span>
          <p className="big-num"><span className="was">{pct(uDir)}</span> <span className="to-word">to</span> {pct(uFair)}</p>
          <p className="muted">of their need met</p>
        </article>
      </section>

      <section className="card strata" aria-label="Cross-section of the Hollow">
        <p className="muted key-line">Bar: what UnderGrid gives. Tick: what the Directorate rule gives. Tap a level for the reason.</p>
        <p className="edge-label">Surface</p>
        <ul className="levels">
          {rows.map((r) => {
            const lv = LEVEL_BY_ID.get(r.level)!;
            const isOpen = open === r.level;
            return (
              <li key={r.level} className={`lvrow ${isOpen ? 'open' : ''}`} style={{ ['--lc' as string]: lv.color }}>
                <button type="button" className="lv-btn" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.level)}>
                  <span className="lv-name"><i className="dot" /><b>Level {r.level}</b> {r.name}{r.priority === 1 && <span className="tag first" style={{ ['--c' as string]: 'var(--danger)' }}>First in line</span>}</span>
                  <span className="track" role="img" aria-label={`UnderGrid ${pct(r.coverageFair)}, Directorate rule ${pct(r.coverageDirectorate)}`}>
                    <span className="fill" style={{ width: `${Math.min(100, r.coverageFair * 100)}%` }} />
                    <span className="tick" style={{ left: `${Math.min(100, r.coverageDirectorate * 100)}%` }} />
                  </span>
                  <span className="lv-vals"><span className="was">{pct(r.coverageDirectorate)}</span><span className="now">{pct(r.coverageFair)}</span></span>
                </button>
                {isOpen && (
                  <div className="lv-why">
                    <p>{r.reason}</p>
                    <p className="muted">{Math.round(r.directorate)} to {Math.round(r.fair)} {UNITS[res]} of {Math.round(r.demand)} needed</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="edge-label">Deepest level</p>
      </section>

      <details className="more">
        <summary>Change how much {RESOURCE_LABEL[res].toLowerCase()} there is</summary>
        <label className="slider">
          Supply is {pct(ratio[res])} of normal demand ({Math.round(supply)} {UNITS[res]})
          <input type="range" min={30} max={100} value={Math.round(ratio[res] * 100)} onChange={(e) => setRatio({ ...ratio, [res]: Number(e.target.value) / 100 })} />
        </label>
        <p className="muted">Directorate rule: upper levels are served in full first. UnderGrid rule: every level keeps a floor of its need, and the rest goes by need using only conditions verified by residents.</p>
      </details>
    </div>
  );
}
