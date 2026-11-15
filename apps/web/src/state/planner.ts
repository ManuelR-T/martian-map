import { scienceSources, siteSheets, type Catalog, type DatasetDescriptor, type RegionDefinition } from '@marps/data';
import { createEmptyMission, type Mission } from '@marps/mission-core';
import { siteWorkOf, siteWorkReducer, type SiteWorkAction, type SiteWorkState } from '../sites/siteWork';

/** Région détaillée du MVP ; la carte globale ne sert qu'à s'orienter. */
export const DETAILED_REGION_ID = 'jezero';

export type MapView = 'global' | 'region';

export type Resource<Data> =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly data: Data };

/** État unique de l'écran de planification, partagé par tous les panneaux. */
export interface PlannerState {
  readonly view: MapView;
  readonly catalog: Resource<Catalog>;
  /** Incrémenté à chaque (re)chargement demandé ; déclenche l'effet de chargement. */
  readonly catalogRequest: number;
  readonly mission: Mission;
  readonly selectedSiteId: string | null;
  /** Avancement des arrêts (tâches cochées, temps alloué) ; rejoindra la mission avec #11. */
  readonly siteWork: SiteWorkState;
}

export type PlannerAction =
  | { readonly type: 'viewChanged'; readonly view: MapView }
  | { readonly type: 'catalogRequested' }
  | { readonly type: 'catalogLoaded'; readonly request: number; readonly catalog: Catalog }
  | { readonly type: 'catalogFailed'; readonly request: number; readonly message: string }
  | { readonly type: 'siteSelected'; readonly siteId: string | null }
  | SiteWorkAction;

export const initialPlannerState: PlannerState = {
  view: 'global',
  catalog: { status: 'loading' },
  catalogRequest: 0,
  mission: createEmptyMission(DETAILED_REGION_ID),
  selectedSiteId: null,
  siteWork: {},
};

export function plannerReducer(state: PlannerState, action: PlannerAction): PlannerState {
  switch (action.type) {
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
    case 'siteAllottedChanged':
      return { ...state, siteWork: siteWorkReducer(state.siteWork, action) };
  }
}

export function selectDetailedRegion(state: PlannerState): RegionDefinition | null {
  if (state.catalog.status !== 'ready') return null;
  return state.catalog.data.regions.find((region) => region.id === DETAILED_REGION_ID) ?? null;
}

/** Shared by the map and its provenance; switching views never changes the catalog. */
export function selectMapDataset(state: PlannerState): DatasetDescriptor | null {
  if (state.catalog.status !== 'ready') return null;
  const global = state.view === 'global';
  return state.catalog.data.datasets.find((dataset) =>
    dataset.regionId === (global ? 'global' : state.mission.regionId)
    && dataset.kind === (global ? 'basemap' : 'imagery')
    && dataset.status !== 'unavailable'
    && (global || (dataset.delivery === 'local' && dataset.tileset))) ?? null;
}

/** No speed, outing, reserve or slope threshold has been supplied in this version. */
export function selectMissionAssumptions(state: PlannerState) {
  const sites = state.catalog.status === 'ready' ? state.catalog.data.manifest.sites : [];
  return {
    speedKilometresPerHour: null,
    outingMinutes: null,
    reserveMinutes: null,
    slopeLimitDegrees: null,
    stops: sites.flatMap((site) => {
      const sheet = siteSheets.find((candidate) => candidate.siteId === site.id);
      if (!sheet) return [];
      return [{
        siteId: site.id,
        name: site.name,
        allottedMinutes: siteWorkOf(state.siteWork, sheet).allottedMinutes,
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
