import { useState } from 'react';
import type { Snapshot, Store } from '../store/store';
import { serverLabel } from '../store/config';
import { ago } from '../labels';
import { PageHead } from './PageHead';

export function Network({ snap, store }: { snap: Snapshot; store: Store }) {
  const cut = snap.shutdown;
  const [draft, setDraft] = useState(snap.serverUrl);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const state = cut ? 'The Directorate has cut the network' : snap.server === 'online' ? 'Connected' : 'Server unreachable';
  const where = serverLabel(snap.serverUrl);

  const save = (value: string) => {
    const r = store.setServerUrl(value);
    if (r.ok) {
      setDraft(value.trim() ? value : '');
      setMsg({ ok: true, text: value.trim() ? 'Saved. Syncing with the new server now.' : 'Using the server this app was loaded from.' });
    } else setMsg({ ok: false, text: r.error ?? 'Could not save that address.' });
  };

  return (
    <div className="narrow">
      <PageHead title="Network" lead={cut || snap.server !== 'online' ? 'UnderGrid keeps working. Reports are saved on this device and shared with nearby devices.' : 'Reports are saved on this device first, then shared through the server and with nearby devices.'} />
      <section className="card" style={{ ['--tc' as string]: cut ? 'var(--danger)' : snap.server === 'online' ? 'var(--food)' : 'var(--power)' }}>
        <h3>{state}</h3>
        <p className="muted">
          {cut ? 'Server link is cut.' : snap.server === 'online'
            ? `Syncing with ${where}. ${snap.online} ${snap.online === 1 ? 'device' : 'devices'} on this server.`
            : `Cannot reach ${where}. Reports are kept here and sent when it is back.`}
          {' '}{snap.outbox > 0 ? `${snap.outbox} waiting to send.` : 'Everything is sent.'}
        </p>
        <div className="actions wrap">
          <button type="button" className={`btn ${cut ? 'primary' : 'secondary'}`} onClick={() => store.setShutdown(!cut)}>
            {cut ? 'Restore the network' : 'Simulate Directorate shutdown'}
          </button>
          <button type="button" className="btn quiet" onClick={() => void store.sync()}>Sync now</button>
        </div>
      </section>

      <section className="card">
        <h3>Shared server</h3>
        <p className="muted">Everyone who uses the same server sees the same reports within a few seconds. Leave it empty to use the server this app was loaded from.</p>
        <form className="server-form" onSubmit={(e) => { e.preventDefault(); save(draft); }}>
          <label className="field">Server address
            <input type="text" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="https://undergrid.onrender.com" value={draft} onChange={(e) => setDraft(e.target.value)} />
          </label>
          <div className="actions wrap">
            <button type="submit" className="btn primary">Save address</button>
            {snap.serverUrl && <button type="button" className="btn quiet" onClick={() => save('')}>Use the default</button>}
          </div>
        </form>
        {msg && <p className={msg.ok ? 'muted' : 'warn-text'} role="status">{msg.text}</p>}
      </section>

      <details className="more">
        <summary>Try peer sync with two windows</summary>
        <ol className="steps">
          <li>Open a second window. In the desktop app use File, New resident window. In a browser, open a second tab.</li>
          <li>Simulate the shutdown in both windows.</li>
          <li>Add a report in one window. It appears in the other without any server.</li>
          <li>Restore the network. Both windows send what they hold to the server.</li>
        </ol>
        <p className="muted">Windows on one computer stand in for phones near each other. A real deployment would use Bluetooth or local Wi-Fi.</p>
      </details>

      <details className="more">
        <summary>Technical details and demo data</summary>
        <dl className="stats">
          <div><dt>Nearby devices</dt><dd>{snap.peers}</dd></div>
          <div><dt>Sent to peers</dt><dd>{snap.mesh.sent}</dd></div>
          <div><dt>Received from peers</dt><dd>{snap.mesh.received}</dd></div>
          <div><dt>Last server sync</dt><dd className="small">{snap.lastSync ? ago(snap.lastSync, snap.now) : 'Never'}</dd></div>
          <div><dt>This device</dt><dd className="small">{snap.deviceId}</dd></div>
        </dl>
        <p className="muted">All reports and figures are simulated. Reset restores the starting scenario on this device. On a local server it also clears the server. A shared hosted server cannot be reset from the app.</p>
        <button type="button" className="btn quiet" onClick={() => void store.reset()}>Reset demo data</button>
      </details>
    </div>
  );
}
