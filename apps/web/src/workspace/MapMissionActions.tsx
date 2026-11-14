import { Button, Panel } from '@marps/ui';
import { findSiteSheet } from '@marps/data';
import { useState } from 'react';
import { missionReducer } from '@marps/mission-core';
import { usePlannerDispatch, usePlannerState } from '../state/PlannerProvider';
import { siteWorkOf } from '../sites/siteWork';
import { addCatalogVisit } from './visits';

/** Bridge beside dev's panels: their map, site sheets and field checklist stay unchanged. */
export function MapMissionActions({ className }: { className?: string }) {
  const state = usePlannerState();
  const dispatch = usePlannerDispatch();
  const [message, setMessage] = useState('');
  const record = state.library.records.find(
    (r) => r.mission.id === state.library.activeId,
  );
  const site =
    state.catalog.status === 'ready'
      ? state.catalog.data.sites.find((s) => s.id === state.selectedSiteId)
      : undefined;
  const manifest =
    state.catalog.status === 'ready' ? state.catalog.data.manifest : undefined;
  function add() {
    if (!record || record.archived || !site || !manifest) return;
    const sheet = findSiteSheet(site.id);
    const minutes = sheet
      ? siteWorkOf(state.siteWork, sheet).allottedMinutes
      : 20;
    try {
      const mission = addCatalogVisit(
        state.mission,
        manifest,
        site.id,
        crypto.randomUUID(),
        minutes,
      );
      missionReducer(state.mission, { type: 'replace', mission });
      dispatch({
        type: 'missionAction',
        action: { type: 'replace', mission },
        at: new Date().toISOString(),
      });
      setMessage(`${site.name} ajouté au plan (${minutes} min sur place).`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Ajout impossible.');
    }
  }
  return (
    <Panel
      title="Plan de mission"
      className={`${className ?? ''} mission-plan-actions`}
      contentClassName="grid gap-3 text-sm p-3"
    >
      {record ? (
        <>
          <p className="font-semibold">
            {record.mission.name}
            {record.archived ? ' · archivée' : ''}
          </p>
          <a href="#/mission" className="underline">
            Ouvrir le parcours et le prévisionnel →
          </a>
          {!record.archived && (
            <Button
              size="sm"
              disabled={!site || !manifest || state.view !== 'region'}
              onClick={add}
            >
              {site
                ? `Ajouter ${site.name} au plan`
                : 'Choisir un site dans sa fiche'}
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Le temps est copié lors de l’ajout. Modifier ensuite la fiche ou
            cocher une tâche ne modifie pas le plan simulé.
          </p>
        </>
      ) : (
        <>
          <p>
            Créez une mission pour préparer un parcours et calculer son budget.
          </p>
          <a href="#/nouvelle" className="underline">
            Créer une mission →
          </a>
        </>
      )}
      <a href="#/missions" className="underline">
        Toutes mes missions
      </a>
      {message && <p role="status">{message}</p>}
    </Panel>
  );
}
