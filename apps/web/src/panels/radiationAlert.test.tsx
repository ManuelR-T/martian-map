// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Catalog, DataManifest } from '@marps/data';
import { PlannerProvider, usePlannerDispatch } from '../state/PlannerProvider';
import { MissionDatabase } from '../storage/missionDatabase';
import { StepsPanel } from './StepsPanel';

let root: Root;
let container: HTMLDivElement;
// Wildcat Ridge position from the data manifest; the camp is the « Jezero Beta » simulation camp.
const manifest = JSON.parse(readFileSync('apps/web/public/data/manifest.json', 'utf8')) as DataManifest;
const catalog: Catalog = { manifest, regions: [], datasets: [], sites: [{ id: 'wildcat', name: 'Wildcat Ridge', regionId: 'jezero', datasetId: 'test', coordinate: { longitude: 77.40588851, latitude: 18.45863707 }, elevation: null, sol: '1', date: 'test', sampleName: 'test', rockType: 'test' }] };
const Screen = () => {
  const dispatch = usePlannerDispatch();
  return <><button onClick={() => dispatch({ type: 'viewChanged', view: 'region' })}>Jezero</button>
    <button onClick={() => dispatch({ type: 'workspaceChanged', workspace: 'base' })}>À la base</button>
    <button onClick={() => dispatch({ type: 'workspaceChanged', workspace: 'mission' })}>En mission</button><StepsPanel /></>;
};
const button = (label: string) => [...container.querySelectorAll('button')].find(b => b.textContent === label);
const click = async (label: string) => {
  expect(button(label), label).toBeTruthy();
  await act(async () => { button(label)!.click(); });
};
const submit = async () => { await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }); };
const select = async (element: HTMLSelectElement, value: string) => {
  await act(async () => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })); });
};

beforeEach(async () => {
  vi.stubGlobal('indexedDB', new IDBFactory()); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => { root.render(<PlannerProvider load={async () => catalog}><Screen /></PlannerProvider>); });
  await act(async () => { await new MissionDatabase().camps(); });
  await click('Jezero');
  // Prepare and save a mission: Beta camp, one stop at Wildcat Ridge.
  await submit();
  await select(container.querySelectorAll('select')[0]!, 'sim-jezero-beta');
  await select(container.querySelectorAll('select')[1]!, 'wildcat');
  await click('Continuer : vérifier la mission');
  await submit();
  await act(async () => { await vi.waitFor(async () => expect(await new MissionDatabase().missions()).toHaveLength(1)); await new MissionDatabase().history(); });
});
// The saved list reloads from IndexedDB: its buttons stay disabled until the refresh ends.
const startSavedMission = async () => {
  await click('Missions enregistrées');
  await vi.waitFor(async () => { await act(async () => { await new MissionDatabase().missions(); }); expect(button('Démarrer cette mission')?.disabled).toBe(false); });
  await click('Démarrer cette mission');
  await act(async () => { await new MissionDatabase().activeMission(); await new MissionDatabase().history(); });
};
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('démarre une mission enregistrée sans repasser par l’assistant, même si une autre préparation est ouverte', async () => {
  await click('Préparer une autre mission');
  // A different draft: « Prélèvement d’échantillons ». Leaving it asks first; the test accepts.
  await select(container.querySelectorAll('select')[0]!, 'sampling');
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  await startSavedMission();
  expect(container.textContent).toContain('0 / 1 activités terminées');
  // Back at the base, « Préparer » shows the started mission, never a mix with the previous draft.
  await click('À la base');
  await click('Nouvelle mission');
  expect(container.querySelector<HTMLInputElement>('input[maxlength="120"]')!.value).toBe('Reconnaissance du terrain');
  expect(container.textContent).toContain('Nouvelle mission · Étape 1 sur 3');
});

it('affiche l’ordre de retour simulé depuis l’étape en cours, puis l’annule', async () => {
  await startSavedMission();
  await click('Simuler une alerte radiation');
  const alert = container.querySelector('[role="alert"]')!;
  expect(alert.textContent).toContain('Rentrer au camp maintenant');
  expect(alert.textContent).toContain('étape 1, Wildcat Ridge');
  // Wildcat Ridge → Jezero Beta camp is 102 m: at 0,5 m/s, 3,4 min rounded up to 4.
  expect(alert.textContent).toContain('102 m · 4 min');
  expect(alert.textContent).toContain('Wildcat Ridge (1 activité)');
  // Ticket: no personal dose or survival figure. The collapsed context only cites RAD's measurement at Gale.
  const visible = alert.textContent!.replace(alert.querySelector('details')!.textContent!, '');
  expect(visible).not.toMatch(/dose|survie|gray|sievert/i);
  expect(document.activeElement).toBe(alert);
  // The teammate checks the base, then comes back: the order is still there.
  await click('À la base');
  await click('En mission');
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('Rentrer au camp maintenant');
  await click('Annuler la simulation');
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(document.activeElement).toBe(button('Simuler une alerte radiation'));
});

it('termine la sortie : retour à la base, sortie gardée dans l’historique et plus restaurée au rechargement', async () => {
  await startSavedMission();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
  await click('Terminer la sortie');
  expect(confirm).toHaveBeenCalledWith('Terminer la sortie ? Il reste 1 activité non cochée.');
  expect(container.textContent).toContain('0 / 1 activités terminées');
  confirm.mockReturnValueOnce(true);
  await click('Terminer la sortie');
  expect(container.textContent).not.toContain('activités terminées');
  expect(button('Missions enregistrées')).toBeTruthy();
  await vi.waitFor(async () => { await act(async () => { expect(await new MissionDatabase().activeMission()).toBeNull(); }); });
  await act(async () => { expect(await new MissionDatabase().history()).toHaveLength(1); });
});

it('garde le suivi sauvegardé quand une nouvelle sortie remplace la précédente', async () => {
  await startSavedMission();
  const first = await act(async () => new MissionDatabase().activeMission());
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  await click('À la base');
  await startSavedMission();
  await vi.waitFor(async () => { await act(async () => {
    const active = await new MissionDatabase().activeMission();
    expect(active).not.toBeNull();
    expect(active!.id).not.toBe(first!.id);
  }); });
});
