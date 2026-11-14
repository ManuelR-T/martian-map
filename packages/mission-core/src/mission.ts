import type { MarsCoordinate } from './index';

/** Arrêt du parcours. Le camp, les activités et les paramètres relèvent de #11. */
export interface MissionStep {
  readonly id: string;
  readonly name: string;
  readonly position: MarsCoordinate;
}

/** Forme minimale de la mission partagée par l'interface, étendue par #11. */
export interface Mission {
  readonly regionId: string;
  /** Étapes dans l'ordre de visite. */
  readonly steps: readonly MissionStep[];
}

export function createEmptyMission(regionId: string): Mission {
  return { regionId, steps: [] };
}
