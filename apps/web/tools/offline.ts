import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const workerTemplate = `
const APP = 'marps-app-__VERSION__';
const TILES = 'marps-mola-tiles-v1';
const FILES = __FILES__;
const root = new URL('./', self.location.href);
self.addEventListener('install', event => event.waitUntil(
  caches.open(APP).then(cache => cache.addAll(FILES.map(file => new URL(file, root).href)))
));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('marps-app-') && key !== APP) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.origin === root.origin && url.pathname.startsWith(root.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(APP);
      const cached = await cache.match(event.request, { ignoreVary: true });
      if (cached) return cached;
      if (event.request.mode === 'navigate') return (await cache.match(new URL('index.html', root).href)) || fetch(event.request);
      return fetch(event.request);
    })());
  } else if (url.origin === 'https://trek.nasa.gov' && url.pathname.includes('/Mars_MGS_MOLA_ClrShade_merge_global_463m/') && url.pathname.endsWith('.jpg')) {
    event.respondWith((async () => {
      const cache = await caches.open(TILES);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok && response.type !== 'opaque') {
        try {
          await cache.put(event.request, response.clone());
          const keys = await cache.keys();
          for (const key of keys.slice(0, Math.max(0, keys.length - 180))) await cache.delete(key);
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
  for (const file of files) {
    const contents = await readFile(join(directory, file));
    hash.update(String(contents.byteLength)).update(':').update(contents);
  }
  const version = hash.digest('hex').slice(0, 20);
  const source = workerTemplate.replace('__VERSION__', version).replace('__FILES__', JSON.stringify(files));
  await writeFile(join(directory, 'sw.js'), source);
}
