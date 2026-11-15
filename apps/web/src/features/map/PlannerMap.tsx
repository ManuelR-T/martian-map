import { localize } from '@marps/ui';
import '../../i18n';
import { useCallback, useMemo, useState } from 'react';
import type Map from 'ol/Map';
import { DataState } from '@marps/ui';
import { usePlannerDispatch, usePlannerState } from '../../state/PlannerProvider';
import { selectMapDataset } from '../../state/planner';
import { JezeroMap } from './JezeroMap';
import { GlobalMarsMap } from './GlobalMarsMap';
import { findThemisNightDataset } from './themisNight';
import { findGeologyDataset } from '@marps/data';
import { TerrainOverlay } from '../../terrain/TerrainOverlay';

const terrainOverlay = (map: Map | null) => <TerrainOverlay map={map} />;

export function PlannerMap({ panelHost, onSiteSelected }: { panelHost: HTMLElement | null; onSiteSelected?: () => void }) {
  const [annotationsEnabled, setAnnotationsEnabled] = useState(true);
  const [roverEnabled, setRoverEnabled] = useState(false);
  const state = usePlannerState();
  const dispatch = usePlannerDispatch();
  const openRegion = useCallback((regionId: string) => dispatch({ type: 'regionOpened', regionId }), [dispatch]);
  const selectSite = useCallback((siteId: string) => { dispatch({ type: 'siteSelected', siteId }); onSiteSelected?.(); }, [dispatch, onSiteSelected]);
  const coverage = state.catalog.status === 'ready' ? state.catalog.data.coverage : undefined;
  const detailed = useMemo(() => (coverage ?? []).filter(region => region.kind === 'detailed'), [coverage]);
  if (state.catalog.status !== 'ready') return null;
  const { datasets, planet, sites } = state.catalog.data;
  const global = state.view === 'global';
  const region = global ? undefined : detailed.find(candidate => candidate.id === state.regionId);
  const imagery = global ? null : selectMapDataset(state);
  if (region && imagery && planet) {
    // The night infrared layer exists only on the detailed map, never on the global one.
    const themis = findThemisNightDataset({ regions: coverage ?? [], datasets }, region.id);
    const geology = findGeologyDataset({ regions: coverage ?? [], datasets }, region.id);
    return <JezeroMap annotationsEnabled={annotationsEnabled} onAnnotationsToggle={() => setAnnotationsEnabled(value => !value)} panelHost={panelHost} roverEnabled={roverEnabled} onRoverToggle={() => setRoverEnabled(value => !value)} datasets={datasets} dataset={imagery} sector={region.extent} radius={planet.radiusMeters} sites={sites} selected={state.selectedSiteId} onSelect={selectSite} overlay={terrainOverlay} themisDataset={themis} geologyDataset={geology} />;
  }
  // Without verified imagery, a region is framed on the orientation basemap with its capabilities listed.
  const basemap = datasets.find(dataset => dataset.regionId === 'global' && dataset.kind === 'basemap' && dataset.status !== 'unavailable');
  if (!basemap) return <div className="absolute inset-0 flex items-center justify-center p-4"><DataState kind="empty" title={localize("Fond de carte indisponible")} description={localize("Le manifeste ne déclare pas de fond utilisable pour cette vue.")} /></div>;
  return <GlobalMarsMap panelHost={panelHost} key={`${basemap.id}:${region?.id ?? 'global'}`} dataset={basemap} regions={detailed} focus={region} onSelectRegion={openRegion} />;
}
