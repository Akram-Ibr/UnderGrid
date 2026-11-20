// Which shared server this device syncs with. Empty means "the server that served this page",
// which is right for the hosted web app. The desktop app passes its server in the first URL.
const KEY = 'undergrid.server';
declare const __SINGLE_FILE__: boolean | undefined;
/** Set at build time (VITE_DEFAULT_SERVER) so the double-click file already points at your shared server. */
const DEFAULT_SERVER: string = (import.meta.env.VITE_DEFAULT_SERVER as string | undefined) ?? '';
export const isSingleFile = typeof __SINGLE_FILE__ !== 'undefined' && __SINGLE_FILE__;

/** Turns what a person typed into a clean server address, '' for "this computer", or null if it is not usable. */
export function normalizeServer(raw: string): string | null {
  const t = raw.trim();
  if (!t) return '';
  const hasScheme = /^https?:\/\//i.test(t);
  const looksLocal = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(t);
  try {
    const u = new URL(hasScheme ? t : `${looksLocal ? 'http' : 'https'}://${t}`);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!u.hostname) return null;
    return u.origin;
  } catch {
    return null;
  }
}

export function getServer(): string {
  try { return localStorage.getItem(KEY) ?? DEFAULT_SERVER; } catch { return DEFAULT_SERVER; }
}

export function saveServer(url: string) {
  try { if (url) localStorage.setItem(KEY, url); else localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

export const apiUrl = (path: string) => `${getServer()}${path}`;

export function serverLabel(url: string): string {
  if (!url) return 'this computer';
  try { return new URL(url).host; } catch { return url; }
}

/** The desktop app opens us with ?server=...; remember it once, then tidy the address bar. */
function initFromQuery() {
  try {
    const p = new URLSearchParams(location.search);
    const wanted = p.get('server');
    if (wanted === null) return;
    const clean = normalizeServer(wanted);
    if (clean && !getServer()) saveServer(clean);
    p.delete('server');
    const qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : '') + location.hash);
  } catch { /* not in a browser */ }
}
initFromQuery();
