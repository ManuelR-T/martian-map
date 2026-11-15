import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const workerTemplate = `
const APP = 'marps-app-__VERSION__';
const DATA = APP + '-mission';
const TILES = 'marps-jezero-extra-__VERSION__';
const FILES = __FILES__;
const SIZES = __SIZES__;
const BUDGET = 64 * 1024 * 1024;
const EXTRA_BUDGET = 16 * 1024 * 1024;
const root = new URL('./', self.location.href);
const shell = FILES.filter(file => !file.startsWith('data/') && !file.startsWith('atlas/'));
let preparing;
async function complete() {
  const app = await caches.open(APP), data = await caches.open(DATA);
  for (const file of FILES) if (!(await (shell.includes(file) ? app : data).match(new URL(file, root).href, { ignoreVary: true }))) return false;
  return true;
}
self.addEventListener('install', event => event.waitUntil(
  caches.open(APP).then(cache => cache.addAll(shell.map(file => new URL(file, root).href))).then(() => self.skipWaiting())
));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if ((key.startsWith('marps-app-') && key !== APP && key !== DATA) || (key.startsWith('marps-jezero-extra-') && key !== TILES) || key === 'marps-mola-tiles-v1') await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('message', event => {
  const port = event.ports[0];
  if (!port) return;
  event.waitUntil((async () => {
    try {
      if (event.data === 'PREPARE') {
        if (!preparing) preparing = (async () => {
          const total = Object.values(SIZES).reduce((a, b) => a + b, 0);
          if (total > BUDGET) throw new Error('budget');
          const app = await caches.open(APP), data = await caches.open(DATA);
          let missing = 0;
          for (const file of FILES) if (!(await (shell.includes(file) ? app : data).match(new URL(file, root).href, { ignoreVary: true }))) missing += SIZES[file];
          const estimate = await self.navigator.storage?.estimate();
          if (estimate && estimate.quota - estimate.usage < missing) throw new Error('quota');
          let count = 0;
          for (const file of FILES) {
            {
              const cache = shell.includes(file) ? app : data;
              const url = new URL(file, root).href;
              if (!(await cache.match(url, { ignoreVary: true }))) {
                const response = await fetch(url, { cache: 'reload' });
                if (!response.ok || (await response.clone().arrayBuffer()).byteLength !== SIZES[file]) throw new Error('download');
                await cache.put(url, response);
              }
            }
            port.postMessage({ progress: ++count, count: FILES.length });
          }
        })().finally(() => { preparing = undefined; });
        await preparing;
      }
      const extras = await caches.open(TILES);
      port.postMessage({ ready: await complete(), bytes: Object.values(SIZES).reduce((a, b) => a + b, 0), budget: BUDGET, extraCount: (await extras.keys()).length });
    } catch (error) { port.postMessage({ error: error.name === 'QuotaExceededError' ? 'quota' : error.message }); }
  })());
});
let extraQueue = Promise.resolve();
async function remember(request, response) {
  const cache = await caches.open(TILES);
  const bytes = (await response.clone().arrayBuffer()).byteLength;
  if (bytes > EXTRA_BUDGET) return;
  let total = 0;
  const keys = await cache.keys();
  const sizes = [];
  for (const key of keys) {
    const size = Number((await cache.match(key)).headers.get('x-marps-bytes')) || 0;
    sizes.push(size); total += size;
  }
  while (keys.length && total + bytes > EXTRA_BUDGET) { total -= sizes.shift(); await cache.delete(keys.shift()); }
  const headers = new Headers(response.headers); headers.set('x-marps-bytes', String(bytes));
  await cache.put(request, new Response(await response.arrayBuffer(), { status: response.status, headers }));
}
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.origin === root.origin && url.pathname.startsWith(root.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(APP);
      if (event.request.mode === 'navigate') {
        try {
          const response = await fetch(event.request, { cache: 'no-cache' });
          if (response.ok) return response;
        } catch { /* The installed application remains available offline. */ }
        return (await cache.match(new URL('index.html', root).href)) || fetch(event.request);
      }
      const cached = await cache.match(event.request, { ignoreVary: true }) || await (await caches.open(DATA)).match(event.request, { ignoreVary: true });
      if (cached) return cached;
      return fetch(event.request);
    })());
  } else if (url.origin === 'https://trek.nasa.gov' && url.pathname.includes('/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/') && url.pathname.endsWith('.png')) {
    event.respondWith((async () => {
      const cache = await caches.open(TILES);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok && response.type !== 'opaque') {
        try {
          extraQueue = extraQueue.catch(() => {}).then(() => remember(event.request, response.clone()));
          await extraQueue;
        } catch { /* Optional tile caching must not prevent display. */ }
      }
      return response;
    })());
  }
});`;

export async function writeOfflineWorker(directory: string): Promise<void> {
  async function collect(relative = ''): Promise<string[]> {
    const entries = await readdir(join(directory, relative), { withFileTypes: true });
    const nested = await Promise.all(entries.map(entry => {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      return entry.isDirectory() ? collect(name) : Promise.resolve(name === 'sw.js' ? [] : [name]);
    }));
    return nested.flat();
  }
  const files = (await collect()).sort();
  const hash = createHash('sha256').update(workerTemplate).update(JSON.stringify(files));
  const sizes: Record<string, number> = {};
  for (const file of files) {
    const contents = await readFile(join(directory, file));
    sizes[file] = contents.byteLength;
    hash.update(String(contents.byteLength)).update(':').update(contents);
  }
  if (Object.values(sizes).reduce((a, b) => a + b, 0) > 64 * 1024 * 1024) throw new Error('Offline bundle exceeds 64 MiB.');
  const version = hash.digest('hex').slice(0, 20);
  const source = workerTemplate.replaceAll('__VERSION__', version).replace('__FILES__', JSON.stringify(files)).replace('__SIZES__', JSON.stringify(sizes));
  await writeFile(join(directory, 'sw.js'), source);
}
