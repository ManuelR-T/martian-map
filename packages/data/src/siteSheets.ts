/** A published reference; `publishedAt` is null when the page shows no date. */
export interface ScienceSource {
  readonly id: string;
  readonly title: string;
  readonly publisher: string;
  readonly url: string;
  readonly publishedAt: string | null;
  readonly consultedAt: string;
}

const CONSULTED_AT = '2026-11-14';

/** Sources behind the sheets, listed for the provenance panel (#16) rather than on each sheet. */
export const scienceSources = [
  {
    id: 'jpl-2022-09-15',
    title: "NASA's Perseverance Rover Investigates Geologically Rich Mars Terrain",
    publisher: 'NASA JPL',
    url: 'https://www.jpl.nasa.gov/news/nasas-perseverance-rover-investigates-geologically-rich-mars-terrain/',
    publishedAt: '2022-09-15',
    consultedAt: CONSULTED_AT,
  },
  {
    id: 'jpl-2023-08-02',
    title: 'Meet the Mars Samples: Shuyak and Mageik (Samples 14 and 15)',
    publisher: 'NASA JPL',
    url: 'https://www.jpl.nasa.gov/videos/meet-the-mars-samples-shuyak-and-mageik-samples-14-and-15/',
    publishedAt: '2023-08-02',
    consultedAt: CONSULTED_AT,
  },
  {
    id: 'nasa-rock-samples',
    title: 'Mars Rock Samples',
    publisher: 'NASA Science',
    url: 'https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/',
    publishedAt: null,
    consultedAt: CONSULTED_AT,
  },
  {
    id: 'usgs-apollo-17-samples',
    title: 'Documentation and environment of the Apollo 17 samples',
    publisher: 'USGS',
    url: 'https://www.usgs.gov/publications/documentation-and-environment-apollo-17-samples',
    publishedAt: null,
    consultedAt: CONSULTED_AT,
  },
] as const satisfies readonly ScienceSource[];

export type ScienceSourceId = (typeof scienceSources)[number]['id'];

/**
 * Rover photo of the site, kept only when a NASA caption names it.
 * Lets the astronaut recognise the target on arrival. `path` is relative to the app root.
 */
export interface SitePhoto {
  readonly path: string;
  /** What to look for in the picture, from the NASA caption. */
  readonly caption: string;
  readonly sol: number;
  readonly width: number;
  readonly height: number;
  readonly credit: string;
  readonly sourceId: ScienceSourceId;
  readonly originalUrl: string;
}

/** One step of the stop, as on an Apollo cuff checklist. Minutes are a team assumption. */
export interface SiteTask {
  readonly id: string;
  /** Short enough to fit one line of the sheet on a tablet. */
  readonly label: string;
  /** How to do it, shown in the stop details. */
  readonly detail: string;
  readonly minutes: number;
}

/**
 * What the astronaut needs at a stop (`SiteDescriptor.id`): recognise the target,
 * know what it must bring back, avoid redoing the rover's work, follow the tasks.
 */
export interface SiteSheet {
  readonly siteId: string;
  readonly objective: string;
  readonly roverWork: { readonly text: string; readonly sourceId: ScienceSourceId };
  readonly photo: SitePhoto;
  readonly tasks: readonly SiteTask[];
  /** Procedure the tasks follow; their durations remain a team assumption. */
  readonly tasksSourceId: ScienceSourceId;
  /** Sources of the objective, kept for the provenance panel. */
  readonly objectiveSourceIds: readonly ScienceSourceId[];
}

/**
 * Time the crew may allot to a stop, 5 min to 3 h. Apollo 17 planned stops of 30 to 66 min, so a stop with an
 * extra sample can exceed one hour; the exact values remain a team assumption.
 */
export const STOP_MINUTES_CHOICES: readonly number[] = Array.from({ length: 36 }, (_, index) => (index + 1) * 5);

// Apollo geologic documentation: describe, photograph, then collect with before and locator photos.
// The order and wording are the team's.
const DOCUMENTATION_TASKS: readonly SiteTask[] = [
  { id: 'describe', label: 'Décrire la roche', detail: 'À voix haute : couleur, grain, couches.', minutes: 10 },
  { id: 'context-photo', label: 'Photo de contexte', detail: "Vue large de l'affleurement.", minutes: 10 },
  { id: 'close-up', label: 'Photos rapprochées', detail: 'Paire de photos de la zone abrasée.', minutes: 10 },
  { id: 'sample', label: 'Prélèvement', detail: 'Photo avant, ensachage, photo de repérage.', minutes: 45 },
];

const PHOTO_BASE = 'https://science.nasa.gov/wp-content/uploads/2024/03/';

export const siteSheets: readonly SiteSheet[] = [
  {
    siteId: 'skinner-ridge',
    objective: 'Documenter la roche du delta autour des forages.',
    objectiveSourceIds: ['nasa-rock-samples'],
    roverWork: { text: '2 carottes, 1 abrasion (2022).', sourceId: 'nasa-rock-samples' },
    photo: {
      path: 'images/sites/skinner-ridge-sol0495.jpg',
      caption: 'Trous de forage de Swift Run et Skyland, et zone abrasée.',
      sol: 495,
      width: 1024,
      height: 771,
      credit: 'NASA/JPL-Caltech',
      sourceId: 'nasa-rock-samples',
      originalUrl: `${PHOTO_BASE}mars-sample-11-nlf-0495-0710900102-755ecm-n0261004ncam00709-01-095j.png`,
    },
    tasks: DOCUMENTATION_TASKS,
    tasksSourceId: 'usgs-apollo-17-samples',
  },
  {
    siteId: 'wildcat-ridge',
    // Organics are named, never their origin: the source says they can also form without life.
    objective: 'Documenter la roche aux plus fortes détections organiques du rover (2022).',
    objectiveSourceIds: ['jpl-2022-09-15'],
    roverWork: {
      text: '2 carottes, 1 abrasion (2022).',
      sourceId: 'nasa-rock-samples',
    },
    photo: {
      path: 'images/sites/wildcat-ridge-sol0516.jpg',
      caption: 'Deux trous de forage et la zone abrasée.',
      sol: 516,
      width: 1024,
      height: 771,
      credit: 'NASA/JPL-Caltech',
      sourceId: 'nasa-rock-samples',
      originalUrl: `${PHOTO_BASE}mars-sample-13-nlf-0516-0712761021-112ecm-n0261222ncam00709-01-095j.png`,
    },
    tasks: DOCUMENTATION_TASKS,
    tasksSourceId: 'usgs-apollo-17-samples',
  },
  {
    siteId: 'amalik',
    objective: "Documenter la roche argileuse, jugée la plus apte à garder des organiques.",
    objectiveSourceIds: ['jpl-2023-08-02'],
    roverWork: { text: '2 carottes, 1 abrasion (2022).', sourceId: 'nasa-rock-samples' },
    photo: {
      path: 'images/sites/amalik-sol0575.jpg',
      caption: 'Trou de forage de Shuyak, zone abrasée en bas à droite.',
      sol: 575,
      width: 1024,
      height: 771,
      credit: 'NASA/JPL-Caltech',
      sourceId: 'nasa-rock-samples',
      originalUrl: `${PHOTO_BASE}mars-sample-14-nlf-0575-0717997335-774ecm-n0290000ncam00709-01-095j.png`,
    },
    tasks: DOCUMENTATION_TASKS,
    tasksSourceId: 'usgs-apollo-17-samples',
  },
];

export function findScienceSource(sourceId: ScienceSourceId): ScienceSource | undefined {
  return scienceSources.find((source) => source.id === sourceId);
}

export function findSiteSheet(siteId: string): SiteSheet | undefined {
  return siteSheets.find((sheet) => sheet.siteId === siteId);
}

/** Time the listed tasks need; the default time allotted to the stop. */
export function plannedTaskMinutes(sheet: SiteSheet): number {
  return sheet.tasks.reduce((total, task) => total + task.minutes, 0);
}
