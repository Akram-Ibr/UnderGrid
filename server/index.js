// UnderGrid shared server. Deliberately thin: the engine runs on every device, so the server only
// stores the append-only event log, dedupes by id, and hands every device what it has not seen yet.
//
//   npm start            local, this computer only
//   npm run start:lan    anyone on the same Wi-Fi can connect (prints the address)
//   hosted (PORT set)    listens publicly, e.g. on Render or Railway
//
// The desktop app also calls start() to serve its bundled web app and as a local fallback server.
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAX_EVENTS = 20000;
const MAX_PER_REQUEST = 200;
const ONLINE_WINDOW_MS = 20_000;
const RATE_PER_MIN = 300; // per IP; a polling device uses about 20
const REPORT_TYPES = new Set(['flood', 'blocked', 'no_power', 'bad_water', 'overheat', 'supplies', 'low']);

const valid = (e) =>
  e && typeof e.id === 'string' && e.id.length < 80 && typeof e.deviceId === 'string' && e.deviceId.length < 80 &&
  Number.isFinite(e.ts) &&
  ((e.kind === 'report' && REPORT_TYPES.has(e.type) && e.target && typeof e.target.id === 'string' && e.target.id.length < 40) ||
    (e.kind === 'vote' && typeof e.reportId === 'string' && e.reportId.length < 80 && (e.vote === 'confirm' || e.vote === 'dismiss')));

/**
 * @param {{ port?: number, host?: string, dataFile?: string, dist?: string, allowReset?: boolean }} [opts]
 * @returns {Promise<{ port: number, host: string, hasApp: boolean, close: () => Promise<void> }>}
 */
export function start(opts = {}) {
  const host = opts.host ?? '127.0.0.1';
  const dataFile = opts.dataFile ?? path.join(__dirname, 'data.json');
  const dist = opts.dist ?? path.join(__dirname, '..', 'web', 'dist');
  const allowReset = opts.allowReset ?? host === '127.0.0.1';

  /** Ordered log. A device's cursor is simply how many entries it has already received. */
  /** @type {any[]} */
  let log = [];
  const ids = new Set();
  try {
    for (const e of JSON.parse(fs.readFileSync(dataFile, 'utf8'))) {
      if (valid(e) && !ids.has(e.id)) { ids.add(e.id); log.push(e); }
    }
  } catch { /* first run */ }

  let dirty = false;
  const flush = () => {
    if (!dirty) return;
    dirty = false;
    try { fs.mkdirSync(path.dirname(dataFile), { recursive: true }); fs.writeFileSync(dataFile, JSON.stringify(log)); } catch { /* best effort */ }
  };
  const timer = setInterval(flush, 2000);
  timer.unref();

  /** @type {Map<string, number>} */
  const seen = new Map();
  const onlineCount = () => {
    const cutoff = Date.now() - ONLINE_WINDOW_MS;
    for (const [id, t] of seen) if (t < cutoff) seen.delete(id);
    return seen.size;
  };

  /** @type {Map<string, { n: number, reset: number }>} */
  const hits = new Map();
  const limiter = (req, res, next) => {
    const now = Date.now();
    const key = req.ip ?? 'unknown';
    let h = hits.get(key);
    if (!h || now > h.reset) { h = { n: 0, reset: now + 60_000 }; hits.set(key, h); }
    h.n++;
    if (h.n > RATE_PER_MIN) return res.status(429).json({ error: 'Too many requests. Slow down.' });
    next();
  };
  setInterval(() => { const now = Date.now(); for (const [k, h] of hits) if (now > h.reset) hits.delete(k); }, 60_000).unref();

  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  // Anonymous demo data, so any origin may talk to the API. This lets the desktop app and other sites sync here.
  app.use('/api', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use('/api', limiter);
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, events: log.length, online: onlineCount() }));

  app.post('/api/sync', (req, res) => {
    const body = req.body ?? {};
    const incoming = Array.isArray(body.events) ? body.events.slice(0, MAX_PER_REQUEST) : [];
    let accepted = 0;
    for (const e of incoming) {
      if (log.length >= MAX_EVENTS) break;
      if (valid(e) && !ids.has(e.id)) { ids.add(e.id); log.push(e); accepted++; }
    }
    if (accepted) dirty = true;
    if (typeof body.deviceId === 'string' && body.deviceId.length < 80) seen.set(body.deviceId, Date.now());
    const since = Number.isInteger(body.since) && body.since >= 0 && body.since <= log.length ? body.since : 0;
    res.json({ events: log.slice(since), seq: log.length, accepted, online: onlineCount() });
  });

  app.post('/api/reset', (_req, res) => {
    if (!allowReset) return res.status(403).json({ error: 'Reset is disabled on this server.' });
    log = []; ids.clear(); dirty = true; res.json({ ok: true });
  });

  const hasApp = fs.existsSync(dist);
  if (hasApp) {
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  return new Promise((resolve, reject) => {
    const bind = (port, retryOnBusy) => {
      const server = app.listen(port, host);
      server.once('listening', () => {
        resolve({
          port: server.address().port,
          host,
          hasApp,
          close: () => new Promise((r) => { clearInterval(timer); flush(); server.close(() => r()); }),
        });
      });
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE' && retryOnBusy) bind(0, false);
        else reject(err);
      });
    };
    bind(opts.port ?? 3001, Boolean(opts.port) && opts.port !== 0);
  });
}

function lanAddresses() {
  return Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const lan = process.argv.includes('--lan');
  const hosted = Boolean(process.env.PORT);
  const host = process.env.HOST ?? (lan || hosted ? '0.0.0.0' : '127.0.0.1');
  const { port, hasApp } = await start({
    port: Number(process.env.PORT ?? 3001),
    host,
    allowReset: process.env.ALLOW_RESET === '1' || host === '127.0.0.1',
    dataFile: process.env.DATA_FILE || undefined,
  });
  console.log(`UnderGrid server running${hasApp ? '' : ' (API only, run "npm run build" to serve the app)'}`);
  console.log(`  This computer:  http://localhost:${port}`);
  if (host === '0.0.0.0') {
    const addrs = lanAddresses();
    for (const a of addrs) console.log(`  Same network:   http://${a}:${port}`);
    if (!addrs.length && !hosted) console.log('  (No network address found. Connect to Wi-Fi to share.)');
  } else {
    console.log('  To let friends on the same Wi-Fi connect, run: npm run start:lan');
  }
}
