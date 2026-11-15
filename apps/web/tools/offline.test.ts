import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { writeOfflineWorker } from './offline';

it('versions final HTML and public data, and excludes the previous worker', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'marps-offline-'));
  try {
    await mkdir(join(directory, 'data'));
    await writeFile(join(directory, 'index.html'), '<html>first</html>');
    await writeFile(join(directory, 'data', 'map.jpg'), 'first image');
    await writeOfflineWorker(directory);
    const first = await readFile(join(directory, 'sw.js'), 'utf8');
    expect(first).toContain('data/map.jpg');
    await writeOfflineWorker(directory);
    expect(await readFile(join(directory, 'sw.js'), 'utf8')).toBe(first);
    await writeFile(join(directory, 'data', 'map.jpg'), 'updated image');
    await writeOfflineWorker(directory);
    const updated = await readFile(join(directory, 'sw.js'), 'utf8');
    expect(updated).not.toBe(first);
    await writeFile(join(directory, 'index.html'), '<html>updated</html>');
    await writeOfflineWorker(directory);
    expect(await readFile(join(directory, 'sw.js'), 'utf8')).not.toBe(updated);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

it('serves precached app assets offline despite Vary: Origin and keeps navigation working', async () => {
  const { runInNewContext } = await import('node:vm');
  const directory = await mkdtemp(join(tmpdir(), 'marps-offline-'));
  try {
    await writeFile(join(directory, 'index.html'), '<html>offline app</html>');
    await writeOfflineWorker(directory);
    const handlers = new Map<string, (event: unknown) => void>();
    const page = new Response('<html>offline app</html>');
    const asset = new Response('cached application');
    const cache = { match: async (request: Request | string, options?: CacheQueryOptions) => {
      const url = typeof request === 'string' ? request : request.url;
      if (url.endsWith('/index.html')) return page.clone();
      if (url.endsWith('/assets/app.js') && options?.ignoreVary) return asset.clone();
      return undefined;
    } };
    let online = false;
    runInNewContext(await readFile(join(directory, 'sw.js'), 'utf8'), {
      URL, Request, self: { location: { href: 'https://example.test/app/sw.js' }, addEventListener: (name: string, handler: (event: unknown) => void) => handlers.set(name, handler) },
      caches: { open: async () => cache },
      fetch: () => { if (online) return Promise.resolve(new Response('<html>current blue hour app</html>')); throw new Error('Network unavailable'); },
    });
    async function request(url: string, mode = 'cors') {
      let response: Promise<Response> | undefined;
      handlers.get('fetch')!({ request: { url, method: 'GET', mode }, respondWith: (result: Promise<Response>) => { response = result; } });
      return (await response)!.text();
    }
    expect(await request('https://example.test/app/assets/app.js')).toBe('cached application');
    expect(await request('https://example.test/app/?mission=demo', 'navigate')).toBe('<html>offline app</html>');
    online = true;
    expect(await request('https://example.test/app/index.html', 'navigate')).toBe('<html>current blue hour app</html>');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
