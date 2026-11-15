import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { setLanguage } from '../i18n';
import { ReturnLimitDetails } from './ReturnLimitSummary';
import { calculateMissionReturnLimit, createEmptyMission } from '@marps/mission-core';
it('shows missing input as indeterminate rather than a positive margin', () => {
  setLanguage('en');
  const html = renderToStaticMarkup(<ReturnLimitDetails result={calculateMissionReturnLimit(createEmptyMission('test'))} />);
  expect(html).toContain('Indeterminate');
  expect(html).not.toContain('All margins positive');
  setLanguage('fr');
});

import { returnLimitStatus } from './ReturnLimitSummary';
import type { MissionReturnLimit, ReturnPoint } from '@marps/mission-core';
const start: ReturnPoint = { coordinate: { longitude: 0, latitude: 0 }, distanceMetres: 0, elapsedSeconds: 0, timeMarginSeconds: 1, oxygenMarginGrams: null, state: 'positive', legIndex: 0, stepId: null, activityId: null, activityOffsetSeconds: 0 };
const result: Extract<MissionReturnLimit, { status: 'ready' }> = { status: 'ready', initial: start, portions: [], crossings: [], indeterminate: false, oxygenEnabled: false, flatTerrain: false, spacingMetres: null };
it('distinguishes all positive, initially exhausted and unknown timelines', () => {
  expect(returnLimitStatus(result)).toBe('All margins positive');
  expect(returnLimitStatus({ ...result, initial: { ...start, state: 'reserve-reached' } })).toBe('Reserve reached at departure');
  expect(returnLimitStatus({ ...result, indeterminate: true })).toBe('Indeterminate');
});
it('does not let a later terrain gap discredit an established earlier first crossing', () => {
  const crossing = { ...start, id: '0', constraints: ['time'] as const, direction: 'entry' as const, bracketMetres: 10, firstCertain: true };
  expect(returnLimitStatus({ ...result, indeterminate: true, crossings: [crossing] })).toBe('Return reserve reached');
  expect(returnLimitStatus({ ...result, indeterminate: true, crossings: [{ ...crossing, firstCertain: false }] })).toBe('Known limit; earlier O₂ uncertain');
});
