import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DataManifest } from '@marps/data';
import { ThemisNightControl } from './ThemisNightControl';
import { findThemisNightDataset, themisNightDefaults } from './themisNight';

const manifest = JSON.parse(readFileSync('apps/web/public/data/manifest.json', 'utf8')) as DataManifest;
const dataset = findThemisNightDataset(manifest, 'jezero')!;
const render = (visible: boolean, opacity = themisNightDefaults.opacity) =>
  renderToStaticMarkup(<ThemisNightControl dataset={dataset} settings={{ visible, opacity }} onChange={() => {}} />);
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ');

describe('ThemisNightControl', () => {
  it('shows only the switch while the layer is off', () => {
    const html = render(false);
    expect(text(html)).toContain('Infrarouge de nuit');
    expect(html).toMatch(/role="switch"[^>]*aria-checked="false"|aria-checked="false"[^>]*role="switch"/);
    expect(html).not.toContain('type="range"');
  });

  it('names the mission, the sampling and the date, and how to read the greys', () => {
    const shown = text(render(true));
    expect(shown).toContain('Mars Odyssey · THEMIS · 100 m/pixel');
    expect(shown).toContain('Mosaïque de 2018');
    expect(shown).toContain('Sombre : sable, poussière');
    expect(shown).toContain('Clair : roche, sol dur');
    expect(shown).toContain('Contraste, pas une température.');
  });

  it('never presents the greys as a temperature value', () => {
    const shown = text(render(true));
    expect(shown).not.toMatch(/°|degré|Celsius|Kelvin|\d\s*K\b/i);
  });

  it('shows the opacity the astronaut chose', () => {
    const html = render(true, 0.3);
    expect(text(html)).toContain('30 %');
    expect(html).toMatch(/type="range"[^>]*value="30"|value="30"[^>]*type="range"/);
  });
});
