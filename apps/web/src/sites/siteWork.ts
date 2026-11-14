import { plannedTaskMinutes, type SiteSheet } from '@marps/data';

/** Avancement d'un arrêt : temps alloué par l'équipage et tâches déjà faites. */
export interface SiteWork {
  readonly allottedMinutes: number;
  readonly doneTaskIds: readonly string[];
}

/** Avancement par site ; un site jamais ouvert n'a pas d'entrée et prend ses valeurs par défaut. */
export type SiteWorkState = Readonly<Record<string, SiteWork>>;

export type SiteWorkAction =
  | { readonly type: 'siteTaskToggled'; readonly sheet: SiteSheet; readonly taskId: string }
  | { readonly type: 'siteAllottedChanged'; readonly sheet: SiteSheet; readonly minutes: number };

/** Tant que l'équipage ne le change pas, l'arrêt reçoit exactement le temps de ses tâches. */
export function siteWorkOf(state: SiteWorkState, sheet: SiteSheet): SiteWork {
  return state[sheet.siteId] ?? { allottedMinutes: plannedTaskMinutes(sheet), doneTaskIds: [] };
}

export function siteWorkReducer(state: SiteWorkState, action: SiteWorkAction): SiteWorkState {
  const work = siteWorkOf(state, action.sheet);
  switch (action.type) {
    case 'siteTaskToggled': {
      const done = work.doneTaskIds.includes(action.taskId);
      const doneTaskIds = done
        ? work.doneTaskIds.filter((id) => id !== action.taskId)
        : [...work.doneTaskIds, action.taskId];
      return { ...state, [action.sheet.siteId]: { ...work, doneTaskIds } };
    }
    case 'siteAllottedChanged':
      return { ...state, [action.sheet.siteId]: { ...work, allottedMinutes: action.minutes } };
  }
}

export interface StopSummary {
  /** Minutes des tâches pas encore faites. */
  readonly remainingTaskMinutes: number;
  /** Positif quand les tâches restantes demandent plus que le temps alloué à l'arrêt. */
  readonly shortfallMinutes: number;
}

export function summarizeStop(sheet: SiteSheet, work: SiteWork): StopSummary {
  const remainingTaskMinutes = sheet.tasks
    .filter((task) => !work.doneTaskIds.includes(task.id))
    .reduce((total, task) => total + task.minutes, 0);
  return {
    remainingTaskMinutes,
    // Sur les tâches restantes : une fois les tâches faites, l'alerte ne demande plus d'en sauter.
    shortfallMinutes: Math.max(0, remainingTaskMinutes - work.allottedMinutes),
  };
}
