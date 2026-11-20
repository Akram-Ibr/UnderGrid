// Post-build step: list every built file so the service worker can cache the whole app on install,
// then stamp the service worker with a build id so old caches are replaced on update.
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  const p = path.join(dir, d.name);
  return d.isDirectory() ? walk(p) : [p];
});

const skip = new Set(['sw.js', 'precache.json']);
const files = walk(dist)
  .map((p) => '/' + path.relative(dist, p).split(path.sep).join('/'))
  .filter((u) => !skip.has(u.slice(1)));
const list = ['/', ...files];
fs.writeFileSync(path.join(dist, 'precache.json'), JSON.stringify(list));

const swPath = path.join(dist, 'sw.js');
const build = Date.now().toString(36);
fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8').replace('__BUILD__', build));
console.log(`precache: ${list.length} files, build ${build}`);
