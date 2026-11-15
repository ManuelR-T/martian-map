// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { MapPanelDock } from './MapPanelDock';

it('place le secteur dans la colonne défilante sur grand écran et sur la carte en mode compact', async () => {
  let desktop = true;
  const mediaEvents = new EventTarget();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('matchMedia', () => ({
    get matches() { return desktop; },
    addEventListener: mediaEvents.addEventListener.bind(mediaEvents),
    removeEventListener: mediaEvents.removeEventListener.bind(mediaEvents),
  }));
  const container = document.createElement('div');
  const sidebar = document.createElement('div');
  document.body.append(container, sidebar);
  const root = createRoot(container);
  try {
    await act(async () => { root.render(<MapPanelDock host={sidebar}><button>Secteur</button></MapPanelDock>); });
    expect(sidebar.textContent).toBe('Secteur');
    expect(container.textContent).toBe('');
    await act(async () => { desktop = false; mediaEvents.dispatchEvent(new Event('change')); });
    expect(container.textContent).toBe('Secteur');
    expect(sidebar.textContent).toBe('');
    await act(async () => { desktop = true; mediaEvents.dispatchEvent(new Event('change')); });
    expect(sidebar.textContent).toBe('Secteur');
    expect(container.textContent).toBe('');
  } finally {
    await act(async () => root.unmount()); container.remove(); sidebar.remove(); vi.unstubAllGlobals();
  }
});
