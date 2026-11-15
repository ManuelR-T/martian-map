// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Timer, MapPin } from 'lucide-react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MapDrawer } from './MapDrawer';
import { drawerProjection, visibleDrawerProjection } from './useDrawerPerspective';

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
    expect(parseFloat(card.style.getPropertyValue('--drawer-depth'))).toBeLessThan(0);
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

it('keeps both projected edges inside the rail even for very tall cards', () => {
  for (const height of [44, 200, 800, 2000]) {
    for (const position of [-1, -0.5, 0, 0.5, 1]) {
      const { tilt, depth, perspective } = drawerProjection(position, height);
      for (const edge of [-1, 1]) {
        const z = depth + edge * height / 2 * Math.sin(tilt * Math.PI / 180);
        const projectedWidth = perspective / (perspective - z);
        expect(projectedWidth).toBeLessThanOrEqual(1);
        expect(projectedWidth).toBeGreaterThan(0.94);
      }
    }
  }
});

it('bases the projection on the visible portion regardless of offscreen content', () => {
  const short = visibleDrawerProjection(450, 150, 0, 600);
  const long = visibleDrawerProjection(450, 2000, 0, 600);
  expect(long).toEqual(short);
  expect(long.origin).toBe(75);
  const spanning = visibleDrawerProjection(-700, 2000, 0, 600);
  expect(spanning.tilt).toBe(0);
  expect(spanning.origin).toBe(1000);
  const exiting = visibleDrawerProjection(-1850, 2000, 0, 600);
  expect(exiting.tilt).toBe(-long.tilt);
  expect(exiting.origin).toBe(1925);
});
