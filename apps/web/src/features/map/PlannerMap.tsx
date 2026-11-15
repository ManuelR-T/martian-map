import { useCallback } from 'react';
import { DataState } from '@marps/ui';
import { usePlannerDispatch, usePlannerState } from '../../state/PlannerProvider';
import { selectMapDataset } from '../../state/planner';
import { GlobalMarsMap } from './GlobalMarsMap';

export function PlannerMap() {
  const state = usePlannerState();
  const dispatch = usePlannerDispatch();
  const openRegion = useCallback(() => dispatch({ type: 'viewChanged', view: 'region' }), [dispatch]);
  if (state.catalog.status !== 'ready') return null;
  const global = state.view === 'global';
  const dataset = selectMapDataset(state);
  if (!dataset) return <div className="absolute inset-0 flex items-center justify-center p-4"><DataState kind="empty" title="Fond de carte indisponible" description="Le manifeste ne déclare pas de fond utilisable pour cette vue." /></div>;
  return <GlobalMarsMap key={dataset.id} dataset={dataset} manifest={state.catalog.data.manifest} global={global} onSelectRegion={openRegion} />;
}
