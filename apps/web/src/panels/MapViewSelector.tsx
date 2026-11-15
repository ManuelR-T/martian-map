import { localize } from '@marps/ui';
import '../i18n';
import { Globe, MapPinned } from 'lucide-react';
import { SegmentedControl, type SegmentedOption } from '@marps/ui';
import { usePlannerDispatch, usePlannerState } from '../state/PlannerProvider';
import { selectDetailedRegion, type MapView } from '../state/planner';

export function MapViewSelector() {
  const state = usePlannerState();
  const dispatch = usePlannerDispatch();
  const views: readonly SegmentedOption<MapView>[] = [
    { value: 'global', label: 'Mars', icon: <Globe aria-hidden="true" /> },
    { value: 'region', label: selectDetailedRegion(state)?.name ?? 'Jezero', icon: <MapPinned aria-hidden="true" /> },
  ];

  return (
    <SegmentedControl
      label={localize("Vue de la carte")}
      value={state.view}
      options={views}
      onValueChange={(view) => dispatch({ type: 'viewChanged', view })}
    />
  );
}
