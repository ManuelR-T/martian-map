import { expect, it } from 'vitest';
import { createRoverLayers, roverLabel } from './roverLayer';
import type { RoverHistory } from '@marps/data';
it('keeps disconnected published segments separate and strips only elevation for display', () => {
  const history: RoverHistory = { retrievedAt: '', issues: 0, features: [
    { type: 'Feature', properties: { sol: 501, fromRMC: 'a', toRMC: 'b' }, geometry: { type: 'LineString', coordinates: [[77.4, 18.45, -2], [77.41, 18.46, -3]] } },
    { type: 'Feature', properties: { sol: 501, RMC: 'other' }, geometry: { type: 'Point', coordinates: [77.42, 18.47, -4] } },
  ] };
  const features = createRoverLayers(history).getSource()!.getFeatures();
  expect(features).toHaveLength(2);
  expect(features[0]!.getGeometry()!.getType()).toBe('LineString');
  expect(features[1]!.getGeometry()!.getType()).toBe('Point');
  expect(features.map(f => f.get('roverIndex'))).toEqual([0, 1]);
  expect(roverLabel(history.features[0]!)).toBe('Sol 501 · a → b');
  expect(history.features[0]!.geometry.coordinates[0]).toEqual([77.4, 18.45, -2]);
});
