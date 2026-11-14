import { useState, type FormEvent } from 'react';
import {
  MapPin,
  Clock3,
  ArrowRight,
  Copy,
  ChevronLeft,
  Check,
} from 'lucide-react';
import { Button } from '@marps/ui';
import {
  calculateBudget,
  createEmptyMission,
  validateMission as validateMissionForUI,
  type Mission,
} from '@marps/mission-core';
import type { MissionRecord } from '../state/library';
import { usePlannerState } from '../state/PlannerProvider';
import { exampleMission, scienceSource } from './science';
import { date, uid, duration } from './shared';
export function MissionCard({
  record: r,
  onOpen,
  onDuplicate,
}: {
  record: MissionRecord;
  onOpen: () => void;
  onDuplicate: () => void;
}) {
  const b = calculateBudget(r.mission);
  return (
    <article className="mission-tile">
      <div className="section-heading">
        <span className="work-tag">
          {r.archived ? 'Archivée' : 'En préparation'}
        </span>
        <span className="eyebrow">JEZERO</span>
      </div>
      <h3>{r.mission.name}</h3>
      <p className="muted">Modifiée le {date(r.updatedAt)}</p>
      <div className="tile-metrics">
        <span>
          <MapPin size={16} />
          {r.mission.steps.length} étapes
        </span>
        <span>
          <Clock3 size={16} />
          {b ? duration(b.walkingSeconds + b.activitySeconds) : 'À compléter'}
        </span>
      </div>
      <p className={b && b.marginSeconds < 0 ? 'text-danger' : 'muted'}>
        {b
          ? b.marginSeconds < 0
            ? '⚠ Budget dépassé'
            : `${duration(b.marginSeconds)} de marge après réserve`
          : 'Placez un camp et ajoutez une étape.'}
      </p>
      <div className="tile-actions">
        <Button onClick={onOpen}>
          {r.archived ? 'Consulter' : 'Reprendre'} <ArrowRight size={16} />
        </Button>
        <Button
          variant="outline"
          onClick={onDuplicate}
          aria-label={`Dupliquer ${r.mission.name}`}
        >
          <Copy size={16} />
        </Button>
      </div>
    </article>
  );
}
export function CreateMission({
  onCreate,
  onCancel,
}: {
  onCreate: (m: Mission) => void;
  onCancel: () => void;
}) {
  const state = usePlannerState();
  const [mode, setMode] = useState('example');
  const [error, setError] = useState('');
  const manifest =
    state.catalog.status === 'ready' ? state.catalog.data.manifest : null;
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const name = String(f.get('name')).trim();
      if (!name) throw new Error('Donnez un nom à votre mission.');
      const m =
        mode === 'example'
          ? exampleMission(manifest!, uid(), name)
          : { ...createEmptyMission('jezero'), id: uid(), name };
      const p = {
        ...m.parameters,
        availableSeconds: Number(f.get('available')) * 60,
        reserveSeconds: Number(f.get('reserve')) * 60,
        speedKmh: Number(f.get('speed')),
      };
      validateMissionForUI({ ...m, parameters: p });
      onCreate({
        ...m,
        objective: String(f.get('objective') ?? '').trim() || m.objective,
        parameters: p,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Catalogue indisponible.');
    }
  }
  return (
    <div className="creation">
      <a href="#/" className="back-link">
        <ChevronLeft size={16} />
        Mes missions
      </a>
      <p className="eyebrow">01 / CRÉER UNE MISSION</p>
      <h1>Quel sera votre prochain terrain d’étude ?</h1>
      <p className="lead">
        Commencez avec un parcours scientifique proposé ou construisez le vôtre.
      </p>
      <form onSubmit={submit} className="creation-grid">
        <div className="work-card form-stack">
          <label>
            Nom de la mission
            <input
              name="name"
              required
              maxLength={120}
              placeholder="Ex. Étude des roches du delta"
              autoFocus
            />
          </label>
          <label>
            Objectif scientifique (facultatif)
            <textarea
              name="objective"
              maxLength={600}
              placeholder="Ex. Comparer les textures et les indices d’altération des roches du delta."
              rows={3}
            />
          </label>
          <fieldset>
            <legend>Point de départ</legend>
            <div className="choice-grid">
              {[
                [
                  'example',
                  'Le delta en trois stations',
                  'Un camp fictif, les sites NASA et des activités suggérées.',
                ],
                [
                  'blank',
                  'Une page blanche',
                  'Vous définissez le camp, les étapes et les activités.',
                ],
              ].map(([value, title, text]) => (
                <label
                  className={`choice ${mode === value ? 'selected' : ''}`}
                  key={value}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={value}
                    checked={mode === value}
                    onChange={() => setMode(value ?? 'example')}
                  />
                  <strong>{title}</strong>
                  <span>{text}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Votre enveloppe de terrain</legend>
            <div className="three-fields">
              <label>
                Temps disponible (min)
                <input
                  type="number"
                  name="available"
                  min="1"
                  max="1000000"
                  defaultValue={360}
                  required
                />
              </label>
              <label>
                Réserve incluse (min)
                <input
                  type="number"
                  name="reserve"
                  min="0"
                  defaultValue={60}
                  required
                />
              </label>
              <label>
                Marche (km/h)
                <input
                  type="number"
                  name="speed"
                  min="0.01"
                  step="any"
                  defaultValue={2}
                  required
                />
              </label>
            </div>
            <p className="muted">
              La réserve est protégée à l’intérieur du temps disponible.
              Préparation des combinaisons et opérations de sas exclues.
            </p>
          </fieldset>
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
          <div className="inline-actions">
            <Button disabled={mode === 'example' && !manifest}>
              Créer et préparer le parcours <ArrowRight size={16} />
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
          </div>
        </div>
        <aside className="creation-aside">
          <span className="work-tag">SECTEUR DÉTAILLÉ</span>
          <h2>Jezero, front du delta</h2>
          <p>
            Les roches sédimentaires de cette région permettent d’étudier
            l’histoire de l’eau et la préservation possible de biosignatures.
          </p>
          <ul>
            <li>
              <Check size={16} />3 sites issus du catalogue NASA
            </li>
            <li>
              <Check size={16} />
              Retour au camp inclus
            </li>
            <li>
              <Check size={16} />
              Prévisionnel modifiable à tout moment
            </li>
          </ul>
          <p className="fine-print">
            Camp, activités humaines et durées : hypothèses de simulation.
            Aucune mission humaine n’a été réalisée sur ces sites.
          </p>
          <a href={scienceSource} target="_blank" rel="noreferrer">
            Contexte scientifique · EPSC 2024 ↗
          </a>
        </aside>
      </form>
    </div>
  );
}
