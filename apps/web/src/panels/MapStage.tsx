import type { ReactNode } from 'react';
import { DataState } from '@marps/ui';
import { usePlannerState } from '../state/PlannerProvider';
import { selectDetailedRegion, selectMapStatus } from '../state/planner';
import { RetryCatalogButton } from './PlanningGate';

export interface MapStageProps {
  className?: string;
  /** Carte OpenLayers de la vue active, montée par #7 (globale) et #8 (Jezero). */
  map?: ReactNode;
}

/**
 * La carte remplit son conteneur ; ses états de chargement ou d’erreur flottent par-dessus.
 */
export function MapStage({ className, map }: MapStageProps) {
  const state = usePlannerState();
  const status = selectMapStatus(state);
  const region = selectDetailedRegion(state);
  const regionName = region?.name ?? 'Jezero';
  const global = state.view === 'global';
  const showsMap = status === 'ready' && Boolean(map);

  let notice: ReactNode = null;
  if (status === 'loading') {
    notice = <DataState kind="loading" align="center" floating title="Chargement de la carte" />;
  } else if (status === 'error') {
    notice = (
      <DataState
        kind="error"
        align="center"
        floating
        title="La carte n'a pas pu être chargée"
        description={
          <>
            <p>Le catalogue de données est inaccessible. Vérifiez la connexion, puis réessayez.</p>
            {state.catalog.status === 'error' ? (
              <p className="mt-1 break-words">Détail : {state.catalog.message}</p>
            ) : null}
          </>
        }
        action={<RetryCatalogButton />}
      />
    );
  } else if (!showsMap) {
    notice = (
      <DataState
        kind="empty"
        align="center"
        floating
        title="Aucun fond de carte disponible"
        description={
          global
            ? "Le fond de carte de Mars n'est pas encore intégré à cette version."
            : `L'imagerie détaillée de ${regionName} n'est pas encore intégrée à cette version.`
        }
      />
    );
  }

  return (
    <section aria-labelledby="carte-titre" className={className}>
      <h2 id="carte-titre" className="sr-only">
        Carte
      </h2>

      {/*
        Fond : en mobile il remplit ce bloc, sur grand écran il passe sous toute l'interface.
        Sans carte, un décor d'attente le remplace : le limbe de Mars en vue globale, le
        quadrillage du secteur sinon. Ce n'est pas une donnée ; l'état affiché par-dessus le dit.
      */}
      <div
        className={`pointer-events-auto absolute inset-0 z-0 overflow-hidden ${showsMap ? 'bg-mars-surface' : 'stage-backdrop'} ${status === 'loading' ? 'scan' : ''}`}
      >
        {showsMap ? (
          map
        ) : (
          <div aria-hidden="true">
            <div
              className={`graticule absolute inset-0 transition-opacity duration-700 ${global ? 'opacity-40' : 'opacity-100'}`}
            />
            <div
              className={`planet-limb absolute top-[62%] left-1/2 aspect-square w-[max(150%,70rem)] -translate-x-1/2 transition-[opacity,translate] duration-700 ease-instrument ${global ? 'opacity-100' : 'translate-y-[12%] opacity-0'}`}
            />
          </div>
        )}
      </div>

      {notice ? <div className="power-on pointer-events-auto relative z-10 w-full max-w-sm [--power-delay:480ms]">{notice}</div> : null}


    </section>
  );
}
