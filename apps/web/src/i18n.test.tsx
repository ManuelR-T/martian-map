// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { localize, ProvenanceBadge } from '@marps/ui';
import { findSiteSheet } from '@marps/data';
import { missionTypes } from '@marps/mission-core';
import { roverMessages } from './features/map/RoverHistoryControl';
import i18n, { detectLanguage, LANGUAGE_KEY, setLanguage } from './i18n';
import { LanguageSelector } from './LanguageSelector';
import { formatCoordinate, formatLmst, formatMonthYear } from './format';
import fr from './locales/fr.json';
import en from './locales/en.json';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(async () => { localStorage.clear(); await i18n.changeLanguage('fr'); });

it('detects browser languages, persists an explicit preference and falls back to French', () => {
  expect(detectLanguage(undefined, ['en-GB', 'fr'])).toBe('en');
  expect(detectLanguage(undefined, ['fr-CA', 'en'])).toBe('fr');
  expect(detectLanguage(undefined, ['de'])).toBe('fr');
  expect(detectLanguage({ getItem: () => 'fr' }, ['en'])).toBe('fr');
  expect(detectLanguage({ getItem: () => { throw new Error('denied'); } }, ['en'])).toBe('en');
});

it('switches through the accessible header selector without a network request', async () => {
  const host = document.createElement('div');
  const root = createRoot(host);
  await act(async () => { root.render(<LanguageSelector />); });
  const french = host.querySelector<HTMLButtonElement>('button[lang=fr]')!;
  const english = host.querySelector<HTMLButtonElement>('button[lang=en]')!;
  expect(french.getAttribute('aria-pressed')).toBe('true');
  expect(english.getAttribute('aria-pressed')).toBe('false');
  await act(async () => { english.click(); });
  expect(english.getAttribute('aria-pressed')).toBe('true');
  expect(french.getAttribute('aria-pressed')).toBe('false');
  expect(i18n.language).toBe('en');
  expect(document.documentElement.lang).toBe('en');
  expect(localStorage.getItem(LANGUAGE_KEY)).toBe('en');
  expect(host.querySelector('[role=group]')?.getAttribute('aria-label')).toBe('Language');
  expect(localize('Calques')).toBe('Layers');
  expect(localize('Marps')).toBe('Marps');
  await act(async () => { root.unmount(); });
});

it('localizes coordinates, dates, times, scientific sheets and accessibility labels', async () => {
  setLanguage('en');
  expect(formatCoordinate({ latitude: -4.5, longitude: -137.4 })).toBe('4.50° S, 137.40° W');
  expect(formatMonthYear('2022-07-16T22:18:04Z')).toBe('July 2022');
  expect(formatLmst('14:20:31')).toBe('14:20');
  expect(localize(0.5)).toBe('0.5');
  expect(renderToStaticMarkup(<ProvenanceBadge status="measured" />)).toContain('Measured');
  const sheet = findSiteSheet('amalik')!;
  expect(localize(sheet.objective)).not.toBe(sheet.objective);
  expect(localize('Reste {{v0}} min', { v0: 12 })).toContain('12');
  const savedStatus = localize('Reste {{v0}} min', { v0: 12 });
  setLanguage('fr');
  expect(localize(savedStatus)).toBe('Reste 12 min');
  expect(formatCoordinate({ latitude: -4.5, longitude: -137.4 })).toBe('4,50° S, 137,40° O');
  expect(localize('Calques')).toBe('Calques');
  expect(localize(0.5)).toBe('0,5');
});

it('pluralizes counts, reads time ranges and names objectives and tasks in both languages', () => {
  setLanguage('en');
  expect(localize('{{count}} activité', { count: 1 })).toBe('1 activity');
  expect(localize('{{count}} activité', { count: 3 })).toBe('3 activities');
  expect(localize('Terminer la sortie ? Il reste {{count}} activité non cochée.', { count: 2 })).toBe('End the outing? 2 activities are still unchecked.');
  expect(localize('{{count}} camp enregistré', { count: 1 })).toBe('1 saved camp');
  const many = localize('{{count}} camp enregistré', { count: 2 });
  expect(many).toBe('2 saved camps');
  expect(localize('Mesuré de {{v0}} à {{v1}}.', { v0: formatLmst('12:00:04'), v1: formatLmst('12:20:31') })).toBe('Measured from 12:00 to 12:20.');
  expect(localize(missionTypes.observation)).toBe('Scientific observation');
  expect(localize(missionTypes.reconnaissance)).toBe('Field reconnaissance');
  expect(localize(findSiteSheet('amalik')!.tasks.map(task => task.label))).toEqual(['Describe the rock', 'Context photo', 'Close-up photos', 'Sampling']);
  expect(localize('capteur ATS1, sur le mât à 1,45 m du sol')).toBe('ATS1 sensor, on the mast 1.45 m above the ground');
  setLanguage('fr');
  expect(localize('{{count}} activité', { count: 1 })).toBe('1 activité');
  expect(localize('{{count}} activité', { count: 3 })).toBe('3 activités');
  expect(localize('Terminer la sortie ? Il reste {{count}} activité non cochée.', { count: 1 })).toBe('Terminer la sortie ? Il reste 1 activité non cochée.');
  expect(localize(many)).toBe('2 camps enregistrés');
  expect(localize('Mesuré de {{v0}} à {{v1}}.', { v0: '12:00', v1: '12:20' })).toBe('Mesuré de 12:00 à 12:20.');
  expect(localize(missionTypes.observation)).toBe('Observation scientifique');
});

it('translates French labels without accents, which the coverage scan misses', () => {
  setLanguage('en');
  expect(localize('Suivi')).toBe('Tracking');
  expect(localize(roverMessages.fr.toggle)).toBe('Perseverance history');
  expect(localize('Suivi invalide.')).toBe('Invalid tracking.');
  setLanguage('fr');
  expect(localize('Suivi')).toBe('Suivi');
  expect(localize(roverMessages.fr.toggle)).toBe('Historique de Perseverance');
});

it('requires matching, nonempty bilingual entries with identical interpolation variables', () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  for (const [key, value] of Object.entries(fr)) {
    const translated = (en as Record<string, string>)[key];
    expect(translated, key).toBeTruthy();
    expect(translated?.match(/{{\w+}}/g)?.sort() ?? [], key).toEqual(value.match(/{{\w+}}/g)?.sort() ?? []);
  }
});

it('requires translations for French source text, including prepared data and site sheets', () => {
  const catalog = fr as Record<string, string>;
  function scan(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) { if (entry.name !== 'locales') scan(path); continue; }
      if (!/\.(tsx?|json)$/.test(path) || path.includes('.test.') || path.endsWith('/i18n.ts')) continue;
      const content = readFileSync(path, 'utf8');
      const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true,
        path.endsWith('.tsx') ? ts.ScriptKind.TSX : path.endsWith('.json') ? ts.ScriptKind.JSON : ts.ScriptKind.TS);
      function visit(node: ts.Node) {
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
          const text = node.text;
          if (/[éèêàçùôîÉÀœ]/.test(text) && !/^https?:|^\.\.?\//.test(text)) {
            // A pluralized message exists only under its `_one` / `_other` keys.
            expect(catalog[text] ?? catalog[`${text}_one`], `${path}: ${text}`).toBeDefined();
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
  scan('apps/web/src'); scan('apps/web/public'); scan('packages/data/src'); scan('packages/ui/src');
});
