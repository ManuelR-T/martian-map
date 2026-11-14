// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Catalog } from '@marps/data';
import { PlannerProvider, usePlannerDispatch } from '../state/PlannerProvider';
import { MissionDatabase } from '../storage/missionDatabase';
import { StepsPanel } from './StepsPanel';
import { CampsPanel } from './CampsPanel';

let root: Root;
let container: HTMLDivElement;
const catalog: Catalog = { regions: [], datasets: [], sites: [{ id: 'site', name: 'Site test', regionId: 'jezero', datasetId: 'test', coordinate: { longitude: 77.4, latitude: 18.45 }, elevation: null, sol: '1', date: 'test', sampleName: 'test', rockType: 'test' }] };
function Screen() {
  const dispatch = usePlannerDispatch();
  return <><button onClick={() => dispatch({ type: 'viewChanged', view: 'region' })}>Jezero</button><button onClick={() => dispatch({ type: 'workspaceChanged', workspace: 'mission' })}>Suivi</button><button onClick={() => dispatch({ type: 'workspaceChanged', workspace: 'base' })}>Base</button><StepsPanel /><CampsPanel /></>;
}
const select = async (element: HTMLSelectElement, value: string) => {
  await act(async () => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })); });
};
const click = async (label: string) => {
  const button = [...container.querySelectorAll('button')].find(b => b.textContent === label);
  expect(button, label).toBeTruthy();
  await act(async () => { button!.click(); });
};
beforeEach(async () => {
  vi.stubGlobal('indexedDB', new IDBFactory()); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => { root.render(<PlannerProvider load={async () => catalog}><Screen /></PlannerProvider>); });
  await act(async () => { await new MissionDatabase().camps(); });
  await click('Jezero');
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('guide une mission du type à la sauvegarde sans proposer de créer un camp', async () => {
  await select(container.querySelectorAll('select')[0]!, 'sampling');
  expect(container.querySelector<HTMLInputElement>('input')!.value).toBe('Prélèvement d’échantillons');
  expect(container.textContent).not.toContain('Nom du camp');
  expect(container.querySelector('form')!.checkValidity()).toBe(true);
  await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  const selects = container.querySelectorAll('select');
  await select(selects[0]!, 'sim-jezero-alpha');
  await select(container.querySelectorAll('select')[1]!, 'site');
  await click('Continuer : vérifier la mission');
  expect(container.textContent).toContain('Étape 3 sur 3');
  await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  await act(async () => { await vi.waitFor(async () => expect(await new MissionDatabase().missions()).toHaveLength(1)); });
  await act(async () => {
    const saved = (await new MissionDatabase().missions())[0]!;
    expect(saved.name).toBe('Prélèvement d’échantillons');
    expect(saved.id).not.toBe('draft');
    expect(saved.steps[0]?.activities[0]).toMatchObject({ type: 'sampling', durationMinutes: 10, completed: false });
    expect(await new MissionDatabase().templates()).toEqual([]);
    await new MissionDatabase().history();
  });
});

it('enregistre un modèle sans imposer un camp et gère les camps séparément', async () => {
  const preparation = [...container.querySelectorAll('section')].find(section => section.querySelector('h2')?.textContent === 'Préparation de mission')!;
  const models = [...container.querySelectorAll('section')].find(section => section.querySelector('h2')?.textContent === 'Modèles de mission')!;
  expect(preparation.textContent).not.toContain('Nouveau modèle');
  expect(models.textContent).toContain('Modèles enregistrés');
  await click('Nouveau modèle');
  await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  await click('Continuer : vérifier la mission');
  await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  await act(async () => { await vi.waitFor(async () => expect(await new MissionDatabase().templates()).toHaveLength(1)); });
  await act(async () => { expect(await new MissionDatabase().missions()).toEqual([]); await new MissionDatabase().history(); });
  const camps = [...container.querySelectorAll('section')].find(section => section.textContent?.includes('Un catalogue indépendant des missions'))!;
  expect(camps.textContent).toContain('Jezero Alpha');
  await click('Nouveau camp');
  expect(camps.querySelector('input[name="name"]')).toBeTruthy();
});

it('replie les panneaux internes sans perdre la préparation et permet la navigation au clavier', async () => {
  const group = container.querySelector('[role="group"][aria-label="Actions de préparation de mission"]')!;
  const first = group.querySelector<HTMLButtonElement>('h3 > button')!;
  expect(first.getAttribute('aria-expanded')).toBe('true');
  const panel = document.getElementById(first.getAttribute('aria-controls')!)!;
  expect(panel.hidden).toBe(false);
  await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  await click('Nouvelle mission');
  expect(panel.hidden).toBe(true);
  await click('Nouvelle mission');
  expect(panel.hidden).toBe(false);
  expect(panel.textContent).toContain('Étape 2 sur 3');
  await act(async () => { first.focus(); first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); });
  expect(document.activeElement?.textContent).toBe('Missions enregistrées');
  expect(first.getAttribute('aria-expanded')).toBe('true');
  await click('Nouveau modèle');
  expect(first.getAttribute('aria-expanded')).toBe('false');
  expect(container.querySelector('[role="tablist"]')).toBeNull();
});

it('conserve les paramètres en revenant en arrière et permet de préparer une autre mission', async () => {
  await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  await select(container.querySelectorAll('select')[0]!, 'sim-jezero-alpha');
  await select(container.querySelectorAll('select')[1]!, 'site');
  await click('Continuer : vérifier la mission');
  await act(async () => {
    const input = container.querySelector<HTMLInputElement>('input[name="available"]')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '90');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await click('Retour à l’étape précédente');
  await click('Continuer : vérifier la mission');
  expect(container.querySelector<HTMLInputElement>('input[name="available"]')!.value).toBe('90');
  await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  await act(async () => { await vi.waitFor(async () => expect(await new MissionDatabase().missions()).toHaveLength(1)); await new MissionDatabase().history(); });
  await click('Préparer une autre mission');
  expect(container.textContent).toContain('Étape 1 sur 3');
  expect((await new MissionDatabase().missions())[0]?.parameters.availableSeconds).toBe(5400);
  await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  expect(container.textContent).toContain('Aucune étape');
});

it('conserve le formulaire et son étape en changeant d’espace de travail', async () => {
  await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  const group = container.querySelector('[aria-label="Actions de préparation de mission"]')!;
  await click('Suivi');
  expect(group.closest('.hidden')).toBeTruthy();
  await click('Base');
  expect(group.closest('.hidden')).toBeNull();
  expect(group.textContent).toContain('Étape 2 sur 3');
});

it('une restauration du suivi ne réécrit pas sa date d’historique', async () => {
  await act(async () => root.unmount());
  const { createEmptyMission } = await import('@marps/mission-core');
  const db = new MissionDatabase();
  await db.saveActiveMission(createEmptyMission('jezero', 'restore'));
  const before = await db.history();
  const save = vi.spyOn(MissionDatabase.prototype, 'saveActiveMission');
  root = createRoot(container);
  await act(async () => { root.render(<PlannerProvider load={async () => catalog}><Screen /></PlannerProvider>); await db.activeMission(); await db.history(); });
  expect(save).not.toHaveBeenCalled();
  await act(async () => { expect(await db.history()).toEqual(before); await db.camps(); await db.templates(); });
});

it('propose de réessayer une restauration en erreur et récupère le suivi', async () => {
  await act(async () => root.unmount());
  vi.spyOn(MissionDatabase.prototype, 'activeMission').mockRejectedValueOnce(new Error('Stockage indisponible'));
  root = createRoot(container);
  await act(async () => { root.render(<PlannerProvider load={async () => catalog}><Screen /></PlannerProvider>); await new MissionDatabase().camps(); });
  await click('Jezero');
  expect(container.textContent).toContain('Impossible de restaurer le suivi local');
  await click('Réessayer le chargement du suivi');
  await act(async () => { await new MissionDatabase().activeMission(); });
  expect(container.textContent).not.toContain('Impossible de restaurer le suivi local');
});
