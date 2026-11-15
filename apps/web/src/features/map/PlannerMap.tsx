import { localize } from '@marps/ui';
import '../../i18n';
import { useCallback, useState } from 'react';
import type Map from 'ol/Map';
import { DataState } from '@marps/ui';
import { usePlannerDispatch, usePlannerState } from '../../state/PlannerProvider';
import { JezeroMap } from './JezeroMap';
import { GlobalMarsMap } from './GlobalMarsMap';
import { findThemisNightDataset } from './themisNight';
import { findGeologyDataset } from '@marps/data';
import { TerrainOverlay } from '../../terrain/TerrainOverlay';

const terrainOverlay = (map: Map | null) => <TerrainOverlay map={map} />;

export function PlannerMap({ panelHost, onSiteSelected }: { panelHost: HTMLElement | null; onSiteSelected?: () => void }) {
  const [roverEnabled, setRoverEnabled] = useState(false);
  const state = usePlannerState();
  const dispatch = usePlannerDispatch();
  const openRegion = useCallback(() => dispatch({ type: 'viewChanged', view: 'region' }), [dispatch]);
  const selectSite = useCallback((siteId: string) => { dispatch({ type: 'siteSelected', siteId }); onSiteSelected?.(); }, [dispatch, onSiteSelected]);
  if (state.catalog.status !== 'ready') return null;
  const global = state.view === 'global';
  const dataset = state.catalog.data.datasets.find(candidate =>
    candidate.regionId === (global ? 'global' : state.mission.regionId)
    && candidate.kind === (global ? 'basemap' : 'imagery')
    && candidate.status !== 'unavailable'
    && (global || (candidate.delivery === 'local' && candidate.tileset)));
  if (!dataset) return <div className="absolute inset-0 flex items-center justify-center p-4"><DataState kind="empty" title={localize("Fond de carte indisponible")} description={localize("Le manifeste ne déclare pas de fond utilisable pour cette vue.")} /></div>;
  const sector = state.catalog.data.coverage?.find(region => region.id === dataset.regionId)?.extent;
  // The night infrared layer exists only on the detailed map, never on the global one.
  const themis = findThemisNightDataset({ regions: state.catalog.data.coverage ?? [], datasets: state.catalog.data.datasets }, dataset.regionId);
  const geology = findGeologyDataset({ regions: state.catalog.data.coverage ?? [], datasets: state.catalog.data.datasets }, dataset.regionId);
  if (!global && sector && state.catalog.data.planet) return <JezeroMap panelHost={panelHost} roverEnabled={roverEnabled} onRoverToggle={() => setRoverEnabled(value => !value)} datasets={state.catalog.data.datasets} dataset={dataset} sector={sector} radius={state.catalog.data.planet.radiusMeters} sites={state.catalog.data.sites} selected={state.selectedSiteId} onSelect={selectSite} overlay={terrainOverlay} themisDataset={themis} geologyDataset={geology} />;
  return <GlobalMarsMap panelHost={panelHost} key={dataset.id} dataset={dataset} global={global} onSelectRegion={openRegion} />;
}
