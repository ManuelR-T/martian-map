import { expect, it } from 'vitest';
import {
  calculateBudget,
  createEmptyMission,
  routeSegments,
} from '@marps/mission-core';
import { createMissionExport } from './export';
it('exporte le même budget et les événements, sans inventer une couche chargée', () => {
  const base = {
    ...createEmptyMission('jezero'),
    camp: { latitude: 0, longitude: 0 },
    steps: [
      {
        id: 'a',
        name: 'A',
        position: { latitude: 0, longitude: 0.01 },
        activities: [{ id: 'p', type: 'photo' as const, durationSeconds: 60 }],
      },
    ],
  };
  const m = {
    ...base,
    events: [
      { id: 'delay', type: 'delay' as const, activityId: 'p', seconds: 120 },
    ],
  };
  const exported = createMissionExport(m, null);
  expect(exported.budget).toEqual(calculateBudget(m));
  expect(exported.geometry).toEqual(routeSegments(m));
  expect(exported.simulatedEvents).toEqual(m.events);
  expect(exported.loadedMapLayers).toEqual([]);
  expect(exported.coverageWarnings).toContain('Catalogue indisponible.');
});
