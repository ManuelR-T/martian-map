import { describe, expect, it } from 'vitest';
import { findSiteSheet, type SiteSheet } from '@marps/data';
import { siteWorkOf, siteWorkReducer, summarizeStop, type SiteWorkState } from './siteWork';

const sheetOf = (siteId: string): SiteSheet => {
  const sheet = findSiteSheet(siteId);
  if (!sheet) throw new Error(`No sheet for ${siteId}`);
  return sheet;
};
const wildcat = sheetOf('wildcat-ridge');
const amalik = sheetOf('amalik');

describe('stop progress', () => {
  it('allots a stop the 75 min its four tasks need until the crew changes it', () => {
    const work = siteWorkOf({}, wildcat);
    expect(work).toEqual({ allottedMinutes: 75, doneTaskIds: [] });
    expect(summarizeStop(wildcat, work)).toEqual({ remainingTaskMinutes: 75, shortfallMinutes: 0 });
  });

  it('counts down the remaining task time as tasks are ticked, and back up when unticked', () => {
    let state: SiteWorkState = siteWorkReducer({}, { type: 'siteTaskToggled', sheet: wildcat, taskId: 'sample' });
    expect(summarizeStop(wildcat, siteWorkOf(state, wildcat)).remainingTaskMinutes).toBe(30);

    state = siteWorkReducer(state, { type: 'siteTaskToggled', sheet: wildcat, taskId: 'sample' });
    expect(summarizeStop(wildcat, siteWorkOf(state, wildcat)).remainingTaskMinutes).toBe(75);
  });

  it('warns how many minutes are missing when the crew allots less time than the tasks need', () => {
    const state = siteWorkReducer({}, { type: 'siteAllottedChanged', sheet: wildcat, minutes: 60 });
    expect(summarizeStop(wildcat, siteWorkOf(state, wildcat)).shortfallMinutes).toBe(15);
  });

  it('drops the warning once the tasks left fit in the allotted time', () => {
    let state = siteWorkReducer({}, { type: 'siteAllottedChanged', sheet: wildcat, minutes: 60 });
    state = siteWorkReducer(state, { type: 'siteTaskToggled', sheet: wildcat, taskId: 'sample' });
    expect(summarizeStop(wildcat, siteWorkOf(state, wildcat))).toEqual({ remainingTaskMinutes: 30, shortfallMinutes: 0 });
  });

  it('keeps each site its own progress when the crew switches between sites', () => {
    let state = siteWorkReducer({}, { type: 'siteTaskToggled', sheet: wildcat, taskId: 'describe' });
    state = siteWorkReducer(state, { type: 'siteAllottedChanged', sheet: amalik, minutes: 45 });

    expect(siteWorkOf(state, wildcat)).toEqual({ allottedMinutes: 75, doneTaskIds: ['describe'] });
    expect(siteWorkOf(state, amalik)).toEqual({ allottedMinutes: 45, doneTaskIds: [] });
  });
});
