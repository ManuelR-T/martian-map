import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createEmptyMission } from '@marps/mission-core';
import { createMissionExport } from '../export';
import { PrintMission } from './MissionUtilities';
import { BudgetPanel } from './MissionBudgetPanel';
const { state } = vi.hoisted(() => ({
  state: { mission: null as unknown, catalog: { status: 'loading' } },
}));
vi.mock('../state/PlannerProvider', () => ({
  usePlannerState: () => state,
  usePlannerDispatch: () => () => {},
}));
vi.mock('./PlanningGate', () => ({
  PlanningGate: ({ children }: { children: ReactNode }) => children,
}));
it('affiche et imprime les chiffres exportés après un retard simulé', () => {
  const mission = {
    ...createEmptyMission('jezero'),
    camp: { latitude: 0, longitude: 0 },
    steps: [
      {
        id: 'a',
        name: 'Station A',
        position: { latitude: 0, longitude: 0 },
        activities: [{ id: 'p', type: 'photo' as const, durationSeconds: 60 }],
      },
    ],
    events: [
      { id: 'd', type: 'delay' as const, activityId: 'p', seconds: 120 },
    ],
  };
  state.mission = mission;
  const exported = createMissionExport(mission, null);
  expect(exported.budget!.activitySeconds / 60).toBe(3);
  expect(exported.budget!.marginSeconds / 60).toBe(297);
  const panel = renderToStaticMarkup(createElement(BudgetPanel));
  const printed = renderToStaticMarkup(createElement(PrintMission));
  expect(panel).toContain('3 min');
  expect(panel).toContain('297 min');
  expect(printed).toContain('3.0');
  expect(printed).toContain('297.0');
  expect(printed).toContain('Station A');
  expect(printed).toContain('Retard de 2 min');
});
