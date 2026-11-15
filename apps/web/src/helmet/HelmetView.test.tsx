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
const current = () => hud().querySelector('ul [aria-current=step]')?.textContent;
const route = () => [...hud().querySelectorAll('ol > li')].map(node => node.getAttribute('aria-current') === 'step');
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
  expect(current()).toContain('Observation');
  expect(current()).toContain('10 min');
  expect(hud().querySelector('[role=timer]')?.textContent).toBe('0:00');
  // Camp, two stops, camp: the first stop is the current one.
  expect(route()).toEqual([false, true, false, false]);
  expect(readout('Camp en direct')).toMatch(/ m$/);
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
  expect(current()).toContain('Photo');
  expect(readout('Reste prévu')).not.toBe(start);
  await click('Activité faite');
  expect(hud().querySelector('h1')?.textContent).toBe('Wildcat Ridge');
  expect(readout('Ensuite')).toBe('Camp');
  // The tracking panel reads the same mission: its boxes follow the helmet view.
  expect([...container.querySelectorAll<HTMLInputElement>('ol[aria-label="Parcours de la sortie en cours"] input[type=checkbox]')].map(box => box.checked)).toEqual([true, true, false, false]);
  await click('Annuler la dernière');
  expect(hud().querySelector('h1')?.textContent).toBe('Skinner Ridge');
  expect(current()).toContain('Photo');
  for (let done = 0; done < 3; done += 1) await click('Activité faite');
  expect(hud().textContent).toContain('Retour au camp');
  expect(hud().textContent).toContain('4/4 activités faites');
  expect(button('Activité faite')).toBeUndefined();
  expect(route()).toEqual([false, false, false, true]);
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
  expect(container.querySelectorAll('[role=alert]')).toHaveLength(3);
  await click('Annuler la simulation', container);
  expect(hud().querySelector('[role=alert]')?.textContent).toBe('');
});

it('bascule vers « En mission » quand la vue est ouverte depuis la base, pour que les coches soient acceptées', async () => {
  await mount();
  await send({ type: 'workspaceChanged', workspace: 'base' });
  await click('Activité faite');
  expect(current()).toContain('Photo');
});

it('se pilote au clavier et coche les tâches de la fiche du site', async () => {
  await mount();
  const key = async (name: string) => { await act(async () => { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true })); }); };
  await key(' ');
  expect(current()).toContain('Photo');
  await key('Backspace');
  expect(current()).toContain('Observation');
  const task = () => [...hud().querySelectorAll<HTMLButtonElement>('section[aria-label="Fiche de site"] button')][0]!;
  expect(task().textContent).toContain('Décrire la roche');
  expect(task().getAttribute('aria-pressed')).toBe('false');
  await act(async () => { task().click(); });
  expect(task().getAttribute('aria-pressed')).toBe('true');
  // Sheet tasks are not the budgeted activities: the stop does not advance.
  expect(current()).toContain('Observation');
});

it('renvoie au planificateur sans sortie en cours, et se traduit', async () => {
  await mount(null);
  expect(hud().textContent).toContain('Aucune sortie en cours');
  expect(hud().querySelector('a[href="#/"]')).toBeTruthy();
  await act(async () => { setLanguage('en'); });
  expect(hud().querySelector('a[href="#/"]')?.textContent).toBe('Planner');
});


it('partage les retards, ralentissements et mises à jour radiatives avec le planificateur', async () => {
  const initial = demo();
  await mount(initial);
  const before = readout('Reste prévu');
  await click('Simuler une alerte radiation');
  const alertBefore = hud().querySelector('[role=alert]')!.textContent;
  await send({ type: 'eventAdded', event: { id: 'delay', simulated: true, kind: 'activity-delay', stepId: 'skinner-ridge', activityId: 'observation', delayMinutes: 15 } });
  expect(current()).toContain('25 min');
  expect(readout('Reste prévu')).not.toBe(before);
  await send({ type: 'eventAdded', event: { id: 'visibility', simulated: true, kind: 'visibility', legIndices: [2], speedFactor: 0.5 } });
  expect(hud().querySelector('[role=alert]')!.textContent).not.toBe(alertBefore);
  const trackingAlert = [...container.querySelectorAll('[role=alert]')].find(a => !hud().contains(a))!;
  expect(trackingAlert.textContent).toContain('Rentrer au camp maintenant');
  await send({ type: 'eventsCleared' });
  expect(current()).toContain('10 min');
  expect(readout('Reste prévu')).toBe(before);
  expect(hud().querySelector('[role=alert]')!.textContent).toBe(alertBefore);
});
