import { useState } from 'react';
import { Plus, Archive, ArrowRight } from 'lucide-react';
import { Button } from '@marps/ui';
import {
  missionReducer as missionReducerForUI,
  validateMission as validateMissionForUI,
  type Mission,
  type MissionAction,
} from '@marps/mission-core';
import { usePlannerDispatch, usePlannerState } from '../state/PlannerProvider';
import { exampleMission } from './science';
import { MissionCard, CreateMission } from './MissionLibrary';
import { Plan } from './Plan';
import { Sources } from './Sources';
import { uid, now, type Act } from './shared';
import './workspace.css';
export function Workspace({ route }: { route: string }) {
  const state = usePlannerState();
  const dispatch = usePlannerDispatch();
  const [error, setError] = useState('');
  const manifest =
    state.catalog.status === 'ready' ? state.catalog.data.manifest : null;
  const act: Act = (action) => {
    try {
      dispatchChecked(action);
      setError('');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Modification impossible.');
      return false;
    }
  };
  function dispatchChecked(action: MissionAction) {
    // Validate before dispatch so errors stay in the form, outside the React reducer.
    const next =
      action.type === 'replace'
        ? action.mission
        : missionReducerForUI(state.mission, action);
    validateMissionForUI(next);
    dispatch({ type: 'missionAction', action, at: now() });
  }
  function create(mission: Mission) {
    dispatch({
      type: 'libraryAction',
      action: { type: 'create', mission, at: now() },
    });
    window.location.hash = '#/mission';
  }
  const archived = route === '#/historique';
  const records = state.library.records
    .filter((r) => r.archived === archived)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <main id="contenu" tabIndex={-1} className="workspace">
      {state.catalog.status === 'loading' && (
        <p role="status" className="work-notice">
          Chargement du catalogue scientifique de Jezero…
        </p>
      )}
      {state.catalog.status === 'error' && (
        <div role="alert" className="work-notice warning">
          <span>
            Catalogue indisponible. Vos missions sauvegardées restent
            accessibles.
          </span>
          <Button
            variant="outline"
            onClick={() => dispatch({ type: 'catalogRequested' })}
          >
            Réessayer
          </Button>
        </div>
      )}
      {!state.autoSave && (
        <div className="work-notice warning" role="alert">
          {state.storageMessage} Exportez vos plans avant de quitter cette page.
        </div>
      )}
      {error && (
        <div className="work-notice warning" role="alert">
          {error}
          <button onClick={() => setError('')} aria-label="Fermer l’erreur">
            ×
          </button>
        </div>
      )}
      {route === '#/nouvelle' ? (
        <CreateMission
          onCreate={create}
          onCancel={() => {
            window.location.hash = '#/missions';
          }}
        />
      ) : route === '#/sources' ? (
        <Sources />
      ) : route === '#/mission' && state.library.activeId ? (
        <Plan key={state.mission.id} act={act} />
      ) : (
        <>
          <div className="page-heading">
            <div>
              <p className="eyebrow">JEZERO · PLANIFICATION SCIENTIFIQUE</p>
              <h1>
                {archived
                  ? 'L’historique de vos plans'
                  : 'Vos prochaines explorations'}
              </h1>
              <p>
                {archived
                  ? 'Retrouvez vos plans archivés et leurs versions. Aucune sortie réelle n’est enregistrée ici.'
                  : 'Préparez un itinéraire, évaluez votre temps et gardez une trace de vos décisions.'}
              </p>
            </div>
            <a className="work-primary" href="#/nouvelle">
              <Plus size={18} />
              Nouvelle mission
            </a>
          </div>
          {!archived && (
            <div className="intro-grid">
              <section className="mission-intro">
                <p className="eyebrow">
                  UN TERRAIN RÉEL. UN SCÉNARIO À CONSTRUIRE.
                </p>
                <h2>
                  Explorez le delta
                  <br />
                  de Jezero.
                </h2>
                <p>
                  Trois sites étudiés par Perseverance pour imaginer votre
                  sortie scientifique à pied.
                </p>
                <div className="inline-actions">
                  <Button
                    disabled={!manifest}
                    onClick={() => {
                      try {
                        create(
                          exampleMission(
                            manifest!,
                            uid(),
                            'Exploration du delta · exemple',
                          ),
                        );
                      } catch (e) {
                        setError(String(e));
                      }
                    }}
                  >
                    Essayer un exemple <ArrowRight size={16} />
                  </Button>
                  <a href="#/sources">Comprendre les données ↗</a>
                </div>
                <p className="fine-print">
                  Exemple simulé · camp fictif · positions du catalogue NASA
                </p>
              </section>
              <div className="intro-steps">
                <p className="eyebrow">DE L’IDÉE AU PLAN</p>
                {[
                  [
                    '01',
                    'Définir la sortie',
                    'Choisissez un objectif et une enveloppe de temps.',
                  ],
                  [
                    '02',
                    'Composer le parcours',
                    'Reliez des stations et préparez leurs activités.',
                  ],
                  [
                    '03',
                    'Évaluer et conserver',
                    'Testez les imprévus, puis enregistrez une version.',
                  ],
                ].map(([n, t, d]) => (
                  <div key={n}>
                    <span>{n}</span>
                    <section>
                      <h3>{t}</h3>
                      <p>{d}</p>
                    </section>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="section-heading">
            <h2>
              {archived ? 'Plans archivés' : 'Missions en préparation'}{' '}
              <span className="count">{records.length}</span>
            </h2>
            <span className="muted">Enregistrés sur cet appareil</span>
          </div>
          {records.length ? (
            <div className="mission-grid">
              {records.map((r) => (
                <MissionCard
                  key={r.mission.id}
                  record={r}
                  onOpen={() => {
                    dispatch({
                      type: 'libraryAction',
                      action: { type: 'open', id: r.mission.id },
                    });
                    window.location.hash = '#/mission';
                  }}
                  onDuplicate={() =>
                    create({
                      ...r.mission,
                      id: uid(),
                      name: `${r.mission.name} · copie`,
                    })
                  }
                />
              ))}
            </div>
          ) : (
            <div className="empty-library">
              <Archive size={30} />
              <h3>
                {archived
                  ? 'Aucun plan archivé'
                  : 'Votre première mission commence ici'}
              </h3>
              <p>
                {archived
                  ? 'Archivez une mission pour la retrouver ici avec ses versions.'
                  : 'Créez une mission ou partez de l’exemple guidé du delta.'}
              </p>
            </div>
          )}
        </>
      )}
      <footer className="work-footer">
        <span>MARPS / Préparer, explorer, comprendre.</span>
        <a href="#/sources">Sources et hypothèses</a>
        <a href="#/systeme-design">Système de design</a>
      </footer>
    </main>
  );
}
