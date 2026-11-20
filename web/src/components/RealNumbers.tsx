import { OFFICIAL, type RealRow } from '../engine/realNumbers';
import { PageHead } from './PageHead';

interface Props { rows: RealRow[]; totals: { outages: number; unsafeWater: number; tunnelHazards: number; verified: number } }

export function RealNumbers({ rows, totals }: Props) {
  const hottest = Math.max(0, ...rows.map((r) => r.residentTemp ?? 0));
  const items = [
    { name: 'Power outages', official: OFFICIAL.blackouts, real: totals.outages, c: 'var(--power)' },
    { name: 'Unsafe water sites', official: OFFICIAL.unsafeWater, real: totals.unsafeWater, c: 'var(--water)' },
    { name: 'Closed or flooded tunnels', official: OFFICIAL.floodedTunnels, real: totals.tunnelHazards, c: 'var(--danger)' },
    { name: 'Hottest level, °C', official: OFFICIAL.temp, real: hottest, c: 'var(--danger)' },
  ];
  return (
    <>
      <PageHead title="Real numbers" lead={`The Directorate's figures against what residents verified. ${totals.verified} reports confirmed so far.`} />
      <div className="compare">
        {items.map((i) => (
          <article key={i.name} className="card cmp" style={{ ['--tc' as string]: i.c }}>
            <h3>{i.name}</h3>
            <p className="off"><span>Directorate says</span><strong>{i.official}</strong></p>
            <p className="real"><span>Residents found</span><strong>{i.real}</strong></p>
          </article>
        ))}
      </div>
      <details className="more">
        <summary>See it level by level</summary>
        <div className="scroll">
          <table>
            <thead><tr><th>Level</th><th>Official temp</th><th>Resident temp</th><th>Outages</th><th>Unsafe water</th><th>Tunnel hazards</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.level}>
                  <th scope="row">{r.level} {r.name}</th>
                  <td>{r.officialTemp}°C</td>
                  <td className={r.residentTemp && r.residentTemp - r.officialTemp >= 8 ? 'hot' : ''}>{r.residentTemp === null ? 'No verified reading' : `${r.residentTemp}°C`}</td>
                  <td>{r.outages}</td><td>{r.unsafeWater}</td><td>{r.tunnelHazards}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="muted spaced">Only reports confirmed by 3 different residents count. Directorate figures are simulated for this demo.</p>
    </>
  );
}
