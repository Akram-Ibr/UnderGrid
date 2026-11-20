// UnderGrid desktop shell. Starts the sync server inside the app, then opens the UI in a native window.
// No browser, no terminal, no URL to remember. Data lives in the user's app-data folder.
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const PORT = 47321; // fixed so the app keeps the same origin, and therefore the same offline data, between launches
let server = null;
let baseUrl = '';
let windowCount = 0;

const fs = require('node:fs');
const appDir = path.join(__dirname, 'app'); // filled by prepare.mjs

// Which shared server to sync with. Order: env var, per-user config file, bundled config. Empty means local only.
function remoteServer() {
  if (process.env.UNDERGRID_SERVER) return process.env.UNDERGRID_SERVER;
  for (const f of [path.join(app.getPath('userData'), 'config.json'), path.join(__dirname, 'config.json')]) {
    try { const v = JSON.parse(fs.readFileSync(f, 'utf8')).serverUrl; if (v) return v; } catch { /* none */ }
  }
  return '';
}

async function startServer() {
  const mod = await import(pathToFileURL(path.join(appDir, 'server', 'index.js')).href);
  server = await mod.start({
    port: PORT,
    dataFile: path.join(app.getPath('userData'), 'events.json'),
    dist: path.join(appDir, 'web', 'dist'),
    host: '127.0.0.1',
    allowReset: true,
  });
  baseUrl = `http://127.0.0.1:${server.port}`;
}

function openWindow() {
  windowCount += 1;
  const n = windowCount;
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#14181c',
    title: n === 1 ? 'UnderGrid' : `UnderGrid (resident ${n})`,
    icon: path.join(appDir, 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(baseUrl)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.on('page-title-updated', (e) => e.preventDefault()); // keep our own window title
  const remote = remoteServer();
  win.loadURL(remote ? `${baseUrl}/?server=${encodeURIComponent(remote)}` : baseUrl);
  return win;
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'New resident window', accelerator: 'CmdOrCtrl+N', click: () => openWindow() },
        { type: 'separator' },
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' },
      ],
    },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'toggleDevTools' }] },
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'zoom' }] },
  ];
  if (process.platform === 'darwin') template.unshift({ role: 'appMenu' });
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
  });

  app.whenReady().then(async () => {
    try {
      await startServer();
    } catch (err) {
      console.error('UnderGrid could not start its local server:', err);
      app.quit();
      return;
    }
    buildMenu();
    openWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) openWindow(); });
  });

  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('before-quit', () => { if (server) void server.close(); });
}
