import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { calculateMissionReturnLimit, type MissionReturnLimit } from '@marps/mission-core';
import { elevationSampler } from '@marps/data';
import { usePlannerState } from '../state/PlannerProvider';
import { selectPlanningStatus } from '../state/planner';
import { useOptionalRouteProfile } from '../terrain/RouteProfileProvider';

const Context = createContext<{ result: MissionReturnLimit; selected: string | null; select: (id: string | null) => void } | null>(null);
export function ReturnLimitProvider({ children }: { children: ReactNode }) {
  const state = usePlannerState();
  const profile = useOptionalRouteProfile();
  const mission = state.workspace === 'base' ? state.mission : state.runningMission;
  const grid = profile?.relief?.status === 'ready' ? profile.relief.grid : null;
  const allowed = selectPlanningStatus(state) === 'ready';
  const valid = state.workspace !== 'base' || (state.parameterDraftValid && (mission?.parameters.returnLimitMode !== 'time-and-oxygen' || state.oxygenParameterDraftValid));
  const result = useMemo<MissionReturnLimit>(() => !allowed ? { status: 'missing-inputs' } : !valid ? { status: 'invalid-inputs' }
    : calculateMissionReturnLimit(mission, grid ? { sample: elevationSampler(grid), spacingMetres: grid.raster.pixelSizeMetres } : undefined), [mission, grid, allowed, valid]);
  const [selection, setSelection] = useState<{ source: MissionReturnLimit; id: string | null } | null>(null);
  const selected = selection?.source === result ? selection.id : null;
  const select = useCallback((id: string | null) => setSelection({ source: result, id }), [result]);
  const value = useMemo(() => ({ result, selected, select }), [result, selected, select]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useReturnLimit() { return useContext(Context); }
