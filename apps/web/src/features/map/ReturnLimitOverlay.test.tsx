// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type Map from 'ol/Map';
import { ReturnLimitOverlay } from './ReturnLimitOverlay';
it('removes its vector layer when the map is replaced or unmounted', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const first = { addLayer: vi.fn(), removeLayer: vi.fn() };
  const second = { addLayer: vi.fn(), removeLayer: vi.fn() };
  const root = createRoot(document.createElement('div'));
  try {
    await act(async () => root.render(<ReturnLimitOverlay map={first as unknown as Map} />));
    expect(first.addLayer).toHaveBeenCalledTimes(1);
    await act(async () => root.render(<ReturnLimitOverlay map={second as unknown as Map} />));
    expect(first.removeLayer).toHaveBeenCalledWith(first.addLayer.mock.calls[0]![0]);
    expect(second.addLayer).toHaveBeenCalledTimes(1);
  } finally { await act(async () => root.unmount()); vi.unstubAllGlobals(); }
  expect(second.removeLayer).toHaveBeenCalledWith(second.addLayer.mock.calls[0]![0]);
});
