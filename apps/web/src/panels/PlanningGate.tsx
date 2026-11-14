import type { ReactNode } from 'react';
import { RotateCw } from 'lucide-react';
import { Button, DataState, Skeleton } from '@marps/ui';
import { usePlannerDispatch, usePlannerState } from '../state/PlannerProvider';
import { selectDetailedRegion, selectPlanningStatus } from '../state/planner';

export function RetryCatalogButton() {
  const dispatch = usePlannerDispatch();
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => dispatch({ type: 'catalogRequested' })}>
      <RotateCw aria-hidden="true" />
      Réessayer
    </Button>
  );
}

export interface PlanningGateProps {
  /** Ce que le panneau charge : « Chargement des étapes ». */
  loadingTitle: string;
  /** Ce que le panneau ne propose pas hors du secteur détaillé. */
  coverageTitle: string;
  /** Affiche le bouton d'ouverture du secteur ; un seul panneau le porte pour éviter la répétition. */
  offerRegion?: boolean;
  children: ReactNode;
}

/**
 * États communs aux panneaux de planification : attente et échec du catalogue,
 * puis couverture insuffisante hors du secteur détaillé. Le contenu n'est rendu
 * que lorsque la planification est possible. L'attente et l'échec sont annoncés
 * une seule fois, par le panneau de la carte.
 */
export function PlanningGate({ loadingTitle, coverageTitle, offerRegion = false, children }: PlanningGateProps) {
  const state = usePlannerState();
  const dispatch = usePlannerDispatch();
  const status = selectPlanningStatus(state);

  if (status === 'loading') {
    return (
      <DataState kind="loading" announce={false} title={loadingTitle}>
        <div className="mt-2 grid w-full gap-2">
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-3.5 w-3/5" />
        </div>
      </DataState>
    );
  }

  if (status === 'error') {
    return (
      <DataState
        kind="error"
        announce={false}
        title="Données indisponibles"
        description="Le catalogue de données n'a pas pu être chargé."
        action={<RetryCatalogButton />}
      />
    );
  }

  if (status === 'insufficient-coverage') {
    const regionName = selectDetailedRegion(state)?.name ?? 'Jezero';
    return (
      <DataState
        kind="insufficient-coverage"
        title={coverageTitle}
        description={`La vue globale sert à s'orienter. La planification détaillée n'est proposée que dans le secteur de ${regionName}.`}
        action={
          offerRegion ? (
            <Button type="button" size="sm" onClick={() => dispatch({ type: 'viewChanged', view: 'region' })}>
              Ouvrir {regionName}
            </Button>
          ) : undefined
        }
      />
    );
  }

  return children;
}
