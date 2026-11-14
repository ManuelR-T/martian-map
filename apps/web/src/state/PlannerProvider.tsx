import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react';
import { loadCatalog, type Catalog } from '@marps/data';
import { initialPlannerState, plannerReducer, type PlannerAction, type PlannerState } from './planner';

const PlannerStateContext = createContext<PlannerState | null>(null);
const PlannerDispatchContext = createContext<Dispatch<PlannerAction> | null>(null);

export interface PlannerProviderProps {
  children: ReactNode;
  /** Source du catalogue ; remplaçable pour les essais et la démonstration hors ligne. */
  load?: () => Promise<Catalog>;
}

/** Porte l'unique état de planification et charge le catalogue à chaque demande. */
export function PlannerProvider({ children, load = loadCatalog }: PlannerProviderProps) {
  const [state, dispatch] = useReducer(plannerReducer, initialPlannerState);
  const request = state.catalogRequest;

  useEffect(() => {
    let active = true;
    load().then(
      (catalog) => {
        if (active) dispatch({ type: 'catalogLoaded', request, catalog });
      },
      (error: unknown) => {
        if (!active) return;
        const message = error instanceof Error && error.message ? error.message : 'Cause inconnue.';
        dispatch({ type: 'catalogFailed', request, message });
      },
    );
    return () => {
      active = false;
    };
  }, [load, request]);

  return (
    <PlannerStateContext.Provider value={state}>
      <PlannerDispatchContext.Provider value={dispatch}>{children}</PlannerDispatchContext.Provider>
    </PlannerStateContext.Provider>
  );
}

export function usePlannerState(): PlannerState {
  const state = useContext(PlannerStateContext);
  if (!state) throw new Error('usePlannerState doit être appelé sous PlannerProvider.');
  return state;
}

export function usePlannerDispatch(): Dispatch<PlannerAction> {
  const dispatch = useContext(PlannerDispatchContext);
  if (!dispatch) throw new Error('usePlannerDispatch doit être appelé sous PlannerProvider.');
  return dispatch;
}
