import {
  createEmptyMission,
  parseMission,
  validateMission,
  type Mission,
} from '@marps/mission-core';
import type { MissionStorage } from './storage';
import { STORAGE_KEY } from './storage';
export const LIBRARY_KEY = 'marps.library.v1';
export interface Revision {
  id: string;
  at: string;
  label: string;
  mission: Mission;
}
export interface MissionRecord {
  mission: Mission;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  revisions: readonly Revision[];
}
export interface MissionLibrary {
  schemaVersion: 1;
  activeId: string | null;
  records: readonly MissionRecord[];
}
export const emptyLibrary: MissionLibrary = {
  schemaVersion: 1,
  activeId: null,
  records: [],
};
export type LibraryAction =
  | { type: 'create'; mission: Mission; at: string }
  | { type: 'open'; id: string }
  | { type: 'archive'; id: string; archived: boolean; at: string }
  | { type: 'delete'; id: string }
  | {
      type: 'checkpoint';
      id: string;
      revisionId: string;
      at: string;
      label: string;
    };
export function libraryReducer(
  library: MissionLibrary,
  action: LibraryAction,
): MissionLibrary {
  switch (action.type) {
    case 'create':
      validateMission(action.mission);
      if (library.records.some((r) => r.mission.id === action.mission.id))
        throw new Error('Identifiant de mission déjà utilisé.');
      return {
        ...library,
        activeId: action.mission.id,
        records: [
          {
            mission: action.mission,
            createdAt: action.at,
            updatedAt: action.at,
            archived: false,
            revisions: [],
          },
          ...library.records,
        ],
      };
    case 'open':
      return library.records.some((r) => r.mission.id === action.id)
        ? { ...library, activeId: action.id }
        : library;
    case 'delete':
      return {
        ...library,
        activeId: library.activeId === action.id ? null : library.activeId,
        records: library.records.filter((r) => r.mission.id !== action.id),
      };
    case 'archive':
      return {
        ...library,
        records: library.records.map((r) =>
          r.mission.id === action.id
            ? { ...r, archived: action.archived, updatedAt: action.at }
            : r,
        ),
      };
    case 'checkpoint':
      return {
        ...library,
        records: library.records.map((r) =>
          r.mission.id === action.id
            ? {
                ...r,
                revisions: [
                  {
                    id: action.revisionId,
                    at: action.at,
                    label: action.label,
                    mission: r.mission,
                  },
                  ...r.revisions,
                ],
              }
            : r,
        ),
      };
  }
}
export function updateActiveMission(
  library: MissionLibrary,
  mission: Mission,
  at?: string,
): MissionLibrary {
  return {
    ...library,
    records: library.records.map((r) =>
      r.mission.id === library.activeId && !r.archived
        ? { ...r, mission, updatedAt: at ?? r.updatedAt }
        : r,
    ),
  };
}
export function activeMission(library: MissionLibrary): Mission {
  return (
    library.records.find((r) => r.mission.id === library.activeId)?.mission ??
    createEmptyMission('jezero')
  );
}
export function restoreLibrary(storage: MissionStorage): {
  library: MissionLibrary;
  message: string;
  writable: boolean;
} {
  try {
    const raw = storage.getItem(LIBRARY_KEY);
    if (!raw) {
      const old = storage.getItem(STORAGE_KEY);
      if (!old)
        return {
          library: emptyLibrary,
          message: 'Vos missions sont enregistrées sur cet appareil.',
          writable: true,
        };
      const mission = parseMission(old);
      return {
        library: libraryReducer(emptyLibrary, {
          type: 'create',
          mission,
          at: new Date().toISOString(),
        }),
        message: 'Votre ancienne mission a été conservée dans la bibliothèque.',
        writable: true,
      };
    }
    const library = JSON.parse(raw) as MissionLibrary;
    if (library.schemaVersion !== 1 || !Array.isArray(library.records))
      throw new Error('Version incompatible.');
    const ids = new Set<string>();
    for (const r of library.records) {
      validateMission(r.mission);
      if (
        ids.has(r.mission.id) ||
        typeof r.archived !== 'boolean' ||
        !Number.isFinite(Date.parse(r.createdAt)) ||
        !Number.isFinite(Date.parse(r.updatedAt))
      )
        throw new Error('Mission invalide.');
      ids.add(r.mission.id);
      const revisionIds = new Set<string>();
      for (const v of r.revisions) {
        validateMission(v.mission);
        if (
          !v.id ||
          revisionIds.has(v.id) ||
          typeof v.label !== 'string' ||
          !Number.isFinite(Date.parse(v.at))
        )
          throw new Error('Révision invalide.');
        revisionIds.add(v.id);
      }
    }
    if (library.activeId !== null && !ids.has(library.activeId))
      throw new Error('Mission active absente.');
    return {
      library,
      message: 'Bibliothèque restaurée depuis cet appareil.',
      writable: true,
    };
  } catch {
    return {
      library: emptyLibrary,
      message:
        'Bibliothèque illisible ou stockage indisponible. Les données existantes sont conservées ; la sauvegarde est suspendue.',
      writable: false,
    };
  }
}
