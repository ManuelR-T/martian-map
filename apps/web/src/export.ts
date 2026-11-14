import {
  calculateBudget,
  calculateOxygen,
  routeSegments,
  validateMission,
  type Mission,
} from '@marps/mission-core';
import type { Catalog } from '@marps/data';
export function createMissionExport(mission: Mission, catalog: Catalog | null) {
  validateMission(mission);
  return {
    exportSchemaVersion: 1,
    mission,
    geometry: routeSegments(mission),
    budget: calculateBudget(mission),
    oxygen: calculateOxygen(mission),
    provenance: catalog?.manifest
      ? {
          generatedAt: catalog.manifest.generatedAt,
          datasets: catalog.datasets
            .filter((d) => d.regionId === mission.regionId)
            .map((d) => ({
              id: d.id,
              version: d.version,
              source: d.source,
              status: d.status,
            })),
        }
      : null,
    coverageWarnings: [
      'Tracé de mission et profil de terrain non reliés ; aucune couche cartographique déclarée chargée dans cet export.',
      ...(catalog ? [] : ['Catalogue indisponible.']),
      ...(mission.parameters.oxygen.flatTerrain
        ? ['O₂ : hypothèse de terrain plat simulée.']
        : ['Pentes non intégrées au calcul O₂.']),
    ],
    loadedMapLayers: [],
    simulatedEvents: mission.events,
  };
}
export function downloadMission(mission: Mission, catalog: Catalog | null) {
  const blob = new Blob(
    [JSON.stringify(createMissionExport(mission, catalog), null, 2)],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'marps-mission.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
