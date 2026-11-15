// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { MapPanelDock } from './MapPanelDock';

it('keeps map tools inside the drawer on every screen and out of the map before its host mounts', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const container = document.createElement('div');
  const drawer = document.createElement('div');
  document.body.append(container, drawer);
  const root = createRoot(container);
  try {
    await act(async () => { root.render(<MapPanelDock host={null}><button>Secteur</button></MapPanelDock>); });
    expect(container.textContent).toBe('');
    await act(async () => { root.render(<MapPanelDock host={drawer}><button>Secteur</button></MapPanelDock>); });
    expect(drawer.textContent).toBe('Secteur');
    expect(container.textContent).toBe('');
    await act(async () => { root.render(<MapPanelDock host={null}><button>Secteur</button></MapPanelDock>); });
    expect(drawer.textContent).toBe('');
    expect(container.textContent).toBe('');
  } finally {
    await act(async () => root.unmount()); container.remove(); drawer.remove(); vi.unstubAllGlobals();
  }
});
