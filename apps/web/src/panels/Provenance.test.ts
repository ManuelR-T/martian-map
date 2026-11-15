import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { findSiteSheet, type DataManifest } from '@marps/data';
import { DatasetProvenance, RegionCapabilities, SitePositionProvenance, SiteScienceProvenance } from './Provenance';
import { MissionAssumptions } from './MissionAssumptions';
import { initialPlannerState, selectMissionAssumptions } from '../state/planner';

const manifest = JSON.parse(readFileSync(new URL('../../public/data/manifest.json', import.meta.url), 'utf8')) as DataManifest;
const dataset = manifest.datasets.find((candidate) => candidate.id === 'jezero-hirise-dem')!;
const site = manifest.sites.find((candidate) => candidate.id === 'wildcat-ridge')!;
const sitesDataset = manifest.datasets.find((candidate) => candidate.id === site.datasetId)!;

describe('contextual provenance displays', () => {
  it('exposes the complete manifest metadata and terrain resolution limits', () => {
    const html = renderToStaticMarkup(createElement(DatasetProvenance, { dataset }));
    for (const value of [dataset.instrument, dataset.version, dataset.source.url, dataset.source.retrievedAt]) expect(html).toContain(value);
    for (const field of ['Date / sol', 'Date inconnue', 'Sol inconnu', 'Unités', 'Résolution de la source', 'Emprise', 'Version']) expect(html).toContain(field);
    for (const value of Object.values(dataset.extent)) expect(html).toContain(value.toLocaleString('fr', { maximumFractionDigits: 20 }));
    expect(html).toContain('data-status="calculated"');
    expect(html).toContain('Maille du relief');
    expect(html).toContain('4 m');
    expect(html).toContain('pas une précision de navigation');
    expect(html).toContain('obstacles plus petits ne sont pas résolus');
  });

  it('distinguishes source sampling from the frozen imagery resolution and simulated hillshade', () => {
    const imagery = manifest.datasets.find((candidate) => candidate.kind === 'imagery')!;
    const imageHtml = renderToStaticMarkup(createElement(DatasetProvenance, { dataset: imagery }));
    expect(imageHtml).toContain('0.25 m/pixel');
    expect(imageHtml).toContain('0,64 m/pixel');
    const hillshade = manifest.datasets.find((candidate) => candidate.kind === 'hillshade')!;
    const shadeHtml = renderToStaticMarkup(createElement(DatasetProvenance, { dataset: hillshade, datasets: manifest.datasets }));
    expect(shadeHtml).toContain('data-status="simulated"');
    expect(shadeHtml).toContain(dataset.title);
    expect(shadeHtml).toContain('Éclairage fictif');
  });

  it('keeps an absent resolution unknown rather than calling a raster vector data', () => {
    const html = renderToStaticMarkup(createElement(DatasetProvenance, { dataset: { ...dataset, resolution: null, status: 'unavailable' } }));
    expect(html).toContain('data-status="unknown"');
    expect(html).toContain('Résolution de la source</dt><dd>Inconnue');
    expect(html).not.toContain('données vectorielles');
  });

  it('shows actual site dates and sols, and keeps missing altitude and datum unknown', () => {
    const html = renderToStaticMarkup(createElement(SitePositionProvenance, { site, dataset: sitesDataset }));
    expect(html).toContain('509 &amp; 516');
    expect(html).toContain(String(site.coordinate.longitude));
    expect(html).toContain('Référence verticale : inconnue');
    const missing = renderToStaticMarkup(createElement(SitePositionProvenance, { site: { ...site, elevation: null }, dataset: sitesDataset }));
    expect(missing).toContain('data-status="unknown"');
    expect(missing).toContain('inconnue / indisponible');
    expect(missing).not.toContain('0 m');
    const noSource = renderToStaticMarkup(createElement(SitePositionProvenance, { site, dataset: undefined }));
    expect(noSource).not.toContain('data-status="measured"');
    expect(noSource).not.toContain(String(site.elevation!.value));
  });

  it('links each selected site to its own scientific, photographic and procedure references', () => {
    const wildcat = renderToStaticMarkup(createElement(SiteScienceProvenance, { sheet: findSiteSheet('wildcat-ridge') }));
    const amalik = renderToStaticMarkup(createElement(SiteScienceProvenance, { sheet: findSiteSheet('amalik') }));
    expect(wildcat).toContain('nasas-perseverance-rover-investigates-geologically-rich-mars-terrain');
    expect(amalik).toContain('meet-the-mars-samples-shuyak-and-mageik');
    expect(amalik).not.toContain('nasas-perseverance-rover-investigates-geologically-rich-mars-terrain');
    expect(wildcat).toContain('documentation-and-environment-apollo-17-samples');
    expect(wildcat).toContain(findSiteSheet('wildcat-ridge')!.photo.originalUrl);
    expect(wildcat).toContain('aucune durée de travail humain sur Mars mesurée');
    expect(wildcat).toContain('Publication : date inconnue');
    expect(renderToStaticMarkup(createElement(SiteScienceProvenance, { sheet: undefined }))).toContain('inconnues / indisponibles');
  });

  it('shows missing capabilities even when a descriptor is inconsistent with declared availability', () => {
    const region = manifest.regions.find((candidate) => candidate.id === 'jezero')!;
    const html = renderToStaticMarkup(createElement(RegionCapabilities, { region, manifest }));
    expect(html).toContain('Température et pression MEDA');
    expect(html).toContain('Non intégré à cette version du manifeste.');
    const broken = { ...manifest, datasets: [] };
    const missing = renderToStaticMarkup(createElement(RegionCapabilities, { region, manifest: broken }));
    expect(missing).not.toContain('Disponible dans l’emprise déclarée.');
    expect(missing).toContain('Aucune donnée exploitable déclarée pour ce secteur.');
  });

  it('shows missing mission inputs without substituting zero for an unknown speed or duration', () => {
    const html = renderToStaticMarkup(createElement(MissionAssumptions, { assumptions: selectMissionAssumptions(initialPlannerState) }));
    for (const field of ['Vitesse (km/h)', 'Durée de sortie (min)', 'Réserve (min)', 'Seuil de pente (°)']) expect(html).toContain(field);
    expect(html.match(/data-status="unknown"/g)).toHaveLength(4);
    expect(html).toContain('Non renseigné');
    expect(html).not.toContain('0 min');
    expect(html).not.toContain('0 km/h');
  });
});
