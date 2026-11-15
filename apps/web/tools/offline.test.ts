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
    await writeFile(join(directory, 'data', 'terrain.geojson'), JSON.stringify({ type: 'FeatureCollection', features: [] }));
    await writeOfflineWorker(directory);
    const first = await readFile(join(directory, 'sw.js'), 'utf8');
    expect(first).toContain('data/map.jpg');
    expect(first).toContain('data/terrain.geojson');
    await writeOfflineWorker(directory);
    expect(await readFile(join(directory, 'sw.js'), 'utf8')).toBe(first);
    await writeFile(join(directory, 'data', 'terrain.geojson'), JSON.stringify({ type: 'FeatureCollection', features: [{ id: 'updated' }] }));
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
      if (url.endsWith('/data/terrain.geojson') && options?.ignoreVary) return new Response('{"type":"FeatureCollection","features":[]}');
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
    expect(JSON.parse(await request('https://example.test/app/data/terrain.geojson')).type).toBe('FeatureCollection');
    expect(await request('https://example.test/app/assets/app.js')).toBe('cached application');
    expect(await request('https://example.test/app/?mission=demo', 'navigate')).toBe('<html>offline app</html>');
    online = true;
    expect(await request('https://example.test/app/index.html', 'navigate')).toBe('<html>current blue hour app</html>');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

it('requires explicit complete preparation, detects deletion, resumes failures and preserves mission data during extra-tile eviction', async () => {
  const { runInNewContext } = await import('node:vm');
  const directory = await mkdtemp(join(tmpdir(), 'marps-offline-'));
  try {
    await mkdir(join(directory, 'data'));
    await writeFile(join(directory, 'index.html'), 'shell');
    await writeFile(join(directory, 'data/site.json'), 'site');
    await writeOfflineWorker(directory);
    const handlers = new Map<string, (event: unknown) => void>();
    const stores = new Map<string, Map<string, Response>>();
    let online = true, quota = 1e9, fail = false;
    const key = (r: string | Request) => typeof r === 'string' ? r : r.url;
    const caches = {
      keys: async () => [...stores.keys()],
      delete: async (name: string) => stores.delete(name),
      open: async (name: string) => {
        if (!stores.has(name)) stores.set(name, new Map());
        const store = stores.get(name)!;
        return {
          match: async (r: string | Request) => store.get(key(r))?.clone(),
          keys: async () => [...store.keys()].map(url => new Request(url)),
          delete: async (r: string | Request) => store.delete(key(r)),
          put: async (r: string | Request, response: Response) => { store.set(key(r), response.clone()); },
          addAll: async (urls: string[]) => { for (const url of urls) store.set(url, new Response('shell')); },
        };
      },
    };
    runInNewContext(await readFile(join(directory, 'sw.js'), 'utf8'), {
      URL, Request, Response, Headers, caches,
      self: { location: { href: 'https://example.test/sw.js' }, navigator: { storage: { estimate: async () => ({ quota, usage: 0 }) } }, skipWaiting: async () => {}, clients: { claim: async () => {} }, addEventListener: (name: string, handler: (event: unknown) => void) => handlers.set(name, handler) },
      fetch: async (r: string | Request) => {
        if (!online || fail) throw new Error('network');
        return new Response(key(r).includes('trek.nasa.gov') ? new Uint8Array(9 * 1024 * 1024) : 'site');
      },
    });
    async function lifecycle(name: string) {
      let promise: Promise<unknown> | undefined;
      handlers.get(name)!({ waitUntil: (p: Promise<unknown>) => { promise = p; } });
      await promise;
    }
    async function message(data: string) {
      let result: { ready: boolean; error?: string; extraCount: number } | undefined;
      let promise: Promise<unknown> | undefined;
      handlers.get('message')!({ data, ports: [{ postMessage: (value: typeof result) => { result = value; } }], waitUntil: (p: Promise<unknown>) => { promise = p; } });
      await promise; return result!;
    }
    async function request(url: string, mode = 'cors') {
      let promise: Promise<Response> | undefined;
      handlers.get('fetch')!({ request: { url, method: 'GET', mode }, respondWith: (p: Promise<Response>) => { promise = p; } });
      return (await promise)!.text();
    }
    await lifecycle('install'); await lifecycle('activate');
    expect((await message('STATUS')).ready).toBe(false);
    quota = 0;
    expect((await message('PREPARE')).error).toBe('quota');
    quota = 1e9; fail = true;
    expect((await message('PREPARE')).error).toBe('network');
    expect((await message('STATUS')).ready).toBe(false);
    fail = false;
    expect((await message('PREPARE')).ready).toBe(true);
    const base = 'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/default/default028mm/16/26048/';
    await request(base + '93714.png'); await request(base + '93715.png');
    expect((await message('STATUS')).extraCount).toBe(1);
    expect((await message('STATUS')).ready).toBe(true);
    online = false;
    expect(await request('https://example.test/', 'navigate')).toBe('shell');
    expect(await request('https://example.test/data/site.json')).toBe('site');
    expect((await request(base + '93715.png')).length).toBe(9 * 1024 * 1024);
    await expect(request(base + '93716.png')).rejects.toThrow('network');
    stores.get([...stores.keys()].find(name => name.endsWith('-mission'))!)!.clear();
    expect((await message('STATUS')).ready).toBe(false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
