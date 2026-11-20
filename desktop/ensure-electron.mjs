// npm 11 blocks install scripts, so Electron's binary may be missing after "npm install". Download it here if so.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgDir = path.join(here, 'node_modules', 'electron');
if (!fs.existsSync(pkgDir)) {
  console.error('\nElectron is not installed. Run:  npm install --prefix desktop\n');
  process.exit(1);
}
let ok = false;
try { createRequire(import.meta.url)(pkgDir); ok = true; } catch { ok = false; }
if (!ok) {
  console.log('Electron binary missing, downloading it now (one time, about 100 MB)...');
  execFileSync(process.execPath, [path.join(pkgDir, 'install.js')], { stdio: 'inherit' });
}
