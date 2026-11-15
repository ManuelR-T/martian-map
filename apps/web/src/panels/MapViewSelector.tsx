import { localize } from '@marps/ui';
import '../i18n';
import { ChevronDown, Globe, MapPinned } from 'lucide-react';
import { SegmentedControl, type SegmentedOption } from '@marps/ui';
import { usePlannerDispatch, usePlannerState } from '../state/PlannerProvider';
import { selectRegion, type MapView } from '../state/planner';

/** Mars entière ou région ; un menu choisit la région dès que le catalogue en compte plusieurs. */
export function MapViewSelector() {
  const state = usePlannerState();
  const dispatch = usePlannerDispatch();
  const regions = state.catalog.status === 'ready' ? state.catalog.data.regions : [];
  const views: readonly SegmentedOption<MapView>[] = [
    { value: 'global', label: 'Mars', icon: <Globe aria-hidden="true" /> },
    { value: 'region', label: regions.length > 1 ? localize('Région') : selectRegion(state)?.name ?? state.regionId, icon: <MapPinned aria-hidden="true" /> },
  ];

  return (
    <div className="map-location-selector">
      <SegmentedControl
        label={localize("Vue de la carte")}
        value={state.view}
        options={views}
        onValueChange={(view) => dispatch({ type: 'viewChanged', view })}
      />
      {regions.length > 1 && <div className="map-region-field">
        <select
        aria-label={localize("Région")}
        value={state.regionId}
        onChange={(event) => dispatch({ type: 'regionOpened', regionId: event.target.value })}
        className="map-region-select label-caps"
      >
        {regions.map(region => <option key={region.id} value={region.id}>{region.name}</option>)}
      </select>
        <ChevronDown aria-hidden="true" className="map-region-chevron" />
      </div>}
    </div>
  );
}
