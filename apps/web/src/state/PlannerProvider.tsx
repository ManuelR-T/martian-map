import { createContext, useContext, useEffect, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react';
import type { Mission } from '@marps/mission-core';
import { MissionDatabase } from '../storage/missionDatabase';
import { loadCatalog, type Catalog } from '@marps/data';
import { DETAILED_REGION_ID, initialPlannerState, plannerReducer, type PlannerAction, type PlannerState } from './planner';

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
  const [database] = useState(() => new MissionDatabase());
  const restoredMission = useRef<Mission | null>(null);
  const trackingRequest = state.trackingRequest;
  useEffect(() => {
    let active = true;
    database.activeMission().then(mission => {
      if (mission && mission.regionId !== DETAILED_REGION_ID) throw new Error('Région du suivi incompatible.');
      if (active) { restoredMission.current = mission; dispatch({ type: 'trackingLoaded', mission, request: trackingRequest }); dispatch({ type: 'trackingStatusChanged', message: 'Suivi local chargé.' }); }
    }).catch(() => {
      if (active) dispatch({ type: 'trackingFailed', request: trackingRequest, message: 'Impossible de restaurer le suivi local. Réessayez avant de démarrer une autre sortie.' });
    });
    return () => { active = false; };
  }, [database, trackingRequest]);
  useEffect(() => {
    if (!state.runningMission || state.runningMission === restoredMission.current) return;
    let active = true;
    dispatch({ type: 'trackingStatusChanged', message: 'Enregistrement du suivi…' });
    database.saveActiveMission(state.runningMission).then(() => {
      if (active) dispatch({ type: 'trackingStatusChanged', message: 'Suivi enregistré sur cet appareil.' });
    }).catch(() => {
      if (active) dispatch({ type: 'trackingStatusChanged', message: 'Échec de la sauvegarde du suivi. Modifiez une coche pour réessayer.' });
    });
    return () => { active = false; };
  }, [database, state.runningMission]);
  // A walk that ends (running mission back to null) leaves the saved tracking; replacing it by another walk does not.
  const previousRunning = useRef<Mission | null>(null);
  useEffect(() => {
    const previous = previousRunning.current;
    previousRunning.current = state.runningMission;
    if (!previous || state.runningMission) return;
    database.endActiveMission().catch(() => dispatch({ type: 'trackingStatusChanged', message: 'Échec de la clôture locale de la sortie.' }));
  }, [database, state.runningMission]);

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
