import {
  missionReducer,
  type Mission,
  type Activity,
} from '@marps/mission-core';
import { findSiteSheet, type DataManifest } from '@marps/data';
/** Creates a distinct visit; preserves scientific source references and an explicit simulated time. */
export function addCatalogVisit(
  mission: Mission,
  manifest: DataManifest,
  siteId: string,
  visitId: string,
  minutes?: number,
): Mission {
  const site = manifest.sites.find(
    (s) => s.id === siteId && s.regionId === mission.regionId,
  );
  if (!site) throw new Error('Site absent de la région de mission.');
  const sheet = findSiteSheet(siteId);
  const tasks = sheet?.tasks ?? [
    { id: 'observation', minutes: 15, label: 'Observation' },
    { id: 'photo', minutes: 5, label: 'Photo' },
  ];
  const total = tasks.reduce((n, t) => n + t.minutes, 0);
  const factor = minutes === undefined ? 1 : minutes / total;
  const activities: Activity[] = tasks.map((t) => ({
    id: `${visitId}:${t.id}`,
    type:
      t.id === 'sample'
        ? 'sampling'
        : t.id === 'describe' || t.id === 'observation'
          ? 'observation'
          : 'photo',
    durationSeconds: t.minutes * factor * 60,
  }));
  const next = missionReducer(mission, {
    type: 'addStep',
    step: {
      id: visitId,
      name: site.name,
      siteId: site.id,
      position: site.coordinate,
      activities,
    },
  });
  const dataset = manifest.datasets.find((d) => d.id === site.datasetId);
  return {
    ...next,
    dataReferences:
      dataset && !next.dataReferences.some((r) => r.id === dataset.id)
        ? [
            ...next.dataReferences,
            {
              id: dataset.id,
              version: dataset.version,
              sourceUrl: dataset.source.url,
            },
          ]
        : next.dataReferences,
  };
}
