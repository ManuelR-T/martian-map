import { findSiteSheet } from '@marps/data';
import { DataState, Panel } from '@marps/ui';
import { SitePicker, SiteSheetView } from '../sites/SiteSheetView';
import { siteWorkOf } from '../sites/siteWork';
import { usePlannerDispatch, usePlannerState } from '../state/PlannerProvider';
import { SiteProvenance } from './Provenance';
import { PlanningGate } from './PlanningGate';

export function SiteDetailsPanel({ className, collapsible = true }: { className?: string; collapsible?: boolean }) {
  const { catalog, selectedSiteId, siteWork } = usePlannerState();
  const dispatch = usePlannerDispatch();
  const sites = catalog.status === 'ready' ? catalog.data.sites : [];
  const sheet = selectedSiteId ? findSiteSheet(selectedSiteId) : undefined;

  return (
    <Panel
      title="Fiche de site"
      collapsible={collapsible}
      floating
      className={className}
      contentClassName="overflow-y-auto p-3"
    >
      <PlanningGate loadingTitle="Chargement des fiches" coverageTitle="Pas de fiche hors du secteur détaillé">
        <div className="grid gap-1.5">
          {sites.length > 0 ? (
            <SitePicker
              sites={sites}
              selectedSiteId={selectedSiteId}
              onSelect={(siteId) => dispatch({ type: 'siteSelected', siteId })}
            />
          ) : null}
          {sheet ? (
            <SiteSheetView
              sheet={sheet}
              work={siteWorkOf(siteWork, sheet)}
              onTaskToggle={(taskId) => dispatch({ type: 'siteTaskToggled', sheet, taskId })}
              onAllottedChange={(minutes) => dispatch({ type: 'siteAllottedChanged', sheet, minutes })}
            />
          ) : selectedSiteId ? (
            <DataState
              kind="empty"
              title="Fiche indisponible"
              description="Aucune fiche n'existe pour le site sélectionné."
            />
          ) : (
            <DataState kind="empty" title="Aucun site sélectionné" description="Choisissez un site pour voir sa fiche." />
          )}
        </div>
        {selectedSiteId ? <SiteProvenance siteId={selectedSiteId} /> : null}
      </PlanningGate>
    </Panel>
  );
}
