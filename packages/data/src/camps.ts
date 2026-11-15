import type { Camp } from '@marps/mission-core';

/** Scenario fixtures only: no NASA-selected human landing location is claimed. */
export const exampleCamps: readonly Camp[] = [
  { id: 'sim-jezero-alpha', name: 'Jezero Alpha — simulation', regionId: 'jezero',
    position: { longitude: 77.400, latitude: 18.450 }, provenance: 'simulation',
    note: 'Habitat fictif dans le secteur préparé. Emplacement choisi pour tester les sorties ; sol, ressources et sécurité non validés.',
    referenceUrl: 'https://ntrs.nasa.gov/citations/20250009522' },
  { id: 'sim-jezero-beta', name: 'Jezero Beta — simulation', regionId: 'jezero',
    position: { longitude: 77.407, latitude: 18.460 }, provenance: 'simulation',
    note: 'Camp avancé fictif pour comparer des parcours. Aucun atterrissage habité ni équipement confirmé à ces coordonnées.',
    referenceUrl: 'https://science.nasa.gov/mission/mars-2020-perseverance/' },
];
