import { expect, it } from 'vitest';
import { returnLimitFeatures } from './returnLimitLayer';
it('does not manufacture a frontier for missing data', () => {
  expect(returnLimitFeatures({ status: 'missing-inputs' }, null)).toEqual([]);
});

import { calculateMissionReturnLimit, createEmptyMission, MARS_RADIUS_METRES } from '@marps/mission-core';
it('renders the engine coordinates with distinct positive and exceeded patterns and a selectable threshold', () => {
  const mission = { ...createEmptyMission('test'), camp: { id: 'camp', name: 'Camp', regionId: 'test', position: { longitude: 0, latitude: 0 }, provenance: 'simulation' as const, note: '', referenceUrl: null }, steps: [{ id: 'visit', name: 'Visit', siteId: null, position: { longitude: 60 / MARS_RADIUS_METRES * 180 / Math.PI, latitude: 0 }, activities: [] }], parameters: { availableSeconds: 180, reserveSeconds: 60, speedMetresPerSecond: 1 } };
  const result = calculateMissionReturnLimit(mission);
  if (result.status !== 'ready') throw Error(result.status);
  const features = returnLimitFeatures(result, '0');
  expect(features.some(feature => feature.get('kind') === 'positive')).toBe(true);
  expect(features.some(feature => feature.get('kind') === 'reserve-reached')).toBe(true);
  const marker = features.find(feature => feature.get('returnEventId') === '0')!;
  expect((marker.getGeometry() as import('ol/geom/Point').default).getCoordinates()).toEqual([result.crossings[0]!.coordinate.longitude, result.crossings[0]!.coordinate.latitude]);
});
