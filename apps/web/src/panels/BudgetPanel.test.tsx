// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, useEffect, type Dispatch } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { detailedRegions, exampleCamps, type Catalog, type DataManifest } from '@marps/data';
import { calculateMissionBudget, createEmptyMission, type Mission } from '@marps/mission-core';
import { PlannerProvider, usePlannerDispatch } from '../state/PlannerProvider';
import type { PlannerAction } from '../state/planner';
import { MissionDatabase } from '../storage/missionDatabase';
import { loadMissionDraft, saveMissionDraft } from '../storage/missionDraft';
import { BudgetPanel } from './BudgetPanel';
import { MissionEditor } from './MissionEditor';
import { setLanguage } from '../i18n';

const manifest = JSON.parse(readFileSync(resolve(fileURLToPath(import.meta.url), '../../../public/data/manifest.json'), 'utf8')) as DataManifest;
const catalog: Catalog = { manifest, regions: detailedRegions(manifest.regions), datasets: manifest.datasets, sites: manifest.sites, coverage: manifest.regions };
const load = async () => catalog;
const demo: Mission = { ...createEmptyMission('jezero', 'demo'), name: 'Mission de démonstration', missionType: 'sampling', camp: exampleCamps[0]!,
  parameters: { availableSeconds: 360 * 60, speedMetresPerSecond: 0.5, reserveSeconds: 60 * 60 },
  steps: ['skinner-ridge', 'wildcat-ridge', 'amalik'].map(id => {
    const site = manifest.sites.find(s => s.id === id)!;
    return { id, name: site.name, siteId: id, position: site.coordinate,
      activities: [{ id: 'observation', type: 'observation', durationMinutes: 10, completed: false },
        { id: 'photo', type: 'photo', durationMinutes: 20, completed: false },
        { id: 'sampling', type: 'sampling', durationMinutes: 45, completed: false }] };
  }) };
let root: Root;
let container: HTMLDivElement;
let dispatch: Dispatch<PlannerAction>;
function Screen() {
  const send = usePlannerDispatch();
  useEffect(() => { dispatch = send; }, [send]);
  return <><MissionEditor collapsible={false} /><BudgetPanel collapsible={false} /></>;
}
async function send(action: PlannerAction) { await act(async () => { dispatch(action); }); }
async function mount(mission: Mission = demo, region = true) {
  saveMissionDraft(mission);
  root = createRoot(container);
  await act(async () => { root.render(<PlannerProvider load={load}><Screen /></PlannerProvider>); });
  await act(async () => { await new MissionDatabase().activeMission(); await new MissionDatabase().history(); });
  if (region) await send({ type: 'viewChanged', view: 'region' });
}
const panel = () => [...container.querySelectorAll('section')].find(s => s.querySelector('h2')?.textContent === 'Budget de temps')!;
const value = (label: string) => [...panel().querySelectorAll('dl > div')].find(row => row.querySelector('dt')?.textContent === label)?.querySelector('dd')?.textContent;
async function click(label: string) {
  const button = [...container.querySelectorAll('button')].find(b => b.textContent === label);
  expect(button, label).toBeTruthy();
  await act(async () => { button!.click(); });
}
async function input(name: string, value: string) {
  await act(async () => {
    const field = container.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
beforeEach(() => {
  window.localStorage.clear(); vi.stubGlobal('indexedDB', new IDBFactory()); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div'); document.body.append(container);
});
afterEach(async () => { await act(async () => root?.unmount()); container.remove(); setLanguage('fr'); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('reproduit la démo : marge +32,3 min, dépassement −17,7 min puis adaptation à +27,3 min', async () => {
  await mount();
  const exact = calculateMissionBudget(demo);
  expect(exact.status).toBe('ready');
  if (exact.status !== 'ready') throw new Error('Démo non calculable');
  expect(exact.distances.total.metres).toBeCloseTo(1280, 0);
  expect(exact.walkingMinutes).toBeCloseTo(42.67, 2);
  expect(exact.marginMinutes).toBeCloseTo(32.33, 2);
  expect(value('Observations et activités')).toBe('225 min');
  expect(value('Retour au camp')).toBe('3,1 min');
  expect(value('Réserve')).toBe('60 min');
  expect(value('Marge après réserve')).toBe('+32,3 min');
  expect(panel().textContent).toContain('42,7 min');
  expect(panel().querySelector('[role="alert"]')).toBeNull();
  await send({ type: 'activityAdded', stepId: 'amalik', activity: { id: 'extra', type: 'sampling', durationMinutes: 50, completed: false } });
  expect(value('Observations et activités')).toBe('275 min');
  expect(value('Marge après réserve')).toBe('−17,7 min');
  expect(panel().querySelector('[role="alert"]')?.textContent).toContain('Dépassement de 17,7 min');
  expect(panel().querySelector('[role="alert"]')?.className).toContain('bg-danger-surface');
  await send({ type: 'activityRemoved', stepId: 'skinner-ridge', id: 'sampling' });
  expect(value('Observations et activités')).toBe('230 min');
  expect(value('Marge après réserve')).toBe('+27,3 min');
  expect(panel().querySelector('[role="alert"]')).toBeNull();
});

it('distingue les données manquantes d’une marge nulle, sans afficher un budget à zéro par défaut', async () => {
  await mount(createEmptyMission('jezero'));
  expect(panel().querySelector('[data-slot="budget-breakdown"]')).toBeNull();
  expect(panel().textContent).toContain('ajoutez un camp et au moins une étape');
  await send({ type: 'campPlaced', camp: demo.camp! });
  expect(panel().textContent).toContain('ajoutez au moins une étape');
  await send({ type: 'stepAdded', step: { id: 'zero', name: 'Au camp', siteId: null, position: demo.camp!.position, activities: [] } });
  await send({ type: 'parametersChanged', parameters: { availableSeconds: 0, reserveSeconds: 0, speedMetresPerSecond: 1 } });
  expect(value('Marge après réserve')).toBe('0 min');
  expect(panel().textContent).toContain('Budget respecté');
  expect(panel().innerHTML).not.toMatch(/NaN|Infinity/);
});

it('masque le budget précédent pendant une saisie de paramètres invalide et recalcule dès correction', async () => {
  await mount();
  await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  await click('Continuer : vérifier la mission');
  await input('speed', '0');
  expect(panel().querySelector('[data-slot="budget-breakdown"]')).toBeNull();
  expect(panel().querySelector('[role="alert"]')?.textContent).toContain('Budget non calculable');
  expect(loadMissionDraft()?.parameters.speedMetresPerSecond).toBe(0.5);
  await input('speed', '1');
  expect(panel().querySelector('[role="alert"]')).toBeNull();
  expect(value('Marge après réserve')).toBe('+53,7 min');
  await input('available', '');
  expect(panel().textContent).toContain('Budget non calculable');
  await input('available', '300');
  expect(value('Marge après réserve')).toBe('−6,3 min');
  await input('reserve', '30');
  expect(value('Marge après réserve')).toBe('+23,7 min');
});

it('recalcule le retour après réordonnancement et le budget après déplacement du camp ou suppression d’étape', async () => {
  await mount();
  const originalReturn = value('Retour au camp');
  await send({ type: 'stepMoved', id: 'amalik', to: 0 });
  expect(value('Retour au camp')).not.toBe(originalReturn);
  const movedMargin = value('Marge après réserve');
  await send({ type: 'campPlaced', camp: exampleCamps[1]! });
  expect(value('Marge après réserve')).not.toBe(movedMargin);
  await send({ type: 'stepRemoved', id: 'wildcat-ridge' });
  expect(value('Observations et activités')).toBe('150 min');
});

it('conserve le budget du plan en cochant une activité et sépare suivi et préparation', async () => {
  await mount();
  await send({ type: 'missionStarted', id: 'run' });
  const initial = value('Marge après réserve');
  await send({ type: 'activityToggled', stepId: 'skinner-ridge', activityId: 'photo' });
  expect(value('Marge après réserve')).toBe(initial);
  await send({ type: 'workspaceChanged', workspace: 'base' });
  await send({ type: 'activityAdded', stepId: 'amalik', activity: { id: 'extra', type: 'sampling', durationMinutes: 50, completed: false } });
  expect(value('Marge après réserve')).toBe('−17,7 min');
  await send({ type: 'workspaceChanged', workspace: 'mission' });
  expect(value('Marge après réserve')).toBe(initial);
  expect(value('Observations et activités')).toBe('225 min');
});

it('ne calcule aucun budget pour une sortie absente ou la vue globale', async () => {
  await mount(demo, false);
  expect(panel().textContent).toContain('Pas de budget hors du secteur détaillé');
  expect(panel().querySelector('[data-slot="budget-breakdown"]')).toBeNull();
  await send({ type: 'regionOpened', regionId: 'gale' });
  expect(panel().textContent).toContain('Pas de budget hors du secteur détaillé');
  expect(panel().querySelector('[data-slot="budget-breakdown"]')).toBeNull();
  await send({ type: 'workspaceChanged', workspace: 'mission' });
  expect(panel().textContent).toContain('Aucune sortie en cours');
  expect(panel().querySelector('[data-slot="budget-breakdown"]')).toBeNull();
});

it('affiche les petits dépassements sans les arrondir à zéro, même avec une durée disponible nulle', async () => {
  await mount({ ...demo, parameters: { availableSeconds: 0, reserveSeconds: 0, speedMetresPerSecond: 1 },
    steps: [{ id: 'tiny', name: 'Au camp', position: demo.camp!.position, siteId: null,
      activities: [{ id: 'tiny', type: 'photo', durationMinutes: 0.001, completed: false }] }] });
  expect(value('Marge après réserve')).toBe('−0,001 min');
  expect(panel().querySelector('[role="alert"]')?.textContent).toContain('Dépassement de 0,001 min');
  expect(panel().innerHTML).not.toMatch(/NaN|Infinity/);
});

it('switches budget labels, numeric formatting and overrun alerts between French and English', async () => {
  await mount();
  await act(async () => setLanguage('en'));
  expect([...container.querySelectorAll('h2')].some(heading => heading.textContent === 'Time budget')).toBe(true);
  const breakdown = () => container.querySelector('[data-slot="budget-breakdown"]')!;
  expect(breakdown().textContent).toContain('Exploration walking');
  expect(breakdown().textContent).toContain('+32.3 min');
  expect(breakdown().textContent).not.toContain('Marche d’exploration');
  await send({ type: 'activityAdded', stepId: 'amalik', activity: { id: 'extra', type: 'sampling', durationMinutes: 50, completed: false } });
  expect(breakdown().querySelector('[role="alert"]')?.textContent).toContain('Over budget by 17.7 min');
  await act(async () => setLanguage('fr'));
  expect(breakdown().querySelector('[role="alert"]')?.textContent).toContain('Dépassement de 17,7 min');
});

it('active le modèle O₂, exige le relief ou le plat explicite et conserve les paramètres après modification du temps et restauration', async () => {
  await mount();
  const oxygen = () => container.querySelector('section[aria-label="Estimation d’oxygène"]')!;
  const toggle = async (text: string) => {
    const label = [...oxygen().querySelectorAll('label')].find(l => l.textContent?.includes(text))!;
    await act(async () => label.querySelector<HTMLInputElement>('input')!.click());
  };
  await toggle('Activer le modèle');
  expect(oxygen().textContent).toContain('O₂ indisponible');
  await toggle('Supposer explicitement');
  expect(oxygen().textContent).toContain('Besoin total, retour compris');
  expect(oxygen().textContent).toContain('Hypothèse active : terrain plat');
  const saved = loadMissionDraft()!;
  expect(saved.parameters.oxygen?.assumeFlatTerrain).toBe(true);
  await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  await click('Continuer : vérifier la mission');
  await input('speed', '0.7');
  expect(loadMissionDraft()!.parameters.oxygen).toEqual(saved.parameters.oxygen);
  const total = oxygen().textContent;
  await send({ type: 'activityAdded', stepId: 'skinner-ridge', activity: { id: 'extra', type: 'photo', durationMinutes: 500, completed: false } });
  expect(oxygen().textContent).not.toBe(total);
  expect(oxygen().querySelector('[role="alert"]')).not.toBeNull();
  await act(async () => setLanguage('en'));
  expect(container.textContent).toContain('Oxygen estimate');
  expect(container.textContent).toContain('all defaults');
});
