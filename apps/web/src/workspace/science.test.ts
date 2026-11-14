import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type { DataManifest } from '@marps/data';
import { calculateBudget, validateMission } from '@marps/mission-core';
import { exampleMission } from './science';
const manifest = JSON.parse(
  readFileSync(
    new URL('../../public/data/manifest.json', import.meta.url),
    'utf8',
  ),
) as DataManifest;
it('construit un exemple depuis les positions du manifeste avec un camp explicitement fictif', () => {
  const m = exampleMission(manifest, 'example', 'Delta');
  expect(validateMission(m)).toBe(m);
  expect(m.steps).toHaveLength(3);
  m.steps.forEach((s) =>
    expect(s.position).toEqual(
      manifest.sites.find((site) => site.id === s.siteId)!.coordinate,
    ),
  );
  expect(calculateBudget(m)!.marginSeconds).toBeGreaterThan(0);
  expect(m.assumptions.join(' ')).toContain('camp fictif');
  expect(m.radiusMetres).toBe(manifest.planet.radiusMeters);
});
it('refuse de fabriquer des sites si le catalogue est incomplet', () => {
  expect(() =>
    exampleMission({ ...manifest, sites: [] }, 'example', 'Delta'),
  ).toThrow('incomplet');
});
