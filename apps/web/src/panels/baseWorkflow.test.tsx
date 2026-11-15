// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Catalog } from '@marps/data';
import { PlannerProvider, usePlannerDispatch } from '../state/PlannerProvider';
import { MissionDatabase } from '../storage/missionDatabase';
import { StepsPanel } from './StepsPanel';

let root: Root;
let container: HTMLDivElement;
const catalog: Catalog = { regions: [], datasets: [], sites: [{ id: 'site', name: 'Site test', regionId: 'jezero', datasetId: 'test', coordinate: { longitude: 77.4, latitude: 18.45 }, elevation: null, sol: '1', date: 'test', sampleName: 'test', rockType: 'test' }] };
function Screen() {
  const dispatch = usePlannerDispatch();
  return <><button onClick={() => dispatch({ type: 'viewChanged', view: 'region' })}>Jezero</button><button onClick={() => dispatch({ type: 'workspaceChanged', workspace: 'mission' })}>Suivi</button><button onClick={() => dispatch({ type: 'workspaceChanged', workspace: 'base' })}>Base</button><StepsPanel /></>;
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
  const panel = [...container.querySelectorAll('section')].find(section => section.querySelector('h2')?.textContent === 'Mission')!;
  expect([...panel.querySelectorAll('[role="radio"]')].map(tab => tab.textContent)).toEqual(['Nouvelle mission', 'Camps', 'Missions enregistrées']);
  await click('Missions enregistrées');
  // The saved lists reload from IndexedDB: their buttons stay disabled until the refresh ends.
  await vi.waitFor(async () => { await act(async () => { await new MissionDatabase().templates(); }); expect([...container.querySelectorAll('button')].find(b => b.textContent === 'Nouveau modèle')?.disabled).toBe(false); });
  await click('Nouveau modèle');
  expect(container.textContent).toContain('Modèle réutilisable · Étape 1 sur 3');
  await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  await click('Continuer : vérifier la mission');
  await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  await act(async () => { await vi.waitFor(async () => expect(await new MissionDatabase().templates()).toHaveLength(1)); });
  await act(async () => { expect(await new MissionDatabase().missions()).toEqual([]); await new MissionDatabase().history(); });
  await click('Camps');
  await vi.waitFor(async () => { await act(async () => { await new MissionDatabase().camps(); }); expect(panel.textContent).toContain('Jezero Alpha'); });
  await click('Nouveau camp');
  expect(panel.querySelector('input[name="name"]')).toBeTruthy();
});

it('garde la préparation en cours en passant par un autre onglet', async () => {
  await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  expect(container.textContent).toContain('Étape 2 sur 3');
  await click('Camps');
  expect(container.textContent).not.toContain('Étape 2 sur 3');
  await click('Nouvelle mission');
  expect(container.textContent).toContain('Étape 2 sur 3');
});

it('ouvre l’onglet Camps depuis l’étape 2 de la préparation', async () => {
  await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  await click('Créer un camp');
  expect(container.querySelector('[role="radio"][aria-checked="true"]')?.textContent).toBe('Camps');
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
  const group = container.querySelector('[aria-label="Sections de la mission"]')!.parentElement!;
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

it('demande avant de remplacer une préparation modifiée depuis l’onglet Missions enregistrées', async () => {
  await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  await select(container.querySelectorAll('select')[0]!, 'sim-jezero-alpha');
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  await click('Missions enregistrées');
  await vi.waitFor(async () => { await act(async () => { await new MissionDatabase().templates(); }); expect([...container.querySelectorAll('button')].find(b => b.textContent === 'Nouveau modèle')?.disabled).toBe(false); });
  await click('Nouveau modèle');
  expect(confirm).toHaveBeenCalledWith('Abandonner les modifications non enregistrées ?');
  await click('Nouvelle mission');
  expect(container.textContent).toContain('Nouvelle mission · Étape 2 sur 3');
  expect(container.querySelectorAll('select')[0]!.value).toBe('sim-jezero-alpha');
});
