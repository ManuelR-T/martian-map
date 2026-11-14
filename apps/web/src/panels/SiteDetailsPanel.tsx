import type { ReactNode } from 'react';
import { DataState, Panel } from '@marps/ui';
import { usePlannerState } from '../state/PlannerProvider';
import { PlanningGate } from './PlanningGate';

export interface SiteDetailsPanelProps {
  className?: string;
  /** Fiche scientifique du site sélectionné (#9) ; `null` si aucune fiche n'existe pour lui. */
  renderSite?: (siteId: string) => ReactNode;
}

export function SiteDetailsPanel({ className, renderSite }: SiteDetailsPanelProps) {
  const { selectedSiteId } = usePlannerState();
  const sheet = selectedSiteId && renderSite ? renderSite(selectedSiteId) : null;

  return (
    <Panel
      title="Fiche de site"
      description="Intérêt scientifique de l'arrêt sélectionné"
      collapsible
      floating
      className={className}
      contentClassName="overflow-y-auto"
    >
      <PlanningGate loadingTitle="Chargement des fiches" coverageTitle="Pas de fiche hors du secteur détaillé">
        {sheet ??
          (selectedSiteId ? (
            <DataState
              kind="empty"
              title="Fiche indisponible"
              description="Aucune fiche scientifique n'existe pour le site sélectionné."
            />
          ) : (
            <DataState
              kind="empty"
              title="Aucun site sélectionné"
              description="La fiche d'un site s'affiche ici quand vous le sélectionnez sur la carte ou dans les étapes."
            />
          ))}
      </PlanningGate>
    </Panel>
  );
}
