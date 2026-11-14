import { addCatalogVisit } from './visits';
import type { DataManifest } from '@marps/data';
import { createEmptyMission, type Mission } from '@marps/mission-core';
export const scienceSource =
  'https://meetingorganizer.copernicus.org/EPSC2024/EPSC2024-1049.html';
export const siteNotes: Record<
  string,
  { title: string; description: string; question: string }
> = {
  'skinner-ridge': {
    title: 'Lire l’histoire du delta',
    description:
      'Les carottes Swift Run et Skyland sont des grès contenant notamment pyroxène, feldspath et carbonates.',
    question: 'Comparer les grains et les structures sédimentaires.',
  },
  'wildcat-ridge': {
    title: 'Étudier les roches fines',
    description:
      'Des sédiments fins avec sulfates et phyllosilicates : un contexte intéressant pour étudier la préservation de matière organique.',
    question:
      'Documenter la texture et les traces d’altération. La matière organique ne prouve pas la vie.',
  },
  amalik: {
    title: 'Explorer l’altération par l’eau',
    description:
      'Les carottes Shuyak et Mageik contiennent des grains d’olivine altérés en phyllosilicates et des carbonates.',
    question: 'Observer les indices d’interaction entre l’eau et la roche.',
  },
};
/** Scientific locations come only from the frozen manifest; all human operations are simulated. */
export function exampleMission(
  manifest: DataManifest,
  id: string,
  name: string,
): Mission {
  const sites = ['skinner-ridge', 'wildcat-ridge', 'amalik'].map((id) =>
    manifest.sites.find((s) => s.id === id),
  );
  if (sites.some((s) => !s))
    throw new Error('Le catalogue des trois sites est incomplet.');
  const region = manifest.regions.find((r) => r.id === 'jezero');
  if (!region) throw new Error('Secteur de Jezero indisponible.');
  const base: Mission = {
    ...createEmptyMission('jezero'),
    id,
    name,
    objective:
      'Comparer les roches du delta et documenter leurs indices d’altération par l’eau.',
    radiusMetres: manifest.planet.radiusMeters,
    camp: {
      latitude: region.extent.south + 0.001,
      longitude: region.extent.west + 0.002,
    },
    assumptions: [
      ...createEmptyMission('jezero').assumptions,
      'Exemple : camp fictif choisi dans le secteur ; activités humaines et durées simulées.',
    ],
  };
  return sites.reduce(
    (mission, site, i) =>
      addCatalogVisit(mission, manifest, site!.id, `${id}:step:${i}`),
    base,
  );
}
