import { useId, useRef } from 'react';
import { CircleAlert, Maximize2, X } from 'lucide-react';
import { STOP_MINUTES_CHOICES, type SiteDescriptor, type SiteSheet } from '@marps/data';
import { Button } from '@marps/ui';
import { summarizeStop, type SiteWork } from './siteWork';

export interface SitePickerProps {
  sites: readonly SiteDescriptor[];
  selectedSiteId: string | null;
  onSelect: (siteId: string) => void;
}

/** Remplace la carte (#8) : seul moyen d'ouvrir une fiche tant que les sites n'y sont pas cliquables. */
export function SitePicker({ sites, selectedSiteId, onSelect }: SitePickerProps) {
  return (
    <div role="group" aria-label="Sites" className="grid grid-cols-3 gap-1.5">
      {sites.map((site) => {
        const selected = site.id === selectedSiteId;
        return (
          <Button
            key={site.id}
            type="button"
            variant={selected ? 'default' : 'outline'}
            aria-pressed={selected}
            onClick={() => onSelect(site.id)}
            className="h-11 min-w-0 px-1 text-xs leading-tight whitespace-normal"
          >
            {site.name}
          </Button>
        );
      })}
    </div>
  );
}

export interface SiteSheetViewProps {
  tracking?: boolean;
  sheet: SiteSheet;
  work: SiteWork;
  onTaskToggle: (taskId: string) => void;
  onAllottedChange: (minutes: number) => void;
}

/**
 * Fiche compacte : tout tient sans défiler dans la colonne de droite d'une tablette en paysage.
 * Ordre de l'arrêt : reconnaître la cible, connaître l'objectif, puis dérouler les tâches.
 * Le détail (grande photo, crédits, façon de faire) s'ouvre à la demande.
 */
export function SiteSheetView({ sheet, work, onTaskToggle, onAllottedChange, tracking = true }: SiteSheetViewProps) {
  const selectId = useId();
  const dialogTitleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { remainingTaskMinutes, shortfallMinutes } = summarizeStop(sheet, work);
  const photoUrl = `${import.meta.env.BASE_URL}${sheet.photo.path}`;

  return (
    <div className="grid gap-1.5">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="relative w-28 shrink-0 border"
          aria-label={`Agrandir la photo à repérer : ${sheet.photo.caption}`}
        >
          <img src={photoUrl} alt="" width={sheet.photo.width} height={sheet.photo.height} className="block h-auto w-full" />
          <Maximize2 aria-hidden="true" className="absolute right-1 bottom-1 size-5 bg-card/90 p-0.5" />
        </button>
        <div className="grid min-w-0 content-start gap-0.5">
          <p className="label-caps text-muted-foreground">Objectif</p>
          <p className="text-sm leading-snug">{sheet.objective}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Déjà fait par le rover : </span>
        {sheet.roverWork.text}
      </p>

      <ul aria-label="Tâches" className="m-0 grid list-none p-0">
        {sheet.tasks.map((task) => {
          const done = work.doneTaskIds.includes(task.id);
          return (
            <li key={task.id} className="-mt-px first:mt-0">
              {/* Cible tactile de 44 px : le coéquipier dans l'habitat coche en direct, sans viser. */}
              <label className="flex h-11 cursor-pointer items-center gap-3 border px-3 hover:bg-accent">
                <input
                  type="checkbox"
                  checked={done}
                  disabled={!tracking}
                  onChange={() => onTaskToggle(task.id)}
                  className="size-5 shrink-0 accent-primary"
                />
                <span className={done ? 'flex-1 truncate text-muted-foreground line-through' : 'flex-1 truncate'}>
                  {task.label}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">{task.minutes} min</span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-2">
        <label htmlFor={selectId} className="flex items-center gap-2 text-sm">
          Alloué
          <select
            disabled={tracking}
            id={selectId}
            value={work.allottedMinutes}
            onChange={(event) => onAllottedChange(Number(event.target.value))}
            className="h-11 border border-input bg-card px-2 tabular-nums"
          >
            {STOP_MINUTES_CHOICES.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} min
              </option>
            ))}
          </select>
        </label>
        <p aria-live="polite" className="text-right text-sm tabular-nums">
          {shortfallMinutes > 0 ? (
            <span className="inline-flex items-center gap-1 font-semibold text-warning">
              <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
              Il manque {shortfallMinutes} min
            </span>
          ) : remainingTaskMinutes === 0 ? (
            'Tâches faites'
          ) : (
            `Reste ${remainingTaskMinutes} min`
          )}
        </p>
      </div>

      {/* <dialog> natif : focus piégé, Échap et fond gérés par le navigateur, sans dépendance. */}
      <dialog
        ref={dialogRef}
        aria-labelledby={dialogTitleId}
        className="m-auto max-h-[90dvh] w-[min(56rem,92vw)] border bg-card p-0 text-card-foreground backdrop:bg-black/60"
      >
        <div className="flex items-center justify-between gap-2 border-b bg-muted px-4 py-2">
          <h3 id={dialogTitleId} className="label-caps">
            À repérer sur place
          </h3>
          <Button type="button" variant="outline" size="icon" onClick={() => dialogRef.current?.close()} className="size-11">
            <X aria-hidden="true" />
            <span className="sr-only">Fermer</span>
          </Button>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-[3fr_2fr]">
          <figure className="m-0 grid gap-1.5">
            <img src={photoUrl} alt="" width={sheet.photo.width} height={sheet.photo.height} className="h-auto w-full border" />
            <figcaption className="grid gap-0.5">
              <span>{sheet.photo.caption}</span>
              <span className="text-xs text-muted-foreground">
                Photo du rover, sol {sheet.photo.sol}. Crédit : {sheet.photo.credit}.
              </span>
            </figcaption>
          </figure>
          <div className="grid content-start gap-3 text-sm">
            <p>
              <span className="font-semibold">Déjà fait par le rover : </span>
              {sheet.roverWork.text}
            </p>
            <ul className="m-0 grid list-none gap-2 p-0">
              {sheet.tasks.map((task) => (
                <li key={task.id}>
                  <span className="font-semibold">{task.label}</span> ({task.minutes} min). {task.detail}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">Durées estimées par l'équipe, d'après les procédures Apollo.</p>
          </div>
        </div>
      </dialog>
    </div>
  );
}
