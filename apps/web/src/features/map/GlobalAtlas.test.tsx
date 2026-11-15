// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type Map from 'ol/Map';
import type BaseLayer from 'ol/layer/Base';
import type ImageLayer from 'ol/layer/Image';
import type ImageStatic from 'ol/source/ImageStatic';
import Observable from 'ol/Observable';
import { GlobalAtlas } from './GlobalAtlas';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ''; });
it('toggles real map layers, reads geology at the centre and cleans up subscriptions', async () => {
  const layers: BaseLayer[] = [];
  const events = new Observable();
  const fakeMap = Object.assign(events, {
    addLayer: (layer: BaseLayer) => layers.push(layer),
    removeLayer: (layer: BaseLayer) => layers.splice(layers.indexOf(layer), 1),
    getView: () => ({ getCenter: () => [77.58, 18.44] }),
  }) as unknown as Map;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(readFileSync(`apps/web/public/atlas/${url.split('/').pop()!}`, 'utf8'))));
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => { root.render(<GlobalAtlas map={fakeMap} />); });
    expect(layers).toHaveLength(3);
    expect(layers.every(layer => !layer.getVisible())).toBe(true);
    const hrsc = host.querySelectorAll<HTMLInputElement>('input[type=radio]')[1]!;
    await act(async () => hrsc.click());
    expect(layers[0]!.getVisible()).toBe(true);
    const switches = host.querySelectorAll<HTMLButtonElement>('[role=switch]');
    await act(async () => switches[0]!.click());
    expect(layers[2]!.getVisible()).toBe(true);
    const read = [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Lire au centre'))!;
    await act(async () => read.click());
    expect(host.querySelector('[aria-live=polite]')?.textContent).not.toContain('Aucune unité');
    expect(host.textContent).toContain('77,58° E');
    await act(async () => switches[1]!.click());
    expect(layers[1]!.getVisible()).toBe(true);
    expect((layers[1] as ImageLayer<ImageStatic>).getSource()?.getImageExtent()).toEqual([-180, -60, 180, 60]);
    expect(host.textContent).toContain('aucune température');
  } finally { await act(async () => root.unmount()); }
  expect(layers).toHaveLength(0);
  expect(events.hasListener('singleclick')).toBe(false);
});
