import type { Catalog, RegionDefinition } from '@marps/data';
import { createEmptyMission, missionReducer, isMission, type MissionAction, type Mission } from '@marps/mission-core';
import { siteWorkReducer, type SiteWorkAction } from '../sites/siteWork';

/** Région détaillée du MVP ; la carte globale ne sert qu'à s'orienter. */
export const DETAILED_REGION_ID = 'jezero';

export type MapView = 'global' | 'region';

export type Resource<Data> =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly data: Data };

/** État unique de l'écran de planification, partagé par tous les panneaux. */
export interface PlannerState {
  readonly workspace: 'base' | 'mission';
  readonly runningMission: Mission | null;
  readonly trackingReady: boolean;
  readonly trackingRequest: number;
  readonly trackingError: string | null;
  readonly trackingStatus: string;
  readonly view: MapView;
  readonly catalog: Resource<Catalog>;
  /** Incrémenté à chaque (re)chargement demandé ; déclenche l'effet de chargement. */
  readonly catalogRequest: number;
  readonly mission: Mission;
  readonly selectedSiteId: string | null;
}

export type PlannerAction =
  | { readonly type: 'workspaceChanged'; readonly workspace: 'base' | 'mission' }
  | { readonly type: 'missionStarted'; readonly id: string }
  | { readonly type: 'trackingLoaded'; readonly mission: Mission | null; readonly request?: number }
  | { readonly type: 'trackingRequested' }
  | { readonly type: 'trackingFailed'; readonly request: number; readonly message: string }
  | { readonly type: 'trackingStatusChanged'; readonly message: string }
  | { readonly type: 'activityToggled'; readonly stepId: string; readonly activityId: string }

  | { readonly type: 'viewChanged'; readonly view: MapView }
  | { readonly type: 'catalogRequested' }
  | { readonly type: 'catalogLoaded'; readonly request: number; readonly catalog: Catalog }
  | { readonly type: 'catalogFailed'; readonly request: number; readonly message: string }
  | { readonly type: 'siteSelected'; readonly siteId: string | null }
  | { readonly type: 'missionOpened'; readonly mission: Mission }
  | MissionAction
  | SiteWorkAction;

export const initialPlannerState: PlannerState = {
  workspace: 'base',
  runningMission: null,
  trackingReady: false,
  trackingRequest: 0,
  trackingError: null,
  trackingStatus: 'Chargement du suivi…',
  view: 'global',
  catalog: { status: 'loading' },
  catalogRequest: 0,
  mission: createEmptyMission(DETAILED_REGION_ID),
  selectedSiteId: null,
};

export function plannerReducer(state: PlannerState, action: PlannerAction): PlannerState {
  switch (action.type) {
    case 'workspaceChanged':
      return { ...state, workspace: action.workspace, view: action.workspace === 'mission' ? 'region' : state.view, selectedSiteId: null };
    case 'trackingRequested':
      return { ...state, trackingReady: false, trackingError: null, trackingRequest: state.trackingRequest + 1 };
    case 'trackingFailed':
      return action.request === state.trackingRequest ? { ...state, trackingReady: false, trackingError: action.message } : state;
    case 'trackingLoaded':
      if (action.request !== undefined && action.request !== state.trackingRequest) return state;
      return { ...state, trackingReady: true, trackingError: null, runningMission: action.mission && isMission(action.mission) && action.mission.regionId === DETAILED_REGION_ID ? action.mission : null };
    case 'trackingStatusChanged':
      return { ...state, trackingStatus: action.message };
    case 'missionStarted': {
      if (state.workspace !== 'base' || !state.trackingReady || !state.mission.camp || !state.mission.steps.length || !missionMatchesCatalog(state.mission, state.catalog) || !action.id.trim() || selectPlanningStatus(state) !== 'ready') return state;
      const runningMission: Mission = { ...state.mission, id: action.id,
        steps: state.mission.steps.map(step => ({ ...step, activities: step.activities.map(a => ({ ...a, completed: false })) })),
        siteWork: Object.fromEntries(Object.entries(state.mission.siteWork).map(([id, work]) => [id, { ...work, doneTaskIds: [] }])) };
      return { ...state, workspace: 'mission', runningMission, selectedSiteId: null };
    }
    case 'activityToggled': {
      if (state.workspace !== 'mission' || !state.runningMission) return state;
      const activity = state.runningMission.steps.find(s => s.id === action.stepId)?.activities.find(a => a.id === action.activityId);
      if (!activity) return state;
      return { ...state, runningMission: missionReducer(state.runningMission, { type: 'activityChanged', stepId: action.stepId, activity: { ...activity, completed: !activity.completed } }) };
    }
    case 'viewChanged':
      return state.view === action.view ? state : { ...state, view: action.view };
    case 'catalogRequested':
      return { ...state, catalog: { status: 'loading' }, catalogRequest: state.catalogRequest + 1 };
    case 'catalogLoaded':
      // Une réponse d'un chargement remplacé depuis ne doit pas écraser l'état courant.
      if (action.request !== state.catalogRequest) return state;
      return { ...state, catalog: { status: 'ready', data: action.catalog } };
    case 'catalogFailed':
      if (action.request !== state.catalogRequest) return state;
      return { ...state, catalog: { status: 'error', message: action.message } };
    case 'siteSelected':
      return state.selectedSiteId === action.siteId ? state : { ...state, selectedSiteId: action.siteId };
    case 'siteTaskToggled':
      if (state.workspace !== 'mission' || !state.runningMission || selectPlanningStatus(state) !== 'ready') return state;
      return { ...state, runningMission: { ...state.runningMission, siteWork: siteWorkReducer(state.runningMission.siteWork, action) } };
    case 'siteAllottedChanged':
      if (state.workspace !== 'base' || selectPlanningStatus(state) !== 'ready' || !Number.isFinite(action.minutes) || action.minutes < 0) return state;
      return { ...state, mission: { ...state.mission, siteWork: siteWorkReducer(state.mission.siteWork, action) } };
    case 'missionOpened':
      return state.workspace === 'base' && isMission(action.mission) && missionMatchesCatalog(action.mission, state.catalog) ? { ...state, mission: action.mission } : state;
    default: {
      if (state.workspace !== 'base' || selectPlanningStatus(state) !== 'ready') return state;
      const mission = missionReducer(state.mission, action);
      return mission !== state.mission && missionMatchesCatalog(mission, state.catalog) ? { ...state, mission } : state;
    }
  }
}

export function selectDetailedRegion(state: PlannerState): RegionDefinition | null {
  if (state.catalog.status !== 'ready') return null;
  return state.catalog.data.regions.find((region) => region.id === DETAILED_REGION_ID) ?? null;
}

/** Ce qu'un emplacement de l'interface doit afficher avant son contenu. */
export type SlotStatus = 'loading' | 'error' | 'empty' | 'insufficient-coverage' | 'ready';

/** La carte attend le catalogue, puis au moins un jeu de données à afficher. */
export function selectMapStatus(state: PlannerState): SlotStatus {
  if (state.catalog.status !== 'ready') return state.catalog.status;
  return state.catalog.data.datasets.length === 0 ? 'empty' : 'ready';
}

/** Étapes, budget et fiches ne sont proposés que dans le secteur détaillé. */
export function selectPlanningStatus(state: PlannerState): Exclude<SlotStatus, 'empty'> {
  if (state.catalog.status !== 'ready') return state.catalog.status;
  return state.view === 'global' ? 'insufficient-coverage' : 'ready';
}

const emptyTrackingMission = createEmptyMission(DETAILED_REGION_ID);
export function selectCurrentMission(state: PlannerState): Mission {
  return state.workspace === 'base' ? state.mission : state.runningMission ?? emptyTrackingMission;
}

/** Application coverage checks stay outside the region-independent mission engine. */
export function missionMatchesCatalog(mission: Mission, catalog: Resource<Catalog>): boolean {
  if (catalog.status !== 'ready' || mission.regionId !== DETAILED_REGION_ID) return false;
  const extent = catalog.data.coverage?.find(region => region.id === mission.regionId)?.extent;
  const positions = [...(mission.camp ? [mission.camp.position] : []), ...mission.steps.map(step => step.position)];
  if (extent && positions.some(p => p.longitude < extent.west || p.longitude > extent.east || p.latitude < extent.south || p.latitude > extent.north)) return false;
  return mission.steps.every(step => step.siteId === null || catalog.data.sites.some(site => site.id === step.siteId
    && site.regionId === mission.regionId && site.coordinate.longitude === step.position.longitude && site.coordinate.latitude === step.position.latitude));
}
