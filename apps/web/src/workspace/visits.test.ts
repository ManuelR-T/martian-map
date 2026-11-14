import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import {
  findSiteSheet,
  plannedTaskMinutes,
  type DataManifest,
} from '@marps/data';
import { createEmptyMission, calculateBudget } from '@marps/mission-core';
import { addCatalogVisit } from './visits';
const manifest = JSON.parse(
  readFileSync(
    new URL('../../public/data/manifest.json', import.meta.url),
    'utf8',
  ),
) as DataManifest;
it('reprend les tâches et le temps de la fiche dev, avec une référence unique', () => {
  const sheet = findSiteSheet('skinner-ridge')!;
  const base = createEmptyMission('jezero');
  const a = addCatalogVisit(base, manifest, sheet.siteId, 'visit1');
  expect(
    a.steps[0]!.activities.reduce((n, a) => n + a.durationSeconds, 0),
  ).toBe(plannedTaskMinutes(sheet) * 60);
  const b = addCatalogVisit(a, manifest, sheet.siteId, 'visit2', 45);
  expect(
    b.steps[1]!.activities.reduce((n, a) => n + a.durationSeconds, 0),
  ).toBe(45 * 60);
  expect(b.steps[0]!.activities[0]!.id).not.toBe(b.steps[1]!.activities[0]!.id);
  expect(b.dataReferences).toHaveLength(1);
  expect(b.steps[1]!.position).toEqual(
    manifest.sites.find((s) => s.id === sheet.siteId)!.coordinate,
  );
  expect(
    calculateBudget({ ...b, camp: b.steps[0]!.position })!.activitySeconds,
  ).toBe((plannedTaskMinutes(sheet) + 45) * 60);
});
it('refuse un temps non fini ou négatif et un site absent sans inventer de données', () => {
  for (const minutes of [-1, NaN, Infinity])
    expect(() =>
      addCatalogVisit(
        createEmptyMission('jezero'),
        manifest,
        'skinner-ridge',
        'x',
        minutes,
      ),
    ).toThrow();
  expect(() =>
    addCatalogVisit(createEmptyMission('jezero'), manifest, 'absent', 'x'),
  ).toThrow();
});
