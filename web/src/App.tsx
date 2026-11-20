import { useEffect, useMemo, useState } from 'react';
import { useUnderGrid } from './store/useStore';
import { computeAlerts } from './engine/alerts';
import { realNumbers } from './engine/realNumbers';
import { Home } from './components/Home';
import { MapView } from './components/MapView';
import { ReportForm, type Draft } from './components/ReportForm';
import { Resources } from './components/Resources';
import { FairShare } from './components/FairShare';
import { Alerts } from './components/Alerts';
import { RealNumbers } from './components/RealNumbers';
import { Network } from './components/Network';

type Tab = 'home' | 'map' | 'report' | 'supplies' | 'share' | 'alerts' | 'numbers' | 'network';
type Theme = 'dim' | 'light';

function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dim'));
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('undergrid.theme', theme); } catch { /* storage can be unavailable */ }
  }, [theme]);
  return [theme, setTheme];
}

export default function App() {
  const { snap, reports, zones, hazards, store } = useUnderGrid();
  const [tab, setTab] = useState<Tab>('home');
  const [draft, setDraft] = useState<{ d: Draft | null; n: number }>({ d: null, n: 0 });
  const [focus, setFocus] = useState<string | null>(null);
  const [theme, setTheme] = useTheme();

  const alerts = useMemo(() => computeAlerts(reports, zones), [reports, zones]);
  const real = useMemo(() => realNumbers(reports, zones), [reports, zones]);
  const urgent = alerts.filter((a) => a.severity === 'critical').length;

  const startReport = (d: Draft | null) => { setDraft((p) => ({ d, n: p.n + 1 })); setTab('report'); };
  const go = (t: 'map' | 'share' | 'report') => (t === 'report' ? startReport(null) : setTab(t));

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'home', label: 'Home' },
    { id: 'map', label: 'Map' },
    { id: 'supplies', label: 'Supplies' },
    { id: 'share', label: 'Fair share' },
    { id: 'alerts', label: 'Alerts', badge: urgent },
    { id: 'numbers', label: 'Real numbers' },
  ];

  const link = snap.shutdown ? { cls: 'cut', text: 'Network cut' } : snap.server === 'online' ? { cls: 'on', text: 'Online' } : { cls: 'off', text: 'Offline' };

  return (
    <div className="shell">
      <header className="top">
        <button type="button" className="brand" onClick={() => setTab('home')} aria-label="UnderGrid home">
          <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="var(--raised)" /><g stroke="var(--brand)" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".7"><path d="M12 20h40M12 34h40M12 48h40M22 12v40M44 12v40" /></g><circle cx="22" cy="34" r="6" fill="var(--power)" /><circle cx="44" cy="48" r="6" fill="var(--danger)" /><circle cx="44" cy="20" r="6" fill="var(--water)" /></svg>
          <span>UnderGrid</span>
        </button>

        <nav className="tabs" aria-label="Sections">
          {tabs.map((t) => (
            <button key={t.id} type="button" className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
              {t.label}{t.badge ? <b className="count" aria-label={`${t.badge} urgent`}>{t.badge}</b> : null}
            </button>
          ))}
        </nav>

        <div className="top-right">
          <button type="button" className={`status ${link.cls}`} onClick={() => setTab('network')} aria-label={`Network: ${link.text}. Open network settings`}>
            <i className="led" />{link.text}{snap.outbox > 0 ? `, ${snap.outbox} waiting` : ''}
          </button>
          <button type="button" className="btn primary" onClick={() => startReport(null)}>Report</button>
        </div>
      </header>

      <main className="main">
        {tab === 'home' && <Home reports={reports} zones={zones} closed={hazards.blocked.size} go={go} />}
        {tab === 'map' && <MapView snap={snap} reports={reports} hazards={hazards} store={store} focusReportId={focus} onReportHere={(t) => startReport({ target: t })} />}
        {tab === 'report' && <ReportForm key={draft.n} store={store} draft={draft.d} online={!snap.shutdown && snap.server === 'online'} onDone={(id) => { setFocus(id); setTab('map'); }} />}
        {tab === 'supplies' && <Resources snap={snap} reports={reports} hazards={hazards} store={store} onDraft={startReport} />}
        {tab === 'share' && <FairShare zones={zones} />}
        {tab === 'alerts' && <Alerts alerts={alerts} />}
        {tab === 'numbers' && <RealNumbers rows={real.rows} totals={real.totals} />}
        {tab === 'network' && <Network snap={snap} store={store} />}
      </main>

      <footer className="foot">
        <span>All data is simulated. Built for Patriot HackFest Fall 2026.</span>
        <span className="theme" role="group" aria-label="Theme">
          <button type="button" className={theme === 'dim' ? 'on' : ''} aria-pressed={theme === 'dim'} onClick={() => setTheme('dim')}>Dim</button>
          <button type="button" className={theme === 'light' ? 'on' : ''} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>Light</button>
        </span>
      </footer>
    </div>
  );
}
