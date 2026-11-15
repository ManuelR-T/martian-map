import { localize } from '@marps/ui';
import '../i18n';
import { isMission, type Mission } from '@marps/mission-core';
import type { Catalog } from '@marps/data';

export const MISSION_DRAFT_KEY = 'marps-mission-draft';

export function withDataReferences(mission: Mission, catalog: Catalog): Mission {
  // Retain the sources used by a saved mission when reopening it with a newer catalogue.
  if (mission.dataReferences) return mission;
  return { ...mission, dataReferences: catalog.datasets.filter(d => d.regionId === mission.regionId).map(d => ({
    id: d.id, version: d.version, sha256: d.source.fingerprint.sha256,
  })) };
}

export function loadMissionDraft(storage: Pick<Storage, 'getItem'> = window.localStorage): Mission | null {
  const raw = storage.getItem(MISSION_DRAFT_KEY);
  if (raw === null) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error(localize("La préparation locale est endommagée.")); }
  if (!isMission(value)) throw new Error(localize("La préparation locale est incompatible ou endommagée."));
  return value;
}

export function saveMissionDraft(mission: Mission, storage: Pick<Storage, 'setItem'> = window.localStorage): void {
  if (!isMission(mission)) throw new Error(localize("Préparation invalide."));
  // Explicit schema projection: never copy runtime caches or extra raster properties.
  const { schemaVersion, id, name, missionType, regionId } = mission;
  const position = ({ longitude, latitude }: { longitude: number; latitude: number }) => ({ longitude, latitude });
  const camp = mission.camp && { id: mission.camp.id, name: mission.camp.name, regionId: mission.camp.regionId,
    position: position(mission.camp.position), provenance: mission.camp.provenance, note: mission.camp.note, referenceUrl: mission.camp.referenceUrl };
  const steps = mission.steps.map(s => ({ id: s.id, name: s.name, position: position(s.position), siteId: s.siteId,
    activities: s.activities.map(({ id, type, durationMinutes, completed }) => ({ id, type, durationMinutes, completed })) }));
  const { availableSeconds, speedMetresPerSecond, reserveSeconds } = mission.parameters;
  const source = mission.parameters.oxygen;
  const oxygen = source && Object.fromEntries(([
    'modelVersion', 'stockGrams', 'reserveGrams', 'loadKg', 'referenceGramsPerMinute',
    'activityGramsPerMinute', 'referenceSpeedMetresPerSecond', 'speedCoefficient',
    'uphillCoefficient', 'downhillCoefficient', 'loadCoefficientPerKg', 'assumeFlatTerrain',
  ] as const).map(key => [key, source[key]]));
  const parameters = { availableSeconds, speedMetresPerSecond, reserveSeconds, oxygen };
  const { simulation, route, terrainValidated } = mission.assumptions;
  const assumptions = { simulation, route, terrainValidated };
  const siteWork = Object.fromEntries(Object.entries(mission.siteWork).map(([id, { allottedMinutes, doneTaskIds }]) => [id, { allottedMinutes, doneTaskIds }]));
  const dataReferences = mission.dataReferences?.map(({ id, version, sha256 }) => ({ id, version, sha256 }));
  storage.setItem(MISSION_DRAFT_KEY, JSON.stringify({ schemaVersion, id, name, missionType, regionId,
    camp, steps, parameters, assumptions, siteWork, dataReferences }));
}
