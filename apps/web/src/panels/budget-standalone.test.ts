import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createEmptyMission } from '@marps/mission-core';
import { BudgetPanel } from './MissionBudgetPanel';
const { state } = vi.hoisted(() => ({
  state: {
    mission: null as unknown,
    view: 'global',
    catalog: { status: 'loading' },
  },
}));
vi.mock('../state/PlannerProvider', () => ({
  usePlannerState: () => state,
  usePlannerDispatch: () => () => {},
}));
it('affiche le budget du plan sauvegardé indépendamment de la vue globale et du chargement du catalogue', () => {
  state.mission = {
    ...createEmptyMission('jezero'),
    camp: { latitude: 0, longitude: 0 },
    steps: [
      {
        id: 'a',
        name: 'A',
        position: { latitude: 0, longitude: 0 },
        activities: [{ id: 'p', type: 'photo', durationSeconds: 60 }],
      },
    ],
  };
  const html = renderToStaticMarkup(
    createElement(BudgetPanel, { standalone: true }),
  );
  expect(html).toContain('Budget respecté');
  expect(html).toContain('299 min');
  expect(html).not.toContain('Chargement du budget');
});
