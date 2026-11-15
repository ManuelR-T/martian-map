// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, useEffect, type Dispatch } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { createEmptyMission, type Mission } from '@marps/mission-core';
import { exampleCamps, regions, type Catalog, type DataManifest } from '@marps/data';
import { PlannerProvider, usePlannerDispatch, usePlannerState } from './PlannerProvider';
import type { PlannerAction, PlannerState } from './planner';
import { MissionDatabase } from '../storage/missionDatabase';
import { loadMissionDraft, MISSION_DRAFT_KEY, saveMissionDraft } from '../storage/missionDraft';
import { StepsPanel } from '../panels/StepsPanel';

const manifest = JSON.parse(readFileSync(resolve(fileURLToPath(import.meta.url), '../../../public/data/manifest.json'), 'utf8')) as DataManifest;
const catalog: Catalog = { manifest, regions, sites: manifest.sites, datasets: manifest.datasets, coverage: manifest.regions };
const site = manifest.sites[0]!;
const prepared: Mission = { ...createEmptyMission('jezero', 'prepared'), name: 'Sortie locale', camp: exampleCamps[0]!,
  steps: [{ id: 'stop', name: site.name, position: site.coordinate, siteId: site.id,
    activities: [{ id: 'photo', type: 'photo', durationMinutes: 20, completed: true }] }],
  siteWork: { [site.id]: { allottedMinutes: 35, doneTaskIds: ['photo'] } } };
let root: Root;
let container: HTMLDivElement;
let current: PlannerState;
let dispatch: Dispatch<PlannerAction>;
const load = async () => catalog;
function Screen() {
  const state = usePlannerState(); const send = usePlannerDispatch();
  useEffect(() => { current = state; dispatch = send; }, [state, send]);
  return <StepsPanel />;
}
async function mount() {
  root = createRoot(container);
  await act(async () => { root.render(<PlannerProvider load={load}><Screen /></PlannerProvider>); });
  await settle();
}
async function settle() {
  await act(async () => { await new MissionDatabase().activeMission(); await new MissionDatabase().history(); });
}
async function send(action: PlannerAction) { await act(async () => { dispatch(action); }); }
async function click(label: string) {
  const button = [...container.querySelectorAll('button')].find(b => b.textContent === label);
  expect(button, label).toBeTruthy();
  await act(async () => { button!.click(); });
}
beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal('indexedDB', new IDBFactory()); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div'); document.body.append(container);
});
afterEach(async () => {
  await act(async () => root?.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

it('restaure la préparation et le suivi indépendamment après rechargement, avec leurs activités et sources', async () => {
  await mount();
  await send({ type: 'viewChanged', view: 'region' });
  await send({ type: 'missionOpened', mission: prepared });
  await send({ type: 'missionStarted', id: 'run' });
  await send({ type: 'activityToggled', stepId: 'stop', activityId: 'photo' });
  await settle();
  const running = current.runningMission;
  const savedDraft = loadMissionDraft();
  expect(savedDraft?.dataReferences?.length).toBeGreaterThan(0);
  const history = await new MissionDatabase().history();
  await act(async () => root.unmount());
  await mount();
  expect(current.mission).toEqual(savedDraft);
  expect(current.runningMission).toEqual(running);
  expect(current.runningMission?.steps[0]?.activities[0]?.completed).toBe(true);
  expect(await new MissionDatabase().history()).toEqual(history);
});

it('préserve une préparation corrompue jusqu’à confirmation de la réinitialisation, sans effacer le catalogue ou le suivi', async () => {
  window.localStorage.setItem(MISSION_DRAFT_KEY, '{corrupt');
  const db = new MissionDatabase();
  await db.saveMission(prepared); await db.saveActiveMission({ ...prepared, id: 'run' });
  await mount();
  await send({ type: 'viewChanged', view: 'region' });
  expect(container.textContent).toContain('préparation locale est endommagée');
  expect(window.localStorage.getItem(MISSION_DRAFT_KEY)).toBe('{corrupt');
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  await click('Réinitialiser la préparation');
  expect(window.localStorage.getItem(MISSION_DRAFT_KEY)).toBe('{corrupt');
  confirm.mockReturnValue(true);
  await click('Réinitialiser la préparation');
  expect(current.draftError).toBeNull();
  expect(loadMissionDraft()?.steps).toEqual([]);
  expect(await db.missions()).toEqual([prepared]);
  expect((await db.activeMission())?.id).toBe('run');
  expect(await db.history()).toHaveLength(1);
});

it('signale un site disparu et garde la sauvegarde sans substitution silencieuse', async () => {
  const unknown = { ...prepared, steps: [{ ...prepared.steps[0]!, siteId: 'site-disparu' }] };
  saveMissionDraft(unknown);
  const raw = window.localStorage.getItem(MISSION_DRAFT_KEY);
  await new MissionDatabase().saveActiveMission(unknown);
  await mount();
  expect(current.draftError).toContain('site manquant');
  expect(current.trackingError).toContain('site manquant');
  expect(current.trackingReady).toBe(false);
  expect(current.runningMission).toBeNull();
  expect(window.localStorage.getItem(MISSION_DRAFT_KEY)).toBe(raw);
  expect(await new MissionDatabase().activeMission()).toEqual(unknown);
});

it('reste utilisable si localStorage refuse la lecture et conserve le suivi IndexedDB', async () => {
  await new MissionDatabase().saveActiveMission(prepared);
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Stockage refusé', 'SecurityError'); });
  await mount();
  await send({ type: 'viewChanged', view: 'region' });
  expect(current.draftError).toContain('Impossible de restaurer');
  expect(current.runningMission).toEqual(prepared);
  expect(container.textContent).toContain('Réinitialiser la préparation');
});

it('signale un quota localStorage dépassé et réessaie à la modification suivante', async () => {
  const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota dépassé', 'QuotaExceededError'); });
  await mount();
  expect(current.draftStatus).toContain('Échec de la sauvegarde');
  set.mockRestore();
  await send({ type: 'viewChanged', view: 'region' });
  await send({ type: 'missionOpened', mission: prepared });
  expect(loadMissionDraft()?.name).toBe(prepared.name);
  expect(current.draftStatus).toContain('enregistrée');
});

it('affiche une erreur et permet de réessayer si IndexedDB est absent au démarrage', async () => {
  vi.stubGlobal('indexedDB', undefined);
  root = createRoot(container);
  await act(async () => { root.render(<PlannerProvider load={load}><Screen /></PlannerProvider>); });
  await send({ type: 'viewChanged', view: 'region' });
  expect(current.trackingError).toContain('Impossible de restaurer le suivi local');
  expect(current.trackingReady).toBe(false);
  vi.stubGlobal('indexedDB', new IDBFactory());
  await click('Réessayer le chargement du suivi');
  await settle();
  expect(current.trackingReady).toBe(true);
  expect(current.trackingError).toBeNull();
});
