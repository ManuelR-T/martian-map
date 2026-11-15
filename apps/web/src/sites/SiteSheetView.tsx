import { localize } from '@marps/ui';
import '../i18n';
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
    <div role="group" aria-label={localize("Sites")} className="grid grid-cols-3 gap-1.5">
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
            {localize(site.name)}
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
    <div className="grid gap-1">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="relative w-24 shrink-0 border"
          aria-label={localize("Agrandir la photo à repérer : {{v0}}", { v0: sheet.photo.caption })}
        >
          <img src={photoUrl} alt="" width={sheet.photo.width} height={sheet.photo.height} className="block h-auto w-full" />
          <Maximize2 aria-hidden="true" className="absolute right-1 bottom-1 size-5 bg-card/90 p-0.5" />
        </button>
        <div className="grid min-w-0 content-start gap-0.5">
          <p className="label-caps text-muted-foreground">{localize("À rapporter")}</p>
          <p className="text-sm leading-snug">{localize(sheet.objective)}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{localize("Pourquoi :")} </span>
        {localize(sheet.question)}
      </p>
      <details className="text-xs text-muted-foreground">
        <summary className="min-h-11 cursor-pointer py-3 font-semibold">{localize("Contexte scientifique et méthode")}</summary>
        <p>{localize("Déjà fait par le rover :")} {localize(sheet.roverWork.text)}</p>
        <p className="mt-2">{localize("Activités et durées choisies par l’équipe, d’après les procédures Apollo.")}</p>
      </details>

      <ul aria-label={localize("Tâches")} className="m-0 grid list-none p-0">
        {sheet.tasks.map((task) => {
          const done = work.doneTaskIds.includes(task.id);
          return (
            <li key={task.id} className="-mt-px first:mt-0">
              {/* Cible tactile de 44 px : le coéquipier dans l'habitat coche en direct, sans viser. */}
              <label className="flex min-h-11 cursor-pointer items-center gap-3 border px-3 hover:bg-accent">
                <input
                  type="checkbox"
                  checked={done}
                  disabled={!tracking}
                  onChange={() => onTaskToggle(task.id)}
                  className="size-5 shrink-0 accent-mars"
                />
                <span className={done ? 'min-w-0 flex-1 py-2 text-muted-foreground line-through' : 'min-w-0 flex-1 py-2'}>
                  {localize(task.label)}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">{localize(task.minutes)} {localize("min")}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {/* A disabled control says why: tasks are ticked during the walk, the allotted time is set before it. */}
      <p className="text-xs text-muted-foreground">
        {localize(tracking ? localize("La durée allouée se règle à la base, avant la sortie.") : localize("Les tâches se cochent pendant la sortie, dans « En mission »."))}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={selectId} className="flex items-center gap-2 text-sm">
          {localize("Alloué")} <select
            disabled={tracking}
            id={selectId}
            value={work.allottedMinutes}
            onChange={(event) => onAllottedChange(Number(event.target.value))}
            className="h-11 border border-input bg-card px-2 tabular-nums"
          >
            {STOP_MINUTES_CHOICES.map((minutes) => (
              <option key={minutes} value={minutes}>
                {localize(minutes)} {localize("min")} </option>
            ))}
          </select>
        </label>
        <p aria-live="polite" className="text-right text-sm tabular-nums">
          {shortfallMinutes > 0 ? (
            <span className="inline-flex items-center gap-1 font-semibold text-warning">
              <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
              {localize("Il manque")} {localize(shortfallMinutes)} {localize("min")} </span>
          ) : remainingTaskMinutes === 0 ? (
            localize("Tâches faites")
          ) : (
            localize("Reste {{v0}} min", { v0: remainingTaskMinutes })
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
            {localize("À repérer sur place")} </h3>
          <Button type="button" variant="outline" size="icon" onClick={() => dialogRef.current?.close()} className="size-11">
            <X aria-hidden="true" />
            <span className="sr-only">{localize("Fermer")}</span>
          </Button>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-[3fr_2fr]">
          <figure className="m-0 grid gap-1.5">
            <img src={photoUrl} alt="" width={sheet.photo.width} height={sheet.photo.height} className="h-auto w-full border" />
            <figcaption className="grid gap-0.5">
              <span>{localize(sheet.photo.caption)}</span>
              <span className="text-xs text-muted-foreground">
                {localize("Photo du rover, sol")} {localize(sheet.photo.sol)}{localize(". Crédit :")} {localize(sheet.photo.credit)}{localize(".")} </span>
            </figcaption>
          </figure>
          <div className="grid content-start gap-3 text-sm">
            <p>
              <span className="font-semibold">{localize("Déjà fait par le rover :")} </span>
              {localize(sheet.roverWork.text)}
            </p>
            <ul className="m-0 grid list-none gap-2 p-0">
              {sheet.tasks.map((task) => (
                <li key={task.id}>
                  <span className="font-semibold">{localize(task.label)}</span> {localize("(")}{localize(task.minutes)} {localize("min).")} {localize(task.detail)}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">{localize("Durées estimées par l'équipe, d'après les procédures Apollo.")}</p>
          </div>
        </div>
      </dialog>
    </div>
  );
}
