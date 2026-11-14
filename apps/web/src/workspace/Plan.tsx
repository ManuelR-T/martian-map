import { useState } from 'react';
import {
  Archive,
  ArrowRight,
  ChevronLeft,
  Clock3,
  Download,
  Layers,
  Route,
} from 'lucide-react';
import { Button } from '@marps/ui';
import { calculateBudget } from '@marps/mission-core';
import { usePlannerState, usePlannerDispatch } from '../state/PlannerProvider';
import { downloadMission } from '../export';
import { RouteEditor } from './RouteEditor';
import { Forecast } from './Forecast';
import { RouteSchematic } from './RouteSchematic';
import { Section, date, duration, now, uid, type Act } from './shared';
export function Plan({ act }: { act: Act }) {
  const state = usePlannerState();
  const dispatch = usePlannerDispatch();
  const m = state.mission;
  const record = state.library.records.find((r) => r.mission.id === m.id)!;
  const [tab, setTab] = useState('route');
  const b = calculateBudget(m);
  const [notice, setNotice] = useState('');
  const ready = !!b;
  return (
    <>
      <a
        href={record.archived ? '#/historique' : '#/missions'}
        className="back-link"
      >
        <ChevronLeft size={16} />
        {record.archived ? 'Historique' : 'Mes missions'}
      </a>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            JEZERO /{' '}
            {record.archived ? 'PLAN ARCHIVÉ' : 'MISSION EN PRÉPARATION'}
          </p>
          <h1>{m.name}</h1>
          {m.objective && <p>{m.objective}</p>}
          <p>
            {record.archived
              ? 'Ce plan est conservé en lecture seule.'
              : state.autoSave
                ? 'Modifications enregistrées automatiquement sur cet appareil.'
                : 'Sauvegarde suspendue.'}
          </p>
        </div>
        <div className="inline-actions">
          <Button
            variant="outline"
            onClick={() =>
              downloadMission(
                m,
                state.catalog.status === 'ready' ? state.catalog.data : null,
              )
            }
          >
            <Download size={16} />
            JSON
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            Imprimer
          </Button>
        </div>
      </div>
      <div
        className="workflow-tabs"
        role="tablist"
        aria-label="Préparation de mission"
        onKeyDown={(event) => {
          const tabs = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              '[role=tab]',
            ),
          );
          const index = tabs.indexOf(event.target as HTMLButtonElement);
          if (
            index < 0 ||
            !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
          )
            return;
          event.preventDefault();
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? tabs.length - 1
                : (index +
                    (event.key === 'ArrowRight' ? 1 : -1) +
                    tabs.length) %
                  tabs.length;
          tabs[next]?.focus();
          tabs[next]?.click();
        }}
      >
        {[
          ['route', '01', 'Parcours et activités', Route],
          ['forecast', '02', 'Prévisionnel', Clock3],
          ['history', '03', 'Versions et historique', Archive],
        ].map(([key, n, label, Icon]) => {
          const Symbol = Icon as typeof Route;
          return (
            <button
              key={String(key)}
              role="tab"
              id={`tab-${key}`}
              aria-selected={tab === key}
              tabIndex={tab === key ? 0 : -1}
              aria-controls="mission-tab"
              onClick={() => setTab(String(key))}
            >
              <Symbol size={18} />
              <span className="tab-number">{String(n)}</span>
              {String(label)}
            </button>
          );
        })}
      </div>
      {notice && (
        <p role="status" className="work-notice">
          {notice}
        </p>
      )}
      <div id="mission-tab" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'route' ? (
          <div className="planning-grid">
            <div>
              <RouteEditor act={act} readonly={record.archived} />
              <div className="next-step">
                <p>
                  {ready
                    ? 'Votre parcours est prêt à être évalué.'
                    : 'Ajoutez un camp et au moins une étape pour calculer le budget.'}
                </p>
                <Button disabled={!ready} onClick={() => setTab('forecast')}>
                  Voir le prévisionnel <ArrowRight size={16} />
                </Button>
              </div>
            </div>
            <aside>
              <Section eyebrow="VUE DU PARCOURS" title="Du camp au retour">
                <RouteSchematic mission={m} />
                <p className="fine-print">
                  Schéma des positions, sans fond ni validation de
                  franchissabilité. Les segments directs ne sont pas des chemins
                  reconnus.
                </p>
              </Section>
              <Section
                eyebrow="CARTE ET FICHES SCIENTIFIQUES"
                title="Explorer le secteur de Jezero"
              >
                <p>
                  Imagerie HiRISE, couverture des données, sites cliquables et
                  trace historique de Perseverance sont disponibles sur la carte
                  principale.
                </p>
                <a
                  href="#/"
                  className="work-primary"
                  onClick={() =>
                    dispatch({ type: 'viewChanged', view: 'region' })
                  }
                >
                  <Layers size={16} />
                  Ouvrir la carte de Jezero
                </a>
                <p className="fine-print">
                  Votre plan reste sauvegardé. Le schéma ci-dessus décrit le
                  parcours prévu ; la trace du rover est historique.
                </p>
              </Section>
              <Section eyebrow="EN UN COUP D’ŒIL" title="Votre enveloppe">
                <dl className="summary-list">
                  <div>
                    <dt>Durée disponible</dt>
                    <dd>{duration(m.parameters.availableSeconds)}</dd>
                  </div>
                  <div>
                    <dt>Réserve protégée</dt>
                    <dd>{duration(m.parameters.reserveSeconds)}</dd>
                  </div>
                  <div>
                    <dt>Étapes</dt>
                    <dd>{m.steps.length}</dd>
                  </div>
                  <div>
                    <dt>Marge prévisionnelle</dt>
                    <dd>{b ? duration(b.marginSeconds) : 'À calculer'}</dd>
                  </div>
                </dl>
                <button
                  className="text-link"
                  onClick={() => setTab('forecast')}
                >
                  Ajuster dans le prévisionnel →
                </button>
              </Section>
            </aside>
          </div>
        ) : tab === 'forecast' ? (
          <Forecast act={act} readonly={record.archived} />
        ) : (
          <Section
            eyebrow="TRAÇABILITÉ DU PLAN"
            title="Conserver vos décisions"
          >
            <p>
              La sauvegarde automatique conserve le plan courant. Une version
              est un instantané daté que vous choisissez de garder.
            </p>
            {!record.archived && (
              <form
                className="inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const label = String(
                    new FormData(e.currentTarget).get('label'),
                  ).trim();
                  if (!label) return;
                  dispatch({
                    type: 'libraryAction',
                    action: {
                      type: 'checkpoint',
                      id: m.id,
                      revisionId: uid(),
                      label,
                      at: now(),
                    },
                  });
                  e.currentTarget.reset();
                  setNotice(
                    'Version conservée dans l’historique de cette mission.',
                  );
                }}
              >
                <label>
                  Nom de la version
                  <input
                    name="label"
                    required
                    placeholder="Ex. Parcours initial avant imprévus"
                  />
                </label>
                <Button>Enregistrer cette version</Button>
              </form>
            )}
            <ol className="revision-list">
              {record.revisions.map((v) => (
                <li key={v.id}>
                  <div>
                    <strong>{v.label}</strong>
                    <p>
                      {date(v.at)} · {v.mission.steps.length} étapes ·{' '}
                      {calculateBudget(v.mission)
                        ? duration(calculateBudget(v.mission)!.marginSeconds) +
                          ' de marge'
                        : 'budget incomplet'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      dispatch({
                        type: 'libraryAction',
                        action: {
                          type: 'create',
                          mission: {
                            ...v.mission,
                            id: uid(),
                            name: `${v.mission.name} · ${v.label}`,
                          },
                          at: now(),
                        },
                      });
                      setNotice(
                        'Version restaurée dans une nouvelle mission ; l’original est conservé.',
                      );
                      setTab('route');
                    }}
                  >
                    Restaurer en nouvelle mission
                  </Button>
                </li>
              ))}
            </ol>
            {!record.revisions.length && (
              <p className="empty-inline">
                Aucune version enregistrée pour le moment.
              </p>
            )}
            <div className="archive-actions">
              <Button
                variant="outline"
                onClick={() => {
                  dispatch({
                    type: 'libraryAction',
                    action: {
                      type: 'archive',
                      id: m.id,
                      archived: !record.archived,
                      at: now(),
                    },
                  });
                  setNotice(
                    record.archived
                      ? 'Mission remise en préparation.'
                      : 'Plan archivé avec ses versions.',
                  );
                }}
              >
                <Archive size={16} />
                {record.archived
                  ? 'Remettre en préparation'
                  : 'Archiver ce plan'}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (
                    window.confirm(
                      'Supprimer définitivement cette mission et ses versions de cet appareil ?',
                    )
                  ) {
                    dispatch({
                      type: 'libraryAction',
                      action: { type: 'delete', id: m.id },
                    });
                    window.location.hash = '#/missions';
                  }
                }}
              >
                Supprimer la mission
              </Button>
            </div>
            <p className="fine-print">
              Créée le {date(record.createdAt)}. Modifiée le{' '}
              {date(record.updatedAt)}. Historique de plans simulés, sans
              journal de sorties réelles.
            </p>
          </Section>
        )}
      </div>
    </>
  );
}
