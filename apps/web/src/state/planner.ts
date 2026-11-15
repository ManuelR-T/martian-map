import { localize } from '@marps/ui';
import '../i18n';
import { scienceSources, siteSheets, type Catalog, type DatasetDescriptor, type RegionDefinition } from '@marps/data';
import { createEmptyMission, missionReducer, isMission, type MissionAction, type Mission } from '@marps/mission-core';
import { siteWorkOf, siteWorkReducer, type SiteWorkAction } from '../sites/siteWork';
import { withDataReferences } from '../storage/missionDraft';

/** Région des nouvelles missions : la seule dont les données permettent de planifier. */
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
  readonly draftStatus: string;
  readonly draftError: string | null;
  readonly view: MapView;
  /** Région détaillée affichée par la vue `region` ; ses capacités disent ce qu'elle offre. */
  readonly regionId: string;
  readonly catalog: Resource<Catalog>;
  /** Incrémenté à chaque (re)chargement demandé ; déclenche l'effet de chargement. */
  readonly catalogRequest: number;
  readonly mission: Mission;
  readonly selectedSiteId: string | null;
}

export type PlannerAction =
  | { readonly type: 'workspaceChanged'; readonly workspace: 'base' | 'mission' }
  | { readonly type: 'missionStarted'; readonly id: string }
  | { readonly type: 'savedMissionStarted'; readonly mission: Mission; readonly id: string }
  | { readonly type: 'missionEnded' }
  | { readonly type: 'trackingLoaded'; readonly mission: Mission | null; readonly request?: number }
  | { readonly type: 'trackingRequested' }
  | { readonly type: 'trackingFailed'; readonly request: number; readonly message: string }
  | { readonly type: 'trackingStatusChanged'; readonly message: string }
  | { readonly type: 'draftStatusChanged'; readonly message: string }
  | { readonly type: 'activityToggled'; readonly stepId: string; readonly activityId: string }

  | { readonly type: 'viewChanged'; readonly view: MapView }
  | { readonly type: 'regionOpened'; readonly regionId: string }
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
  draftStatus: '',
  draftError: null,
  view: 'global',
  regionId: DETAILED_REGION_ID,
  catalog: { status: 'loading' },
  catalogRequest: 0,
  mission: createEmptyMission(DETAILED_REGION_ID),
  selectedSiteId: null,
};

export function plannerReducer(state: PlannerState, action: PlannerAction): PlannerState {
  switch (action.type) {
    case 'draftStatusChanged':
      return { ...state, draftStatus: action.message };
    case 'workspaceChanged':
      return action.workspace === 'mission'
        ? { ...state, workspace: action.workspace, view: 'region', regionId: (state.runningMission ?? state.mission).regionId, selectedSiteId: null }
        : { ...state, workspace: action.workspace, selectedSiteId: null };
    case 'trackingRequested':
      return { ...state, trackingReady: false, trackingError: null, trackingRequest: state.trackingRequest + 1 };
    case 'trackingFailed':
      return action.request === state.trackingRequest ? { ...state, trackingReady: false, trackingError: action.message } : state;
    case 'trackingLoaded':
      if (action.request !== undefined && action.request !== state.trackingRequest) return state;
      return { ...state, trackingReady: true, trackingError: null, runningMission: action.mission && isMission(action.mission) && action.mission.regionId === DETAILED_REGION_ID ? action.mission : null };
    case 'trackingStatusChanged':
      return { ...state, trackingStatus: action.message };
    case 'missionEnded':
      return state.runningMission ? { ...state, runningMission: null, workspace: 'base', selectedSiteId: null } : state;
    case 'savedMissionStarted': {
      // Open and start as one step: a refused start must leave the open preparation untouched.
      const opened = plannerReducer(state, { type: 'missionOpened', mission: action.mission });
      if (opened.mission !== action.mission) return state;
      const started = plannerReducer(opened, { type: 'missionStarted', id: action.id });
      return started === opened ? state : started;
    }
    case 'missionStarted': {
      if (state.catalog.status !== 'ready' || state.workspace !== 'base' || !state.trackingReady || !state.mission.camp || !state.mission.steps.length || !missionMatchesCatalog(state.mission, state.catalog) || !action.id.trim() || selectPlanningStatus(state) !== 'ready') return state;
      const runningMission: Mission = { ...withDataReferences(state.mission, state.catalog.data), id: action.id,
        steps: state.mission.steps.map(step => ({ ...step, activities: step.activities.map(a => ({ ...a, completed: false })) })),
        siteWork: Object.fromEntries(Object.entries(state.mission.siteWork).map(([id, work]) => [id, { ...work, doneTaskIds: [] }])) };
      return { ...state, workspace: 'mission', runningMission, regionId: runningMission.regionId, selectedSiteId: null };
    }
    case 'activityToggled': {
      if (state.workspace !== 'mission' || !state.runningMission) return state;
      const activity = state.runningMission.steps.find(s => s.id === action.stepId)?.activities.find(a => a.id === action.activityId);
      if (!activity) return state;
      return { ...state, runningMission: missionReducer(state.runningMission, { type: 'activityChanged', stepId: action.stepId, activity: { ...activity, completed: !activity.completed } }) };
    }
    case 'viewChanged':
      return state.view === action.view ? state : { ...state, view: action.view };
    case 'regionOpened':
      return state.view === 'region' && state.regionId === action.regionId ? state : { ...state, view: 'region', regionId: action.regionId, selectedSiteId: null };
    case 'catalogRequested':
      return { ...state, catalog: { status: 'loading' }, catalogRequest: state.catalogRequest + 1 };
    case 'catalogLoaded':
      // Une réponse d'un chargement remplacé depuis ne doit pas écraser l'état courant.
      if (action.request !== state.catalogRequest) return state;
      return { ...state, catalog: { status: 'ready', data: action.catalog },
        draftError: state.draftError ?? (missionMatchesCatalog(state.mission, { status: 'ready', data: action.catalog }) ? null
          : localize("La préparation locale référence un site manquant ou un emplacement incompatible avec le catalogue. Réinitialisez la préparation pour continuer.")) };
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
      return state.workspace === 'base' && isMission(action.mission) && missionMatchesCatalog(action.mission, state.catalog) ? { ...state, mission: action.mission, draftError: null } : state;
    default: {
      if (state.workspace !== 'base' || selectPlanningStatus(state) !== 'ready') return state;
      const mission = missionReducer(state.mission, action);
      return mission !== state.mission && missionMatchesCatalog(mission, state.catalog) ? { ...state, mission } : state;
    }
  }
}

function findRegion(state: PlannerState, regionId: string): RegionDefinition | null {
  if (state.catalog.status !== 'ready') return null;
  return state.catalog.data.regions.find((region) => region.id === regionId) ?? null;
}

/** Région détaillée affichée (ou rouverte) par la vue `region`. */
export function selectRegion(state: PlannerState): RegionDefinition | null {
  return findRegion(state, state.regionId);
}

/** Région de la mission préparée ou suivie : la seule où la planification est proposée. */
export function selectMissionRegion(state: PlannerState): RegionDefinition | null {
  return findRegion(state, selectCurrentMission(state).regionId);
}

/** Ce qu'un emplacement de l'interface doit afficher avant son contenu. */
export type SlotStatus = 'loading' | 'error' | 'empty' | 'insufficient-coverage' | 'ready';

/** La carte attend le catalogue, puis au moins un jeu de données à afficher. */
export function selectMapStatus(state: PlannerState): SlotStatus {
  if (state.catalog.status !== 'ready') return state.catalog.status;
  return state.catalog.data.datasets.length === 0 ? 'empty' : 'ready';
}

/** Étapes, budget et fiches ne sont proposés que dans le secteur de la mission. */
export function selectPlanningStatus(state: PlannerState): Exclude<SlotStatus, 'empty'> {
  if (state.catalog.status !== 'ready') return state.catalog.status;
  return state.view === 'global' || state.regionId !== selectCurrentMission(state).regionId ? 'insufficient-coverage' : 'ready';
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

export function selectMapDataset(state: PlannerState): DatasetDescriptor | null {
  if (state.catalog.status !== 'ready') return null;
  const global = state.view === 'global';
  return state.catalog.data.datasets.find((dataset) =>
    dataset.regionId === (global ? 'global' : state.regionId)
    && dataset.kind === (global ? 'basemap' : 'imagery')
    && dataset.status !== 'unavailable'
    && (global || (dataset.delivery === 'local' && dataset.tileset))) ?? null;
}

/** No speed, outing, reserve or slope threshold has been supplied in this version. */
export function selectMissionAssumptions(state: PlannerState) {
  const sites = state.catalog.status === 'ready' ? state.catalog.data.sites : [];
  return {
    speedKilometresPerHour: state.catalog.status === 'ready' ? selectCurrentMission(state).parameters.speedMetresPerSecond * 3.6 : null,
    outingMinutes: state.catalog.status === 'ready' ? selectCurrentMission(state).parameters.availableSeconds / 60 : null,
    reserveMinutes: state.catalog.status === 'ready' ? selectCurrentMission(state).parameters.reserveSeconds / 60 : null,
    slopeLimitDegrees: null,
    stops: sites.flatMap((site) => {
      const sheet = siteSheets.find((candidate) => candidate.siteId === site.id);
      if (!sheet) return [];
      return [{
        siteId: site.id,
        name: site.name,
        allottedMinutes: siteWorkOf(selectCurrentMission(state).siteWork, sheet).allottedMinutes,
        tasks: sheet.tasks,
        procedureSourceId: sheet.tasksSourceId,
      }];
    }),
  };
}

/**
 * Serializable provenance to accompany a future mission save. Keep the full frozen
 * manifest (including versions and fingerprints) and sheet sources, not just URLs
 * or the currently visible dataset. No persistence is installed here.
 */
export function selectProvenanceSnapshot(state: PlannerState) {
  if (state.catalog.status !== 'ready') return null;
  return {
    manifest: state.catalog.data.manifest,
    mapDatasetId: selectMapDataset(state)?.id ?? null,
    selectedSiteId: state.selectedSiteId,
    siteSheets,
    scienceSources,
    assumptions: selectMissionAssumptions(state),
  };
}
