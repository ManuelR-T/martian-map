import { useState, type ReactNode } from 'react';
import {
  calculateBudget,
  calculateOxygen,
  createEmptyMission,
  missionReducer,
  routeSegments,
  type MissionAction,
  type ActivityType,
  type MissionParameters,
} from '@marps/mission-core';
import { Button } from '@marps/ui';
import { usePlannerDispatch, usePlannerState } from '../state/PlannerProvider';
import { missingSites, STORAGE_KEY } from '../state/storage';
import { downloadMission } from '../export';

const activityNames = {
  photo: 'Photo',
  observation: 'Observation',
  sampling: 'Prélèvement',
};
const defaults = { photo: 5, observation: 15, sampling: 30 };
const inputClass =
  'w-full border border-input bg-background p-2 text-foreground';
const id = () => crypto.randomUUID();
export function NumericField({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
}) {
  const [invalid, setInvalid] = useState(false);
  return (
    <label className="grid gap-1 text-sm">
      {label}
      <input
        className={inputClass}
        type="number"
        step="any"
        min={min}
        required
        defaultValue={value}
        key={value}
        aria-invalid={invalid}
        onBlur={(e) => {
          const n = e.currentTarget.valueAsNumber;
          e.currentTarget.value = String(value);
          if (!Number.isFinite(n) || n < min || n > 1e9) {
            setInvalid(true);
            return;
          }
          setInvalid(false);
          onChange(n);
        }}
      />
      {invalid && (
        <span role="alert" className="text-danger">
          Saisissez un nombre entre {min} et 10⁹. La valeur précédente est
          conservée.
        </span>
      )}
    </label>
  );
}
export function MissionEditor() {
  const state = usePlannerState();
  const { mission: m } = state;
  const dispatch = usePlannerDispatch();
  const [error, setError] = useState('');

  const [lat, setLat] = useState('18.45');
  const [lon, setLon] = useState('77.40');
  const [name, setName] = useState('Nouvelle étape');
  const [activityTarget, setActivityTarget] = useState('');
  const [segmentTarget, setSegmentTarget] = useState('all');
  const [delay, setDelay] = useState(10);
  const [factor, setFactor] = useState(1.5);
  function apply(action: MissionAction) {
    try {
      missionReducer(m, action);
      dispatch({ type: 'missionAction', action });
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Modification invalide.');
    }
  }
  function position() {
    if (!lat.trim() || !lon.trim())
      throw new Error('Renseignez latitude et longitude.');
    const p = { latitude: Number(lat), longitude: Number(lon) };
    const region =
      state.catalog.status === 'ready'
        ? state.catalog.data.manifest?.regions.find((r) => r.id === 'jezero')
        : null;
    if (
      !region ||
      p.longitude < region.extent.west ||
      p.longitude > region.extent.east ||
      p.latitude < region.extent.south ||
      p.latitude > region.extent.north
    )
      throw new Error('Position hors du secteur détaillé de Jezero.');
    return p;
  }
  function place(camp: boolean) {
    try {
      const p = position();
      apply(
        camp
          ? { type: 'camp', position: p }
          : {
              type: 'addStep',
              step: { id: id(), name, position: p, activities: [] },
            },
      );
    } catch (e) {
      setError(String(e));
    }
  }
  const manifest =
    state.catalog.status === 'ready' ? state.catalog.data.manifest : null;
  const missing = manifest
    ? missingSites(
        m,
        manifest.sites.map((s) => s.id),
      )
    : [];
  function parameter(
    key: 'availableSeconds' | 'reserveSeconds' | 'speedKmh',
    value: number,
  ) {
    apply({
      type: 'parameters',
      parameters: { ...m.parameters, [key]: value },
    });
  }
  function reset(remove: boolean) {
    try {
      if (remove) window.localStorage.removeItem(STORAGE_KEY);
      dispatch({
        type: 'missionAction',
        action: { type: 'replace', mission: createEmptyMission('jezero') },
      });
      dispatch({
        type: 'storageStatus',
        autoSave: !remove,
        message: remove
          ? 'Mission supprimée du stockage. Sauvegarde automatique suspendue.'
          : 'Mission réinitialisée.',
      });
    } catch {
      setError('Suppression impossible : stockage indisponible.');
    }
  }
  return (
    <div className="grid gap-4 text-sm mission-editor">
      {error && (
        <p
          role="alert"
          className="border-l-4 border-danger-border p-2 text-danger"
        >
          {error}
        </p>
      )}
      <label className="grid gap-1">
        Nom de la mission
        <input
          className={inputClass}
          defaultValue={m.name}
          key={m.name}
          onBlur={(e) => {
            const name = e.target.value;
            e.target.value = m.name;
            apply({ type: 'rename', name });
          }}
        />
      </label>
      <p role="status">{state.storageMessage}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() =>
            dispatch({
              type: 'storageStatus',
              autoSave: true,
              message: 'Sauvegarde automatique activée.',
            })
          }
        >
          Sauvegarder
        </Button>
        <Button size="sm" variant="outline" onClick={() => reset(false)}>
          Réinitialiser
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (
              window.confirm(
                'Supprimer la mission sauvegardée sur cet appareil ?',
              )
            )
              reset(true);
          }}
        >
          Supprimer
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            downloadMission(
              m,
              state.catalog.status === 'ready' ? state.catalog.data : null,
            )
          }
        >
          Exporter JSON
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          Fiche imprimable
        </Button>
      </div>
      {!!missing.length && (
        <p role="alert">
          Sites absents du catalogue : {missing.join(', ')}. Les positions
          sauvegardées sont conservées.
        </p>
      )}
      {m.regionId !== 'jezero' ? (
        <p role="alert">
          Cette région ne possède pas d’éditeur détaillé. Réinitialisez pour
          planifier à Jezero.
        </p>
      ) : (
        <>
          <fieldset className="grid gap-2 border p-2">
            <legend>Camp fictif et étape libre</legend>
            <p>
              Coordonnées planétocentriques en degrés, longitude positive vers
              l’est. Secteur : 77,395–77,412° E ; 18,445–18,465° N.
            </p>
            <label>
              Latitude
              <input
                aria-label="Latitude"
                className={inputClass}
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </label>
            <label>
              Longitude
              <input
                aria-label="Longitude"
                className={inputClass}
                type="number"
                step="any"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
              />
            </label>
            <Button size="sm" onClick={() => place(true)}>
              {m.camp ? 'Déplacer le camp' : 'Placer le camp'}
            </Button>
            <p>
              {m.camp
                ? `Camp fictif : ${m.camp.latitude}° N, ${m.camp.longitude}° E`
                : 'Camp non placé'}
            </p>
            <label>
              Nom de l’étape
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <Button size="sm" onClick={() => place(false)}>
              Ajouter une étape libre
            </Button>
          </fieldset>
          <label className="grid gap-1">
            Ajouter un site NASA
            <select
              className={inputClass}
              value=""
              onChange={(e) => {
                const site = manifest?.sites.find(
                  (s) => s.id === e.target.value,
                );
                if (!site) return;
                const dataset = manifest?.datasets.find(
                  (d) => d.id === site.datasetId,
                );
                const next = missionReducer(m, {
                  type: 'addStep',
                  step: {
                    id: id(),
                    name: site.name,
                    siteId: site.id,
                    position: site.coordinate,
                    activities: [],
                  },
                });
                apply({
                  type: 'replace',
                  mission: {
                    ...next,
                    dataReferences:
                      dataset &&
                      !m.dataReferences.some((r) => r.id === dataset.id)
                        ? [
                            ...m.dataReferences,
                            {
                              id: dataset.id,
                              version: dataset.version,
                              sourceUrl: dataset.source.url,
                            },
                          ]
                        : m.dataReferences,
                  },
                });
              }}
            >
              <option value="">Choisir un site…</option>
              {manifest?.sites
                .filter((s) => s.regionId === m.regionId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
          <ol className="grid gap-3">
            {m.steps.map((s, i) => (
              <li key={s.id} className="grid gap-2 border p-2">
                <strong>
                  {i + 1}. {s.name}
                </strong>
                <p>
                  {s.position.latitude}° N, {s.position.longitude}° E ·{' '}
                  {s.siteId ? 'Site du catalogue' : 'Étape libre'}
                </p>
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={i === 0}
                    aria-label={`Monter ${s.name}`}
                    onClick={() =>
                      apply({ type: 'moveStep', id: s.id, offset: -1 })
                    }
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={i === m.steps.length - 1}
                    aria-label={`Descendre ${s.name}`}
                    onClick={() =>
                      apply({ type: 'moveStep', id: s.id, offset: 1 })
                    }
                  >
                    ↓
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => apply({ type: 'removeStep', id: s.id })}
                  >
                    Retirer
                  </Button>
                </div>
                {s.activities.map((a) => (
                  <div key={a.id} className="grid gap-1">
                    <NumericField
                      label={`${activityNames[a.type]} (min, simulé)`}
                      value={a.durationSeconds / 60}
                      onChange={(n) =>
                        apply({
                          type: 'activities',
                          stepId: s.id,
                          activities: s.activities.map((b) =>
                            b.id === a.id
                              ? { ...b, durationSeconds: n * 60 }
                              : b,
                          ),
                        })
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        apply({
                          type: 'activities',
                          stepId: s.id,
                          activities: s.activities.filter((b) => b.id !== a.id),
                        })
                      }
                    >
                      Retirer l’activité
                    </Button>
                  </div>
                ))}
                <select
                  aria-label={`Ajouter une activité à ${s.name}`}
                  className={inputClass}
                  value=""
                  onChange={(e) => {
                    const type = e.target.value as ActivityType;
                    apply({
                      type: 'activities',
                      stepId: s.id,
                      activities: [
                        ...s.activities,
                        {
                          id: id(),
                          type,
                          durationSeconds: defaults[type] * 60,
                        },
                      ],
                    });
                  }}
                >
                  <option value="">Ajouter une activité…</option>
                  {Object.entries(activityNames).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ol>
          <fieldset className="grid gap-2 border p-2">
            <legend>Paramètres simulés</legend>
            <NumericField
              label="Durée disponible, réserve incluse (min)"
              value={m.parameters.availableSeconds / 60}
              onChange={(n) => parameter('availableSeconds', n * 60)}
            />
            <NumericField
              label="Réserve protégée (min)"
              value={m.parameters.reserveSeconds / 60}
              onChange={(n) => parameter('reserveSeconds', n * 60)}
            />
            <NumericField
              label="Vitesse (km/h)"
              value={m.parameters.speedKmh}
              onChange={(n) => parameter('speedKmh', n)}
              min={0.01}
            />
          </fieldset>
          <details>
            <summary>Événements simulés</summary>
            <div className="grid gap-2 py-2">
              <label>
                Activité ciblée
                <select
                  className={inputClass}
                  value={activityTarget}
                  onChange={(e) => setActivityTarget(e.target.value)}
                >
                  <option value="">Choisir…</option>
                  {m.steps.flatMap((s) =>
                    s.activities.map((a) => (
                      <option key={a.id} value={a.id}>
                        {s.name} · {activityNames[a.type]}
                      </option>
                    )),
                  )}
                </select>
              </label>
              <NumericField
                label="Retard simulé (min)"
                value={delay}
                onChange={setDelay}
              />
              <Button
                size="sm"
                disabled={!activityTarget}
                onClick={() =>
                  apply({
                    type: 'addEvent',
                    event: {
                      id: id(),
                      type: 'delay',
                      activityId: activityTarget,
                      seconds: delay * 60,
                    },
                  })
                }
              >
                Simuler un retard
              </Button>
              <label>
                Portions de marche
                <select
                  className={inputClass}
                  value={segmentTarget}
                  onChange={(e) => setSegmentTarget(e.target.value)}
                >
                  <option value="all">Tout le parcours, retour inclus</option>
                  {routeSegments(m).map((s, i) => (
                    <option key={s.id} value={s.id}>
                      {s.returning ? 'Retour au camp' : `Segment ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
              <NumericField
                label="Multiplicateur de durée (≥ 1)"
                value={factor}
                onChange={setFactor}
                min={1}
              />
              <Button
                size="sm"
                disabled={!routeSegments(m).length}
                onClick={() =>
                  apply({
                    type: 'addEvent',
                    event: {
                      id: id(),
                      type: 'slowdown',
                      segmentIds:
                        segmentTarget === 'all'
                          ? routeSegments(m).map((s) => s.id)
                          : [segmentTarget],
                      factor,
                    },
                  })
                }
              >
                Simuler une visibilité réduite
              </Button>
              <p>
                Retards additionnés ; facteurs de ralentissement multipliés.
                Supprimer une cible retire ses événements.
              </p>
              {m.events.map((e) => (
                <p key={e.id}>
                  Simulé :{' '}
                  {e.type === 'delay'
                    ? `retard +${e.seconds / 60} min`
                    : `durée ×${e.factor} sur ${e.segmentIds.length} segment(s)`}{' '}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => apply({ type: 'removeEvent', id: e.id })}
                  >
                    Annuler
                  </Button>
                </p>
              ))}
            </div>
          </details>
          <details>
            <summary>Hypothèses et références NASA</summary>
            <ul className="grid gap-2 py-2">
              {m.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <p>
              Scénario initial : 360 min dont 60 min de réserve, 2 km/h ; photo
              5 min, observation 15 min, prélèvement 30 min. Ces valeurs restent
              des hypothèses du projet.
            </p>
            <p>
              <a className="underline" href="https://github.com/nasa/aegis">
                NASA AEGIS : stations et activités
              </a>{' '}
              ·{' '}
              <a
                className="underline"
                href="https://ntrs.nasa.gov/citations/20230008183"
              >
                Principes de planification EVA et réserve
              </a>{' '}
              ·{' '}
              <a
                className="underline"
                href="https://ssd.jpl.nasa.gov/planets/phys_par.html"
              >
                Rayon de référence Mars
              </a>
            </p>
          </details>
          <OxygenEditor
            onParameters={(parameters) =>
              apply({ type: 'parameters', parameters })
            }
          />
        </>
      )}
    </div>
  );
}
function OxygenEditor({
  onParameters,
}: {
  onParameters: (p: MissionParameters) => void;
}) {
  const { mission: m } = usePlannerState();
  const o = m.parameters.oxygen;
  const result = calculateOxygen(m);
  const fields = {
    stockGrams: 'Stock initial (g)',
    reserveGrams: 'Réserve protégée (g)',
    loadKg: 'Charge portée (kg)',
    referenceGramsPerMinute: 'Débit de référence (g/min)',
    restingGramsPerMinute: 'Débit des activités à l’arrêt (g/min)',
    referenceSpeedKmh: 'Vitesse de référence (km/h)',
    speedCoefficient: 'Coefficient vitesse (sans unité)',
    uphillCoefficient: 'Coefficient montée (par unité de pente)',
    downhillCoefficient: 'Coefficient descente (par unité de pente)',
    loadCoefficient: 'Coefficient charge (par kg)',
  };
  return (
    <details>
      <summary>Estimation O₂ optionnelle · simulée</summary>
      <div className="grid gap-2 py-2">
        <label>
          <input
            type="checkbox"
            checked={o.enabled}
            onChange={(e) =>
              onParameters({
                ...m.parameters,
                oxygen: { ...o, enabled: e.target.checked },
              })
            }
          />{' '}
          Activer l’estimation O₂
        </label>
        <label>
          <input
            type="checkbox"
            checked={o.flatTerrain}
            onChange={(e) =>
              onParameters({
                ...m.parameters,
                oxygen: { ...o, flatTerrain: e.target.checked },
              })
            }
          />{' '}
          J’active l’hypothèse simulée de terrain plat
        </label>
        {o.enabled && (
          <>
            {Object.entries(fields).map(([key, label]) => (
              <NumericField
                key={key}
                label={`${label} · simulé`}
                value={o[key as keyof typeof fields]}
                onChange={(n) =>
                  onParameters({ ...m.parameters, oxygen: { ...o, [key]: n } })
                }
              />
            ))}
            {result.status === 'ready' ? (
              <p role={result.marginGrams < 0 ? 'alert' : 'status'}>
                Besoin : {result.totalGrams.toFixed(1)} g · restant :{' '}
                {result.remainingGrams.toFixed(1)} g · marge après réserve :{' '}
                {result.marginGrams.toFixed(1)} g.{' '}
                {result.marginGrams < 0
                  ? '⚠ Stock insuffisant après réserve.'
                  : ''}
              </p>
            ) : result.status === 'unavailable' ? (
              <p role="status">{result.reason}</p>
            ) : null}
          </>
        )}
        {result.status === 'ready' && (
          <ul>
            {result.consumption.map((c, i) => (
              <li key={c.id}>
                {i < routeSegments(m).length
                  ? routeSegments(m)[i]?.returning
                    ? 'Retour'
                    : `Marche ${i + 1}`
                  : `Activité ${i - routeSegments(m).length + 1}`}{' '}
                : {c.grams.toFixed(1)} g ({c.rate.toFixed(2)} g/min)
              </li>
            ))}
          </ul>
        )}
        <p>
          Modèle simulated-multiplicative-v1. Débit = référence × [1 + cᵥ(v/vᵣ −
          1)²] × [1 + c₊ max(pente,0) + c₋ max(−pente,0)] × [1 + cₘ charge].
          Consommation = Σ débit (g/min) × durée (min).
        </p>
        <p>
          Pente signée montée/distance horizontale, domaine ±100 %. Activités
          successives à débit distinct. Coefficients non calibrés, bilan par
          équipier ; pertes et fuites exclues.
        </p>
      </div>
    </details>
  );
}
export function PrintMission() {
  const state = usePlannerState();
  const m = state.mission;
  const b = calculateBudget(m);
  const o = calculateOxygen(m);
  const item = (label: string, value: ReactNode) => (
    <p>
      {label} : {value}
    </p>
  );
  return (
    <article className="print-mission">
      <h1>{m.name} — mission simulée</h1>
      {item('Région', m.regionId)}
      {item(
        'Camp fictif',
        m.camp ? `${m.camp.latitude}° N, ${m.camp.longitude}° E` : 'Absent',
      )}
      <p>Parcours : camp → {m.steps.map((s) => s.name).join(' → ')} → camp.</p>
      <ol>
        {m.steps.map((s) => (
          <li key={s.id}>
            {s.name} ({s.position.latitude}°, {s.position.longitude}°) :{' '}
            {s.activities
              .map(
                (a) => `${activityNames[a.type]} ${a.durationSeconds / 60} min`,
              )
              .join(', ') || 'Passage sans activité'}
          </li>
        ))}
      </ol>
      {b ? (
        <>
          <p>
            Distance horizontale : {b.totalKilometres.toFixed(3)} km. Marche :{' '}
            {(b.walkingSeconds / 60).toFixed(1)} min, dont retour :{' '}
            {(b.returnSeconds / 60).toFixed(1)} min. Activités :{' '}
            {(b.activitySeconds / 60).toFixed(1)} min.
          </p>
          <p>
            Disponible : {m.parameters.availableSeconds / 60} min. Réserve :{' '}
            {m.parameters.reserveSeconds / 60} min. Marge :{' '}
            {(b.marginSeconds / 60).toFixed(1)} min.{' '}
            {b.marginSeconds < 0 ? 'DÉPASSEMENT' : 'Budget respecté'}
          </p>
        </>
      ) : (
        <p>Budget indisponible : camp ou étape absent.</p>
      )}
      <p>Événements simulés (inclus dans les résultats ci-dessus) :</p>
      <ul>
        {m.events.map((e) => (
          <li key={e.id}>
            {e.type === 'delay'
              ? `Retard de ${e.seconds / 60} min sur ${m.steps.find((s) => s.activities.some((a) => a.id === e.activityId))?.name ?? 'activité absente'}`
              : `Visibilité réduite : durée ×${e.factor} sur ${e.segmentIds.length} portion(s), ${e.segmentIds.some((id) => routeSegments(m).find((s) => s.id === id)?.returning) ? 'retour inclus' : 'hors retour'}`}
          </li>
        ))}
      </ul>
      <p>
        O₂ :{' '}
        {o.status === 'ready'
          ? `besoin ${o.totalGrams.toFixed(1)} g, marge ${o.marginGrams.toFixed(1)} g — terrain plat simulé`
          : o.status === 'unavailable'
            ? o.reason
            : 'désactivé'}
      </p>
      {m.parameters.oxygen.enabled && (
        <p>
          O₂ simulé — modèle simulated-multiplicative-v1 ; stock{' '}
          {m.parameters.oxygen.stockGrams} g, réserve{' '}
          {m.parameters.oxygen.reserveGrams} g, charge{' '}
          {m.parameters.oxygen.loadKg} kg. Débit de référence{' '}
          {m.parameters.oxygen.referenceGramsPerMinute} g/min à{' '}
          {m.parameters.oxygen.referenceSpeedKmh} km/h ; activités{' '}
          {m.parameters.oxygen.restingGramsPerMinute} g/min. Coefficients
          vitesse / montée / descente / charge :{' '}
          {m.parameters.oxygen.speedCoefficient} /{' '}
          {m.parameters.oxygen.uphillCoefficient} /{' '}
          {m.parameters.oxygen.downhillCoefficient} /{' '}
          {m.parameters.oxygen.loadCoefficient}.
        </p>
      )}
      <p>Hypothèses : {m.assumptions.join(' ')}</p>
      <p>
        Rayon Mars 2000 : {m.radiusMetres} m. Vitesse simulée :{' '}
        {m.parameters.speedKmh} km/h.
      </p>
      <p>
        Avertissement : carte et profil non intégrés ; aucune couche déclarée
        chargée.{' '}
        {state.catalog.status !== 'ready' ? 'Catalogue indisponible.' : ''}
      </p>
      <p>
        Références :{' '}
        {m.dataReferences
          .map((r) => `${r.id} (${r.version}) ${r.sourceUrl}`)
          .join(' ; ')}
      </p>
    </article>
  );
}
