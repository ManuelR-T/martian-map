import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  STOP_MINUTES_CHOICES,
  findScienceSource,
  plannedTaskMinutes,
  siteSheets,
  type DataManifest,
} from './index';

const committed = JSON.parse(
  readFileSync(new URL('../../../apps/web/public/data/manifest.json', import.meta.url), 'utf8'),
) as DataManifest;

describe('site sheets', () => {
  it('gives each site of the manifest exactly one sheet, and no sheet to an unknown site', () => {
    const siteIds = committed.sites.map((site) => site.id).sort();
    const sheetIds = siteSheets.map((sheet) => sheet.siteId).sort();
    expect(sheetIds).toEqual(siteIds);
  });

  it('backs the objective, the rover work, the photo and the task procedure with a known source', () => {
    for (const sheet of siteSheets) {
      const sourceIds = [...sheet.objectiveSourceIds, sheet.roverWork.sourceId, sheet.photo.sourceId, sheet.tasksSourceId];
      expect(sheet.objectiveSourceIds.length, sheet.siteId).toBeGreaterThan(0);
      for (const sourceId of sourceIds) expect(findScienceSource(sourceId), sheet.siteId).toBeDefined();
    }
  });

  it('never presents organic molecules as proof of life', () => {
    for (const sheet of siteSheets) {
      const text = [sheet.question, sheet.objective, sheet.roverWork.text, sheet.photo.caption, ...sheet.tasks.map((task) => task.label)]
        .join(' ')
        .toLowerCase();
      expect(text).not.toMatch(/preuve|prouv|démontr|confirm|certain|\bvie\b/);
    }
  });

  it('ships every photo with the app, credited, so it shows offline', () => {
    for (const { siteId, photo } of siteSheets) {
      expect(existsSync(new URL(`../../../apps/web/public/${photo.path}`, import.meta.url)), siteId).toBe(true);
      expect(photo.credit).not.toBe('');
    }
  });

  it('offers the time the tasks need as a choice of the stop time selector', () => {
    // Otherwise the selector would show a time that is not the one allotted.
    for (const sheet of siteSheets) {
      expect(STOP_MINUTES_CHOICES).toContain(plannedTaskMinutes(sheet));
    }
  });

  it('lets the crew allot the demo stops: 75 min planned, 125 min with a second sample, 30 min cut down', () => {
    // A real geology stop lasts about an hour (Apollo 17 planned 30 to 66 min); the demo needs more than 60 min.
    const amalik = siteSheets.find((sheet) => sheet.siteId === 'amalik');
    expect(amalik && plannedTaskMinutes(amalik)).toBe(75);
    for (const minutes of [30, 75, 125]) expect(STOP_MINUTES_CHOICES).toContain(minutes);
  });

  it('gives every task a unique id within its stop, so ticking one never ticks another', () => {
    for (const sheet of siteSheets) {
      const ids = sheet.tasks.map((task) => task.id);
      expect(new Set(ids).size, sheet.siteId).toBe(ids.length);
    }
  });
});
