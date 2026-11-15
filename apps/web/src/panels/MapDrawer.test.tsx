// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Timer, MapPin } from 'lucide-react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MapDrawer } from './MapDrawer';

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});

function Drawers() {
  const [budget, setBudget] = useState(false);
  const [site, setSite] = useState(false);
  return <>
    <MapDrawer label="Budget" icon={Timer} side="right" open={budget} onOpenChange={setBudget}><input aria-label="Durée" defaultValue="75" /></MapDrawer>
    <MapDrawer label="Site" icon={MapPin} side="right" open={site} onOpenChange={setSite}><p>Fiche</p></MapDrawer>
  </>;
}

it('opens cards independently, keeps edits when closed and restores focus on Escape', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<Drawers />));
    const triggers = [...container.querySelectorAll<HTMLButtonElement>('.map-drawer-trigger')];
    expect(triggers.map(button => button.getAttribute('aria-expanded'))).toEqual(['false', 'false']);
    await act(async () => triggers[0]!.click());
    const input = container.querySelector('input')!;
    input.value = '90';
    await act(async () => triggers[1]!.click());
    expect(triggers.map(button => button.getAttribute('aria-expanded'))).toEqual(['true', 'true']);
    const budget = container.querySelectorAll<HTMLElement>('.map-drawer-content')[0]!;
    await act(async () => budget.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(triggers.map(button => button.getAttribute('aria-expanded'))).toEqual(['false', 'true']);
    expect(document.activeElement).toBe(triggers[0]);
    expect(budget.hasAttribute('inert')).toBe(true);
    await act(async () => triggers[0]!.click());
    expect(input.value).toBe('90');
    expect(budget.hasAttribute('inert')).toBe(false);
    expect(triggers[0]!.hidden).toBe(true);
    // One way to close, always the cross: no second button doing the same thing.
    expect(budget.querySelectorAll('button')).toHaveLength(1);
    const cross = budget.querySelector<HTMLButtonElement>('.map-drawer-close')!;
    await act(async () => cross.click());
    expect(triggers[0]!.hidden).toBe(false);
    expect(document.activeElement).toBe(triggers[0]);
  } finally {
    await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals();
  }
});

it('updates perspective when the rail scrolls without CSS scroll timelines', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  let tick: FrameRequestCallback | undefined;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { tick = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  let top = 300;
  const geometry = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return { top: this.classList.contains('map-drawer') ? top : 0, height: this.classList.contains('map-drawer') ? 200 : 600 } as DOMRect;
  });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<div className="map-drawer-rail"><MapDrawer label="Budget" icon={Timer} side="right" open onOpenChange={() => {}}>Contenu</MapDrawer></div>));
    const card = container.querySelector<HTMLElement>('.map-drawer')!;
    const visual = card.querySelector('.map-drawer-visual')!;
    expect(visual.contains(card.querySelector('.map-drawer-trigger'))).toBe(true);
    expect(visual.contains(card.querySelector('.map-drawer-content'))).toBe(true);
    expect(parseFloat(card.style.getPropertyValue('--drawer-scale'))).toBeLessThan(1);
    expect(parseFloat(card.style.getPropertyValue('--drawer-tilt'))).toBeGreaterThan(0);
    top = 0;
    container.querySelector('.map-drawer-rail')!.dispatchEvent(new Event('scroll'));
    tick!(0);
    expect(parseFloat(card.style.getPropertyValue('--drawer-tilt'))).toBeLessThan(0);
  } finally {
    await act(async () => root.unmount());
    geometry.mockRestore(); container.remove(); vi.unstubAllGlobals();
  }
});
