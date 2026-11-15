import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { findGeologyDataset, type DataManifest } from '@marps/data';
import { GeologyControl } from './GeologyControl';
import { createGeologyLayer, geologyDefaults } from './geologyLayer';

const manifest = JSON.parse(readFileSync('apps/web/public/data/manifest.json', 'utf8')) as DataManifest;
const dataset = findGeologyDataset(manifest, 'jezero')!;
const render = (visible: boolean) => renderToStaticMarkup(<GeologyControl dataset={dataset} sites={manifest.sites} settings={{ ...geologyDefaults, visible }}
  onChange={() => undefined} loading={false} failed={false} onRetry={() => undefined} />);
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ');

describe('GeologyControl', () => {
  it('stays a single switch while hidden', () => {
    expect(text(render(false))).not.toContain('Sun');
  });

  it('shows the legend, the interpretive nature, the offset and the credits', () => {
    const shown = text(render(true));
    expect(shown).toContain('Carte interprétative, pas une mesure.');
    for (const unit of dataset.geology.units) expect(shown).toContain(unit.symbol);
    expect(shown).toContain('100 à 200 m');
    expect(shown).toContain('Vivian Sun, Kathryn Stack');
    expect(shown).toContain('2020');
    expect(shown).toMatch(/1:75\s000/);
    expect(render(true)).toContain(dataset.geology.recordUrl);
  });

  it('lists every candidate unit instead of picking one for an ambiguous stop', () => {
    const shown = text(render(true));
    for (const entry of dataset.geology.sites.filter(item => item.assignedSymbol === null)) {
      const name = manifest.sites.find(site => site.id === entry.siteId)!.name;
      expect(shown).toContain(`${name}: indéterminée, à moins de 200 m de ${entry.candidates.map(c => c.symbol).join(', ')}`);
    }
  });

  it('draws one coloured feature per unit, hidden until asked for', () => {
    const layer = createGeologyLayer(dataset, [{ symbol: 'Njf', polygons: [[[[77.4, 18.45], [77.41, 18.45], [77.41, 18.46], [77.4, 18.45]]]] }]);
    expect(layer.getVisible()).toBe(false);
    expect(layer.getZIndex()).toBe(1);
    const [feature] = layer.getSource()!.getFeatures();
    expect(feature!.get('geologicUnit')).toBe('Njf');
  });
});
