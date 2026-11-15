// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, useEffect, type Dispatch } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { exampleCamps, type Catalog, type DataManifest } from '@marps/data';
import { createEmptyMission, type Mission } from '@marps/mission-core';
import { BudgetPanel } from '../panels/BudgetPanel';
import { StepsPanel } from '../panels/StepsPanel';
import { PlannerProvider, usePlannerDispatch } from '../state/PlannerProvider';
import type { PlannerAction } from '../state/planner';
import { MissionDatabase } from '../storage/missionDatabase';
import { saveMissionDraft } from '../storage/missionDraft';
import { RouteProfileProvider } from '../terrain/RouteProfileProvider';
import { setLanguage } from '../i18n';
import { HelmetView } from './HelmetView';

const manifest = JSON.parse(readFileSync(resolve(fileURLToPath(import.meta.url), '../../../public/data/manifest.json'), 'utf8')) as DataManifest;
// No relief dataset: the helmet view must say that slopes are not checked instead of staying silent.
const catalog: Catalog = { manifest, regions: [], datasets: [], sites: manifest.sites, coverage: manifest.regions };
const demo = (availableMinutes = 360): Mission => ({ ...createEmptyMission('jezero', 'demo'), name: 'Mission de démonstration', camp: exampleCamps[0]!,
  parameters: { availableSeconds: availableMinutes * 60, speedMetresPerSecond: 0.5, reserveSeconds: 30 * 60 },
  steps: ['skinner-ridge', 'wildcat-ridge'].map(id => {
    const site = manifest.sites.find(s => s.id === id)!;
    return { id, name: site.name, siteId: id, position: site.coordinate,
      activities: [{ id: 'observation', type: 'observation', durationMinutes: 10, completed: false }, { id: 'photo', type: 'photo', durationMinutes: 20, completed: false }] };
  }) });
let root: Root;
let container: HTMLDivElement;
let dispatch: Dispatch<PlannerAction>;
function Screen() {
  const send = usePlannerDispatch();
  useEffect(() => { dispatch = send; }, [send]);
  return <RouteProfileProvider><div id="hud"><HelmetView /></div><BudgetPanel collapsible={false} /><StepsPanel /></RouteProfileProvider>;
}
const send = async (action: PlannerAction) => { await act(async () => { dispatch(action); }); };
async function mount(mission: Mission | null = demo()) {
  if (mission) saveMissionDraft(mission);
  root = createRoot(container);
  await act(async () => { root.render(<PlannerProvider load={async () => catalog}><Screen /></PlannerProvider>); });
  await act(async () => { await new MissionDatabase().activeMission(); await new MissionDatabase().history(); });
  await send({ type: 'viewChanged', view: 'region' });
  if (mission) await send({ type: 'missionStarted', id: 'sortie' });
}
const hud = () => container.querySelector<HTMLElement>('#hud')!;
const button = (label: string, scope: HTMLElement = hud()) => [...scope.querySelectorAll('button')].find(b => b.textContent === label);
const click = async (label: string, scope?: HTMLElement) => {
  expect(button(label, scope), label).toBeTruthy();
  await act(async () => { button(label, scope)!.click(); });
};
const readout = (label: string) => [...hud().querySelectorAll('dl > div')].find(row => row.querySelector('dt')?.textContent === label)?.querySelector('dd')?.textContent;

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal('indexedDB', new IDBFactory()); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div'); document.body.append(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); setLanguage('fr'); vi.unstubAllGlobals(); });

it('affiche l’arrêt, l’activité, la suite et le statut simulé de la sortie en cours', async () => {
  await mount();
  expect(hud().querySelector('h1')?.textContent).toBe('Skinner Ridge');
  expect(hud().textContent).toContain('Arrêt 1/2');
  expect(hud().textContent).toContain('Activité 1/2');
  expect(hud().textContent).toContain('Observation · 10 min');
  expect(readout('Ensuite')).toBe('Wildcat Ridge');
  expect(hud().textContent).toContain('Simulé · suivi manuel');
  expect(hud().textContent).toContain('Aucune localisation réelle');
  expect(hud().textContent).toContain('Pentes non vérifiées');
  expect(hud().querySelector('a[href="#/"]')?.textContent).toBe('Planificateur');
});

it('avance à la main, d’une activité puis d’un arrêt à l’autre, et sait revenir en arrière', async () => {
  await mount();
  const start = readout('Reste prévu');
  await click('Activité faite');
  expect(hud().textContent).toContain('Photo · 20 min');
  expect(readout('Reste prévu')).not.toBe(start);
  await click('Activité faite');
  expect(hud().querySelector('h1')?.textContent).toBe('Wildcat Ridge');
  expect(readout('Ensuite')).toBe('Camp');
  // The tracking panel reads the same mission: its boxes follow the helmet view.
  expect([...container.querySelectorAll<HTMLInputElement>('input[type=checkbox]')].map(box => box.checked)).toEqual([true, true, false, false]);
  await click('Annuler la dernière');
  expect(hud().querySelector('h1')?.textContent).toBe('Skinner Ridge');
  expect(hud().textContent).toContain('Photo · 20 min');
  for (let done = 0; done < 3; done += 1) await click('Activité faite');
  expect(hud().textContent).toContain('Retour au camp');
  expect(hud().textContent).toContain('4/4 activités faites');
  expect(button('Activité faite')).toBeUndefined();
});

it('reprend la marge du budget principal et signale son dépassement', async () => {
  await mount(demo(60));
  const budget = [...container.querySelectorAll('section')].find(s => s.querySelector('h2')?.textContent === 'Budget de temps')!;
  const margin = readout('Marge du plan')!;
  expect(margin).toMatch(/^−/);
  expect(budget.textContent).toContain(margin);
  const alert = hud().querySelector('[role=alert]')!;
  expect(alert.textContent).toContain('Dépassement de');
  expect(budget.textContent).toContain(alert.textContent!.replace('Budget ', ''));
  await click('Activité faite');
  // Ticking moves the planned remainder, never the plan margin.
  expect(readout('Marge du plan')).toBe(margin);
});

it('partage l’alerte radiation simulée avec le suivi', async () => {
  await mount();
  expect(hud().textContent).toContain('Aucune alerte.');
  await click('Simuler une alerte radiation');
  expect(hud().querySelector('[role=alert]')?.textContent).toContain('Simulation · Alerte radiation');
  expect(hud().querySelector('[role=alert]')?.textContent).toContain('Rentrer au camp maintenant');
  expect(container.querySelectorAll('[role=alert]')).toHaveLength(2);
  await click('Annuler la simulation', container);
  expect(hud().querySelector('[role=alert]')?.textContent).toBe('');
});

it('bascule vers « En mission » quand la vue est ouverte depuis la base, pour que les coches soient acceptées', async () => {
  await mount();
  await send({ type: 'workspaceChanged', workspace: 'base' });
  await click('Activité faite');
  expect(hud().textContent).toContain('Photo · 20 min');
});

it('renvoie au planificateur sans sortie en cours, et se traduit', async () => {
  await mount(null);
  expect(hud().textContent).toContain('Aucune sortie en cours');
  expect(hud().querySelector('a[href="#/"]')).toBeTruthy();
  await act(async () => { setLanguage('en'); });
  expect(hud().querySelector('a[href="#/"]')?.textContent).toBe('Planner');
});
