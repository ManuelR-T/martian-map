import {
  createEmptyMission,
  parseMission,
  validateMission,
  type Mission,
} from '@marps/mission-core';
export const STORAGE_KEY = 'marps.mission.v1';
export interface MissionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export function restoreMission(storage: MissionStorage): {
  mission: Mission;
  message: string;
} {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return {
      mission: raw ? parseMission(raw) : createEmptyMission('jezero'),
      message: raw
        ? 'Mission restaurée depuis cet appareil.'
        : 'Nouvelle mission.',
    };
  } catch (error) {
    return {
      mission: createEmptyMission('jezero'),
      message: `Restauration impossible. La sauvegarde existante est conservée. ${error instanceof Error ? error.message : ''}`,
    };
  }
}
export function saveMission(storage: MissionStorage, mission: Mission): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(validateMission(mission)));
}
export function missingSites(
  mission: Mission,
  siteIds: readonly string[],
): string[] {
  return mission.steps
    .filter((s) => s.siteId && !siteIds.includes(s.siteId))
    .map((s) => s.name);
}
