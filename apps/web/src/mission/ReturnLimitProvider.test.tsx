// @vitest-environment jsdom
import { act, useEffect, type Dispatch } from 'react';
import { createRoot } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { detailedRegions, exampleCamps, type Catalog, type DataManifest } from '@marps/data';
import { createEmptyMission } from '@marps/mission-core';
import { PlannerProvider, usePlannerDispatch } from '../state/PlannerProvider';
import type { PlannerAction } from '../state/planner';
import { ReturnLimitProvider, useReturnLimit } from './ReturnLimitProvider';
const manifest = JSON.parse(readFileSync('apps/web/public/data/manifest.json', 'utf8')) as DataManifest;
const catalog: Catalog = { manifest, regions: detailedRegions(manifest.regions), datasets: manifest.datasets, sites: manifest.sites, coverage: manifest.regions };
it('shares recomputed margins, hides invalid combined edits, and isolates time-only mode', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.stubGlobal('indexedDB', new IDBFactory()); localStorage.clear();
  let dispatch: Dispatch<PlannerAction> = () => {};
  let shared: ReturnType<typeof useReturnLimit> = null;
  function Read() { const send = usePlannerDispatch(); shared = useReturnLimit(); useEffect(() => { dispatch = send; }, [send]); return null; }
  const host = document.createElement('div'); const root = createRoot(host);
  const send = async (action: PlannerAction) => { await act(async () => { dispatch(action); }); };
  try {
    await act(async () => { root.render(<PlannerProvider load={async () => catalog}><ReturnLimitProvider><Read /></ReturnLimitProvider></PlannerProvider>); });
    await send({ type: 'viewChanged', view: 'region' });
    const mission = { ...createEmptyMission('jezero'), camp: exampleCamps[0]!, steps: [{ id: 'visit', name: 'Visit', position: exampleCamps[0]!.position, siteId: null, activities: [{ id: 'photo', type: 'photo' as const, durationMinutes: 5, completed: false }] }] };
    await send({ type: 'missionOpened', mission });
    const current = () => shared as ReturnType<typeof useReturnLimit>;
    expect(current()?.result.status).toBe('ready');
    await send({ type: 'oxygenParameterDraftValidityChanged', valid: false });
    expect(current()?.result.status).toBe('ready');
    await send({ type: 'parametersChanged', parameters: { ...mission.parameters, returnLimitMode: 'time-and-oxygen' } });
    expect(current()?.result.status).toBe('invalid-inputs');
    await send({ type: 'oxygenParameterDraftValidityChanged', valid: true });
    expect(current()?.result.status).toBe('ready');
    await send({ type: 'parameterDraftValidityChanged', valid: false });
    expect(current()?.result.status).toBe('invalid-inputs');
    await send({ type: 'missionOpened', mission });
    expect(current()?.result.status).toBe('ready');
    await send({ type: 'viewChanged', view: 'global' });
    expect(current()?.result.status).toBe('missing-inputs');
  } finally { await act(async () => root.unmount()); vi.unstubAllGlobals(); localStorage.clear(); }
});
