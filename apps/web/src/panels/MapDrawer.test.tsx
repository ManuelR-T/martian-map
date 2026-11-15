// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Timer, MapPin } from 'lucide-react';
import { expect, it, vi } from 'vitest';
import { MapDrawer } from './MapDrawer';

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
  } finally {
    await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals();
  }
});
