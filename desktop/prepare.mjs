// Copies the built web app and the server into desktop/app so the desktop folder is self-contained.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, '..', 'web', 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('\nThe web app is not built yet. From the project root run:  npm run build\n');
  process.exit(1);
}
const out = path.join(here, 'app');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'server'), { recursive: true });
fs.cpSync(dist, path.join(out, 'web', 'dist'), { recursive: true });
fs.copyFileSync(path.join(here, '..', 'server', 'index.js'), path.join(out, 'server', 'index.js'));
fs.writeFileSync(path.join(out, 'server', 'package.json'), '{"type":"module"}\n');
fs.copyFileSync(path.join(here, '..', 'build', 'icon.png'), path.join(out, 'icon.png'));
console.log('desktop: app files ready');
