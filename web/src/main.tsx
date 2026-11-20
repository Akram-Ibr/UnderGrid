import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './styles.css';
import App from './App';

try {
  document.documentElement.dataset.theme = localStorage.getItem('undergrid.theme') === 'light' ? 'light' : 'dim';
} catch {
  document.documentElement.dataset.theme = 'dim';
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

// Offline shell: register the service worker, then ask it to cache everything this page loaded.
if ('serviceWorker' in navigator && import.meta.env.PROD && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready).then((reg) => {
      const urls = performance.getEntriesByType('resource').map((e) => e.name).filter((u) => u.startsWith(location.origin) && !u.includes('/api/'));
      reg.active?.postMessage({ type: 'CACHE_URLS', urls: [location.href, ...urls] });
    }).catch(() => { /* offline shell is optional */ });
  });
}
