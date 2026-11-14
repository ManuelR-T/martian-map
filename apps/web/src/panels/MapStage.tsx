import type { ReactNode } from 'react';
import { Globe, MapPinned } from 'lucide-react';
import { DataState, SegmentedControl, type SegmentedOption } from '@marps/ui';
import { formatCoordinate } from '../format';
import { usePlannerDispatch, usePlannerState } from '../state/PlannerProvider';
import { selectDetailedRegion, selectMapStatus, type MapView } from '../state/planner';
import { RetryCatalogButton } from './PlanningGate';

/** Surface commune des commandes posées sur la carte : verre presque opaque, lisible sur l'imagerie. */
const floatingSurface = 'glass pointer-events-auto border';

export interface MapStageProps {
  className?: string;
  /** Carte OpenLayers de la vue active, montée par #7 (globale) et #8 (Jezero). */
  map?: ReactNode;
}

/**
 * La carte et ses commandes. Le fond s'étend sous toute l'interface ; le
 * sélecteur de vue, l'état de la carte et le repère flottent par-dessus.
 */
export function MapStage({ className, map }: MapStageProps) {
  const state = usePlannerState();
  const dispatch = usePlannerDispatch();
  const status = selectMapStatus(state);
  const region = selectDetailedRegion(state);
  const regionName = region?.name ?? 'Jezero';
  const global = state.view === 'global';
  const showsMap = status === 'ready' && Boolean(map);

  const views: readonly SegmentedOption<MapView>[] = [
    { value: 'global', label: 'Vue globale', icon: <Globe aria-hidden="true" /> },
    { value: 'region', label: regionName, icon: <MapPinned aria-hidden="true" /> },
  ];

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

      <div className={`${floatingSurface} power-on relative z-10 flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 p-1.5`}>
        <SegmentedControl
          label="Vue de la carte"
          value={state.view}
          options={views}
          onValueChange={(view) => dispatch({ type: 'viewChanged', view })}
        />
        <p className="pr-2 text-sm text-muted-foreground">
          {global ? "Mars entière, pour s'orienter" : `Secteur de ${regionName}`}
        </p>
      </div>

      {notice ? <div className="power-on pointer-events-auto relative z-10 w-full max-w-sm [--power-delay:480ms]">{notice}</div> : null}

      {region ? (
        <p className={`${floatingSurface} relative z-10 flex max-w-full flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-1.5 text-sm`}>
          <span className="label-caps text-muted-foreground">Repère {region.name}</span>
          <span className="font-semibold tabular-nums">{formatCoordinate(region.center)}</span>
          <span className="text-muted-foreground">approximatif</span>
        </p>
      ) : (
        <span aria-hidden="true" />
      )}
    </section>
  );
}
