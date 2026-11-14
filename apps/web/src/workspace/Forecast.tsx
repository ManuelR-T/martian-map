import { useState } from 'react';
import { AlertTriangle, Clock3, FlaskConical, Route } from 'lucide-react';
import { Button } from '@marps/ui';
import { calculateBudget, routeSegments } from '@marps/mission-core';
import { usePlannerState } from '../state/PlannerProvider';
import { BudgetPanel } from '../panels/BudgetPanel';
import { OxygenEditor } from '../panels/MissionUtilities';
import { Section, uid, names, duration, type Act } from './shared';
export function Forecast({ act, readonly }: { act: Act; readonly: boolean }) {
  const { mission: m } = usePlannerState();
  const b = calculateBudget(m);
  const baseline = calculateBudget({ ...m, events: [] });
  const [showOxygen, setShowOxygen] = useState(false);
  const timeline = b
    ? b.segments.flatMap((s, i) => [
        {
          label: s.returning
            ? 'Retour au camp'
            : `Marche vers ${m.steps[i]?.name}`,
          seconds: s.seconds,
          kind: 'walk',
        },
        ...(!s.returning
          ? b.activities
              .filter((a) => m.steps[i]?.activities.some((x) => x.id === a.id))
              .map((a) => ({
                label: names[a.type],
                seconds: a.seconds,
                kind: 'activity',
              }))
          : []),
      ])
    : [];
  return (
    <>
      <div className="forecast-heading">
        <div>
          <p className="eyebrow">02 / ÉVALUER LA SORTIE</p>
          <h2>Le parcours tient-il dans votre enveloppe ?</h2>
          <p>
            Marche, travail sur place et retour sont calculés ensemble. La
            réserve reste à part.
          </p>
        </div>
        <span className="work-tag">PRÉVISIONNEL SIMULÉ</span>
      </div>
      {b ? (
        <div className="metric-grid">
          <div>
            <Route />
            <span>Distance horizontale</span>
            <strong>
              {b.totalKilometres.toFixed(2)} <small>km</small>
            </strong>
          </div>
          <div>
            <Clock3 />
            <span>Temps de terrain</span>
            <strong>
              {Math.round((b.walkingSeconds + b.activitySeconds) / 60)}{' '}
              <small>min</small>
            </strong>
          </div>
          <div>
            <FlaskConical />
            <span>Activités sur place</span>
            <strong>
              {Math.round(b.activitySeconds / 60)} <small>min</small>
            </strong>
          </div>
          <div
            className={b.marginSeconds < 0 ? 'metric-over' : 'metric-margin'}
          >
            <AlertTriangle />
            <span>
              {b.marginSeconds < 0
                ? 'Dépassement après réserve'
                : 'Marge après réserve'}
            </span>
            <strong>
              {Math.round(Math.abs(b.marginSeconds) / 60)} <small>min</small>
            </strong>
          </div>
        </div>
      ) : (
        <p className="work-notice">
          Le prévisionnel attend un camp et au moins une étape. Revenez au
          parcours pour les ajouter.
        </p>
      )}
      <div className="planning-grid">
        <div>
          <Section
            title="Les hypothèses de votre sortie"
            eyebrow="PARAMÈTRES AJUSTABLES"
          >
            <form
              key={JSON.stringify(m.parameters)}
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                act({
                  type: 'parameters',
                  parameters: {
                    ...m.parameters,
                    availableSeconds: Number(f.get('available')) * 60,
                    reserveSeconds: Number(f.get('reserve')) * 60,
                    speedKmh: Number(f.get('speed')),
                  },
                });
              }}
            >
              <fieldset disabled={readonly}>
                <div className="three-fields">
                  <label>
                    Disponible (min)
                    <input
                      name="available"
                      type="number"
                      min="1"
                      max="1000000"
                      required
                      defaultValue={m.parameters.availableSeconds / 60}
                    />
                  </label>
                  <label>
                    Réserve incluse (min)
                    <input
                      name="reserve"
                      type="number"
                      min="0"
                      max="1000000"
                      required
                      defaultValue={m.parameters.reserveSeconds / 60}
                    />
                  </label>
                  <label>
                    Vitesse (km/h)
                    <input
                      name="speed"
                      type="number"
                      min="0.01"
                      step="any"
                      max="1000"
                      required
                      defaultValue={m.parameters.speedKmh}
                    />
                  </label>
                </div>
                {!readonly && <Button>Recalculer avec ces paramètres</Button>}
              </fieldset>
            </form>
            <p className="fine-print">
              Durées et vitesse simulées. Distance horizontale sur Mars 2000,
              sans pénalité de relief. Ce budget n’est pas une garantie de
              retour sûr.
            </p>
          </Section>
          <Section
            eyebrow="CHRONOLOGIE PRÉVISIONNELLE"
            title="Le déroulé de votre sortie"
          >
            <ol className="forecast-timeline">
              {timeline.map((item, i) => {
                const start = timeline
                  .slice(0, i)
                  .reduce((sum, previous) => sum + previous.seconds, 0);
                return (
                  <li key={i} className={item.kind}>
                    <span className="timeline-time">T + {duration(start)}</span>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{duration(item.seconds)}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="reserve-block">
              <span>Réserve protégée</span>
              <strong>{duration(m.parameters.reserveSeconds)}</strong>
            </div>
            <p className="fine-print">
              Chronologie relative au départ du camp. Retards et ralentissements
              actifs inclus.
            </p>
          </Section>
          <Section
            eyebrow="TESTER UN IMPRÉVU"
            title="Et si la sortie prenait du retard ?"
          >
            <p>
              Ajoutez un événement pour mesurer son effet. Les paramètres du
              plan initial restent conservés.
            </p>
            {!readonly && b && (
              <div className="two-fields">
                <form
                  className="form-stack scenario"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    act({
                      type: 'addEvent',
                      event: {
                        id: uid(),
                        type: 'delay',
                        activityId: String(f.get('target')),
                        seconds: Number(f.get('delay')) * 60,
                      },
                    });
                  }}
                >
                  <h3>Retard sur une activité</h3>
                  <label>
                    Activité
                    <select name="target" required>
                      <option value="">Choisir une activité</option>
                      {m.steps.flatMap((s) =>
                        s.activities.map((a) => (
                          <option value={a.id} key={a.id}>
                            {s.name} · {names[a.type]}
                          </option>
                        )),
                      )}
                    </select>
                  </label>
                  <label>
                    Retard ajouté (min)
                    <input
                      type="number"
                      name="delay"
                      defaultValue={10}
                      min="0"
                      max="100000"
                      required
                    />
                  </label>
                  <Button variant="outline">Ajouter ce retard</Button>
                </form>
                <form
                  className="form-stack scenario"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const target = String(f.get('target'));
                    act({
                      type: 'addEvent',
                      event: {
                        id: uid(),
                        type: 'slowdown',
                        segmentIds:
                          target === 'all'
                            ? routeSegments(m).map((s) => s.id)
                            : [target],
                        factor: Number(f.get('factor')),
                      },
                    });
                  }}
                >
                  <h3>Visibilité réduite simulée</h3>
                  <label>
                    Portion concernée
                    <select name="target">
                      <option value="all">
                        Tout le parcours, retour inclus
                      </option>
                      {routeSegments(m).map((s, i) => (
                        <option value={s.id} key={s.id}>
                          {s.returning ? 'Retour au camp' : `Marche ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Multiplicateur du temps
                    <input
                      type="number"
                      name="factor"
                      defaultValue={1.5}
                      min="1"
                      step="0.1"
                      max="1000"
                      required
                    />
                  </label>
                  <Button variant="outline">Simuler le ralentissement</Button>
                </form>
              </div>
            )}
            {m.events.map((e) => (
              <div className="event-line" key={e.id}>
                <span className="work-tag">SIMULÉ</span>
                <p>
                  {e.type === 'delay'
                    ? `+${duration(e.seconds)} · ${m.steps.find((s) => s.activities.some((a) => a.id === e.activityId))?.name}`
                    : `Durée de marche ×${e.factor} · ${e.segmentIds.length} portion(s)`}
                </p>
                {!readonly && (
                  <button
                    className="text-link"
                    onClick={() => act({ type: 'removeEvent', id: e.id })}
                  >
                    Annuler
                  </button>
                )}
              </div>
            ))}
            {b && baseline && m.events.length > 0 && (
              <p className="work-notice">
                Effet des événements : {duration(baseline.marginSeconds)} de
                marge initiale → {duration(b.marginSeconds)} avec les imprévus.
              </p>
            )}
            <p className="fine-print">
              Retards additionnés, ralentissements multipliés sur leurs
              portions. Il s’agit d’hypothèses, sans observation météo.
            </p>
          </Section>
        </div>
        <aside>
          <BudgetPanel standalone className="forecast-budget" />
          <Section eyebrow="RESSOURCE OPTIONNELLE" title="Estimation d’oxygène">
            <p>
              Le budget de temps fonctionne seul. L’O₂ est un modèle pédagogique
              séparé, sans calibration humaine validée.
            </p>
            <p className="fine-print">
              Les grilles de relief sont disponibles. Leur échantillonnage
              directionnel le long du trajet reste à relier ; aucune pente n’est
              inventée.
            </p>
            <button
              className="text-link"
              aria-expanded={showOxygen}
              onClick={() => setShowOxygen(!showOxygen)}
            >
              {showOxygen
                ? 'Masquer les réglages'
                : 'Ouvrir les réglages avancés'}{' '}
              →
            </button>
            {showOxygen && (
              <fieldset disabled={readonly}>
                <OxygenEditor
                  onParameters={(parameters) =>
                    act({ type: 'parameters', parameters })
                  }
                />
              </fieldset>
            )}
          </Section>
          <Section
            eyebrow="FAITS ET SIMULATION"
            title="Ce que signifie ce prévisionnel"
          >
            <ul className="explanation-list">
              <li>Les lieux viennent du catalogue scientifique figé.</li>
              <li>Le camp, les durées humaines et la vitesse sont simulés.</li>
              <li>Le retour est compté une seule fois.</li>
              <li>La réserve est incluse dans l’enveloppe choisie.</li>
            </ul>
            <a href="#/sources">Voir les sources et limites ↗</a>
          </Section>
        </aside>
      </div>
    </>
  );
}
