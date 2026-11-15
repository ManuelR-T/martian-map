import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { elevationSampler, loadGrid, terrainDataset, type DatasetDescriptor, type TerrainGrid } from '@marps/data';
import { sampleProfile, steepPortions, type ProfilePoint, type SteepPortion } from '@marps/mission-core';
import { usePlannerState } from '../state/PlannerProvider';
import { DETAILED_REGION_ID } from '../state/planner';
import { demoRoute, type RouteStop } from './demoRoute';

export const DEFAULT_THRESHOLD = 10;

export type ReliefState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | {
      readonly status: 'ready';
      readonly grid: TerrainGrid;
      readonly profile: readonly ProfilePoint[];
      readonly steep: readonly SteepPortion[];
    };

interface RouteProfile {
  /** Finest complete relief of the sector: HiRISE 4 m, CTX 20 m as fallback. */
  readonly dem: DatasetDescriptor | null;
  readonly stops: readonly RouteStop[];
  /** Null while there is nothing to load: global view, no relief or fewer than two stops. */
  readonly relief: ReliefState | null;
  readonly threshold: number;
  readonly setThreshold: (degrees: number) => void;
  /** Distance from the start of the point the crew designates on the profile, shown on the map. */
  readonly focusMetres: number | null;
  readonly setFocusMetres: (metres: number | null) => void;
}

const RouteProfileContext = createContext<RouteProfile | null>(null);

type Loaded = { readonly demId: string } & ({ readonly status: 'error' } | { readonly status: 'ready'; readonly grid: TerrainGrid });

/** Loads the relief once and shares the profile between the profile panel and the map. */
export function RouteProfileProvider({ children }: { children: ReactNode }) {
  const { catalog, view } = usePlannerState();
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [focusMetres, setFocusMetres] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const dem = catalog.status === 'ready' ? terrainDataset(catalog.data, DETAILED_REGION_ID, 'elevation') : null;
  const stops = useMemo(() => (catalog.status === 'ready' ? demoRoute(catalog.data.sites) : []), [catalog]);
  // The global view has no relief: the grid is only fetched once the crew opens the sector.
  const wanted = view !== 'global' && dem !== null && stops.length >= 2;

  // Leaving the sector after a failed load clears the failure: coming back tries again.
  // Adjusted during render, as React recommends for state that follows another value.
  const [wasWanted, setWasWanted] = useState(wanted);
  if (wanted !== wasWanted) {
    setWasWanted(wanted);
    if (!wanted && loaded?.status === 'error') setLoaded(null);
  }

  useEffect(() => {
    if (!wanted || !dem || loaded?.demId === dem.id) return;
    let active = true;
    loadGrid(dem).then(
      (grid) => active && setLoaded({ demId: dem.id, status: 'ready', grid }),
      (error: unknown) => {
        console.error(error);
        if (active) setLoaded({ demId: dem.id, status: 'error' });
      },
    );
    return () => {
      active = false;
    };
  }, [wanted, dem, loaded]);

  // A grid loaded for another relief is never shown: a new relief starts from « chargement ».
  const grid = loaded?.status === 'ready' && loaded.demId === dem?.id ? loaded.grid : null;
  // One point per relief cell: a finer step would invent detail the data does not have.
  const profile = useMemo(
    () => (grid ? sampleProfile(stops.map((stop) => stop.coordinate), elevationSampler(grid), grid.raster.pixelSizeMetres) : null),
    [grid, stops],
  );
  const steep = useMemo(() => (profile ? steepPortions(profile, threshold) : []), [profile, threshold]);

  const failed = loaded?.status === 'error' && loaded.demId === dem?.id;
  const relief = useMemo<ReliefState | null>(() => {
    if (!wanted) return null;
    if (grid && profile) return { status: 'ready', grid, profile, steep };
    return { status: failed ? 'error' : 'loading' };
  }, [wanted, grid, profile, steep, failed]);

  const value = useMemo(
    () => ({ dem, stops, relief, threshold, setThreshold, focusMetres, setFocusMetres }),
    [dem, stops, relief, threshold, focusMetres],
  );
  return <RouteProfileContext.Provider value={value}>{children}</RouteProfileContext.Provider>;
}

export function useRouteProfile(): RouteProfile {
  const value = useContext(RouteProfileContext);
  if (!value) throw new Error('useRouteProfile must be used inside RouteProfileProvider.');
  return value;
}
