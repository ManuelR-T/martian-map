import { useState, type FormEvent } from 'react';
import { Check, MapPin, Plus, Route } from 'lucide-react';
import { Button } from '@marps/ui';
import { siteSheets } from '@marps/data';
import { missionReducer as missionReducerForUI } from '@marps/mission-core';
import { usePlannerState } from '../state/PlannerProvider';
import { siteNotes, scienceSource } from './science';
import { Section, uid, names, duration, type Act } from './shared';
export function RouteEditor({
  act,
  readonly,
}: {
  act: Act;
  readonly: boolean;
}) {
  const state = usePlannerState();
  const m = state.mission;
  const manifest =
    state.catalog.status === 'ready' ? state.catalog.data.manifest : null;
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');
  function coordinates(form: HTMLFormElement) {
    const f = new FormData(form);
    const position = {
      latitude: Number(f.get('latitude')),
      longitude: Number(f.get('longitude')),
    };
    const region = manifest?.regions.find((r) => r.id === m.regionId);
    if (
      !region ||
      !String(f.get('latitude')).trim() ||
      !String(f.get('longitude')).trim() ||
      position.latitude < region.extent.south ||
      position.latitude > region.extent.north ||
      position.longitude < region.extent.west ||
      position.longitude > region.extent.east
    )
      throw new Error(
        'Choisissez une position dans le secteur détaillé de Jezero.',
      );
    return { position, f };
  }
  function place(e: FormEvent<HTMLFormElement>, camp: boolean) {
    e.preventDefault();
    try {
      const { position, f } = coordinates(e.currentTarget);
      if (
        act(
          camp
            ? { type: 'camp', position }
            : {
                type: 'addStep',
                step: {
                  id: uid(),
                  name: String(f.get('name')).trim(),
                  position,
                  activities: [],
                },
              },
        )
      )
        setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Coordonnées invalides.');
    }
  }
  function addSite(siteId: string) {
    const site = manifest?.sites.find((s) => s.id === siteId);
    if (!site) return;
    const d = manifest?.datasets.find((d) => d.id === site.datasetId);
    const next = missionReducerForUI(m, {
      type: 'addStep',
      step: {
        id: uid(),
        name: site.name,
        siteId: site.id,
        position: site.coordinate,
        activities: [
          { id: uid(), type: 'photo', durationSeconds: 300 },
          { id: uid(), type: 'observation', durationSeconds: 900 },
        ],
      },
    });
    act({
      type: 'replace',
      mission: {
        ...next,
        dataReferences:
          d && !next.dataReferences.some((r) => r.id === d.id)
            ? [
                ...next.dataReferences,
                { id: d.id, version: d.version, sourceUrl: d.source.url },
              ]
            : next.dataReferences,
      },
    });
  }
  return (
    <>
      <Section
        eyebrow="POINT DE DÉPART"
        title="1. Votre camp fictif"
        actions={
          m.camp ? (
            <span className="work-tag">
              <Check size={13} />
              Placé
            </span>
          ) : (
            <span className="work-tag">À définir</span>
          )
        }
      >
        <p>
          Chaque sortie commence et se termine au camp. Son emplacement est un
          choix de simulation.
        </p>
        {m.camp ? (
          <p className="coordinate-line">
            <MapPin size={16} />
            {m.camp.latitude.toFixed(5)}° N · {m.camp.longitude.toFixed(5)}° E
          </p>
        ) : (
          <p className="empty-inline">Aucun camp placé pour le moment.</p>
        )}
        {!readonly && (
          <>
            <Button
              variant="outline"
              disabled={!manifest}
              onClick={() => {
                const r = manifest?.regions.find((r) => r.id === 'jezero');
                if (r)
                  act({
                    type: 'camp',
                    position: {
                      latitude: r.extent.south + 0.001,
                      longitude: r.extent.west + 0.002,
                    },
                  });
              }}
            >
              Utiliser le camp d’exemple
            </Button>
            <details className="advanced">
              <summary>Choisir des coordonnées précises</summary>
              <p className="fine-print">
                Secteur : latitude 18,445–18,465° N ; longitude 77,395–77,412°
                E.
              </p>
              <form className="form-stack" onSubmit={(e) => place(e, true)}>
                <div className="two-fields">
                  <label>
                    Latitude (° N)
                    <input
                      required
                      name="latitude"
                      type="number"
                      step="any"
                      defaultValue={m.camp?.latitude ?? 18.446}
                    />
                  </label>
                  <label>
                    Longitude (° E)
                    <input
                      required
                      name="longitude"
                      type="number"
                      step="any"
                      defaultValue={m.camp?.longitude ?? 77.397}
                    />
                  </label>
                </div>
                <Button>Appliquer au camp</Button>
              </form>
            </details>
          </>
        )}
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
      </Section>
      <Section eyebrow="STATIONS SCIENTIFIQUES" title="2. Composer le parcours">
        <p>
          Ajoutez une station, consultez son intérêt scientifique et ajustez les
          activités proposées.
        </p>
        {!readonly && (
          <div className="site-catalog">
            {manifest?.sites
              .filter((s) => s.regionId === m.regionId)
              .map((s) => {
                const sheet = siteSheets.find((sheet) => sheet.siteId === s.id);
                return (
                  <article className="site-choice" key={s.id}>
                    {sheet && (
                      <img
                        src={sheet.photo.path}
                        alt={`Affleurement de ${s.name} photographié par Perseverance`}
                        loading="lazy"
                      />
                    )}
                    <div>
                      <span className="eyebrow">
                        SITE NASA · {s.sol ? `SOLS ${s.sol}` : ''}
                      </span>
                      <h3>{s.name}</h3>
                      <p>{siteNotes[s.id]?.title ?? 'Site du catalogue'}</p>
                      <div className="inline-actions">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setSelected(selected === s.id ? null : s.id)
                          }
                        >
                          {selected === s.id
                            ? 'Fermer la fiche'
                            : 'Pourquoi ce site ?'}
                        </Button>
                        <Button size="sm" onClick={() => addSite(s.id)}>
                          <Plus size={14} />
                          Ajouter
                        </Button>
                      </div>
                    </div>
                    {selected === s.id && (
                      <div className="site-science">
                        <p>{siteNotes[s.id]?.description}</p>
                        <p>
                          <strong>Objectif proposé :</strong>{' '}
                          {siteNotes[s.id]?.question}
                        </p>
                        <p className="fine-print">
                          Prélèvements historiques : {s.sampleName} · {s.date}.
                          Activités humaines proposées : simulées.
                        </p>
                        {sheet && (
                          <p className="fine-print">
                            Photo : {sheet.photo.credit} · sol {sheet.photo.sol}
                            .{' '}
                            <a href={sheet.photo.originalUrl}>Image NASA ↗</a>
                          </p>
                        )}
                        {sheet && (
                          <div className="science-protocol">
                            <strong>Protocole de terrain proposé</strong>
                            <ol>
                              {sheet.tasks.map((task) => (
                                <li key={task.id}>
                                  <strong>{task.label}.</strong> {task.detail}
                                </li>
                              ))}
                            </ol>
                            <p className="fine-print">
                              Méthode proposée par l’équipe ; ajustez les
                              activités et leurs durées dans le parcours.
                            </p>
                          </div>
                        )}
                        <a href={scienceSource}>
                          Description scientifique · EPSC 2024 ↗
                        </a>
                      </div>
                    )}
                  </article>
                );
              })}
          </div>
        )}
        <ol className="ordered-stations">
          {m.steps.map((s, i) => (
            <li key={s.id}>
              <div className="station-number">{i + 1}</div>
              <div className="station-content">
                <div className="section-heading">
                  <div>
                    <h3>{s.name}</h3>
                    <p className="fine-print">
                      {s.siteId
                        ? 'Site scientifique du catalogue'
                        : 'Étape libre'}{' '}
                      ·{' '}
                      {duration(
                        s.activities.reduce((n, a) => n + a.durationSeconds, 0),
                      )}{' '}
                      sur place
                    </p>
                  </div>
                  {!readonly && (
                    <div className="inline-actions">
                      <button
                        className="icon-control"
                        aria-label={`Monter ${s.name}`}
                        disabled={i === 0}
                        onClick={() =>
                          act({ type: 'moveStep', id: s.id, offset: -1 })
                        }
                      >
                        ↑
                      </button>
                      <button
                        className="icon-control"
                        aria-label={`Descendre ${s.name}`}
                        disabled={i === m.steps.length - 1}
                        onClick={() =>
                          act({ type: 'moveStep', id: s.id, offset: 1 })
                        }
                      >
                        ↓
                      </button>
                      <button
                        className="text-link"
                        onClick={() => act({ type: 'removeStep', id: s.id })}
                      >
                        Retirer
                      </button>
                    </div>
                  )}
                </div>
                {s.activities.length ? (
                  <div className="activity-list">
                    {s.activities.map((a) => (
                      <form
                        key={`${a.id}:${a.durationSeconds}`}
                        className="activity-row"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const durationSeconds =
                            Number(
                              new FormData(e.currentTarget).get('minutes'),
                            ) * 60;
                          act({
                            type: 'activities',
                            stepId: s.id,
                            activities: s.activities.map((b) =>
                              b.id === a.id ? { ...b, durationSeconds } : b,
                            ),
                          });
                        }}
                      >
                        <label>
                          {names[a.type]}
                          <span className="activity-duration">
                            <input
                              aria-label={`${names[a.type]} à ${s.name} en minutes`}
                              type="number"
                              name="minutes"
                              min="0"
                              max="1000000"
                              step="any"
                              required
                              defaultValue={a.durationSeconds / 60}
                              disabled={readonly}
                            />{' '}
                            min
                          </span>
                        </label>
                        {!readonly && (
                          <>
                            <button className="text-link">Appliquer</button>
                            <button
                              type="button"
                              className="icon-control"
                              aria-label={`Retirer ${names[a.type]} à ${s.name}`}
                              onClick={() =>
                                act({
                                  type: 'activities',
                                  stepId: s.id,
                                  activities: s.activities.filter(
                                    (b) => b.id !== a.id,
                                  ),
                                })
                              }
                            >
                              ×
                            </button>
                          </>
                        )}
                      </form>
                    ))}
                  </div>
                ) : (
                  <p className="fine-print">Point de passage sans activité.</p>
                )}
                {!readonly && (
                  <div className="activity-add">
                    <span>Ajouter :</span>
                    {(['photo', 'observation', 'sampling'] as const).map(
                      (type) => (
                        <button
                          className="small-link"
                          key={type}
                          onClick={() =>
                            act({
                              type: 'activities',
                              stepId: s.id,
                              activities: [
                                ...s.activities,
                                {
                                  id: uid(),
                                  type,
                                  durationSeconds:
                                    type === 'sampling'
                                      ? 1800
                                      : type === 'photo'
                                        ? 300
                                        : 900,
                                },
                              ],
                            })
                          }
                        >
                          + {names[type]}
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
        {!m.steps.length && (
          <div className="empty-inline">
            Votre parcours est vide. Ajoutez une station du catalogue ci-dessus.
          </div>
        )}
        {!readonly && (
          <details className="advanced">
            <summary>Ajouter une étape libre par coordonnées</summary>
            <form onSubmit={(e) => place(e, false)} className="form-stack">
              <label>
                Nom de l’étape
                <input
                  required
                  name="name"
                  placeholder="Ex. Point d’observation"
                />
              </label>
              <div className="two-fields">
                <label>
                  Latitude (° N)
                  <input
                    name="latitude"
                    required
                    type="number"
                    step="any"
                    defaultValue="18.45"
                  />
                </label>
                <label>
                  Longitude (° E)
                  <input
                    name="longitude"
                    required
                    type="number"
                    step="any"
                    defaultValue="77.40"
                  />
                </label>
              </div>
              <Button>Ajouter au parcours</Button>
            </form>
          </details>
        )}
        <div className="return-line">
          <Route size={18} />
          <strong>Retour au camp</strong>
          <span>Inclus automatiquement dans le prévisionnel</span>
        </div>
      </Section>
      {!readonly && (
        <details className="work-card">
          <summary>Renommer cette mission</summary>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              act({
                type: 'rename',
                name: String(new FormData(e.currentTarget).get('name')).trim(),
              });
            }}
          >
            <label>
              Nom
              <input
                key={m.id + m.name}
                required
                name="name"
                defaultValue={m.name}
              />
            </label>
            <Button>Renommer</Button>
          </form>
        </details>
      )}
    </>
  );
}
