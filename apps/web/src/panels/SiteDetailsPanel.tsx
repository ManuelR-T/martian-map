import { findSiteSheet } from '@marps/data';
import { DataState, Panel } from '@marps/ui';
import { SitePicker, SiteSheetView } from '../sites/SiteSheetView';
import { siteWorkOf } from '../sites/siteWork';
import { usePlannerDispatch, usePlannerState } from '../state/PlannerProvider';
import { selectCurrentMission } from '../state/planner';
import { PlanningGate } from './PlanningGate';

export function SiteDetailsPanel({ className }: { className?: string }) {
  const state = usePlannerState();
  const { catalog, selectedSiteId, workspace, runningMission } = state;
  const mission = selectCurrentMission(state);
  const dispatch = usePlannerDispatch();
  const sites = catalog.status === 'ready' ? catalog.data.sites : [];
  const sheet = selectedSiteId ? findSiteSheet(selectedSiteId) : undefined;

  if (workspace === 'mission' && !runningMission) return null;

  return (
    <Panel
      title="Fiche de site"
      collapsible
      floating
      className={className}
      contentClassName="overflow-y-auto px-3 py-2"
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
              tracking={workspace === 'mission' && runningMission !== null}
              work={siteWorkOf(mission.siteWork, sheet)}
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
      </PlanningGate>
    </Panel>
  );
}
