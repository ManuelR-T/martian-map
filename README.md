# Marps

A static web application for planning scientific field outings on Mars. The MVP
targets Jezero crater. It is built with React, TypeScript, Vite, OpenLayers,
Tailwind CSS and shadcn/ui in a private pnpm workspace.

## Use of AI tools

The team came up with the idea, the product decisions and the choice of data
sources. AI coding assistants (Claude Code by Anthropic, Codex by OpenAI and
Antigravity by Google) were used to accelerate the work:

- **Code:** large parts of the application code, tests and data preparation
  scripts (`tools/data`) were written with AI assistance, then reviewed, run and
  tested by the team.
- **Documentation:** this README and the notes in `docs/` were drafted or
  translated with AI assistance.
- **Data:** no scientific data is AI-generated. Imagery, terrain models, rover
  positions and weather measurements come from NASA, USGS and the other sources
  credited in the manifest and in [`docs/demo/credits-donnees.md`](docs/demo/credits-donnees.md).
  The example camps and mission durations are fictional scenario choices made by
  the team and are labelled as such in the app.
- **Terrain annotations:** the texts of the Jezero terrain annotations
  (`data/research/jezero-terrain-annotations.geojson`) were drafted with AI
  assistance from HiRISE imagery. Their credit in the manifest says so, and the
  app labels them as visual interpretations, not measurements.
- **Images:** no image in the application is AI-generated. The Marps logo
  (`packages/ui/src/components/brand-mark.tsx`, `apps/web/public/favicon.svg`)
  is an original vector drawing written as code, and uses no NASA branding.

The same disclosure is recorded as metadata in the root `package.json`
(`description`) and in `apps/web/index.html` (`<meta name="ai-disclosure">`).

## Installation

Use **Node 24.14.0** (`.nvmrc` and `.node-version`) and **pnpm 9.15.4**, pinned
by `packageManager`. Direct dependencies use exact versions, and the repository
keeps a single `pnpm-lock.yaml` at the root.

With nvm and Corepack:

```sh
nvm install
nvm use
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm install --frozen-lockfile
```

If your Node distribution does not ship Corepack, install it first with
`npm install --global corepack@0.34.6`. Do not use npm or Yarn to install the
project dependencies. The `engines` ranges and `engine-strict` reject
incompatible versions.

## Commands (from the root)

```sh
pnpm dev           # Vite, http://localhost:5173 (or the next free port)
pnpm build         # Type-checks the packages, then builds apps/web/dist
pnpm lint          # ESLint, no warnings allowed
pnpm typecheck     # Strict TypeScript for every package
pnpm test          # Vitest: pure calculations and the frozen manifest
pnpm data:prepare  # Downloads and freezes the data (network required, see "Data")
pnpm data:check    # Validates the frozen data and the manifest offline
pnpm data:test     # pytest: data preparation script tests
```

To serve the static build locally: `pnpm --filter @marps/web preview`.
No application server, database or Python runtime is needed to run the app.

## Responsibilities and dependencies

| Directory | Responsibility | Internal dependencies |
| --- | --- | --- |
| `apps/web` | React composition, OpenLayers integration, browser interactions | `mission-core`, `data`, `ui` |
| `packages/mission-core` | Domain types and pure calculations, with no framework, DOM or network access | None |
| `packages/data` | Manifest contracts (region, site, source), manifest loading and the coverage rule | `mission-core` (types) |
| `packages/ui` | Design system: tokens, shadcn/ui components and mission components | None |
| `tools/data` | Python scripts that download, prepare and validate data, outside the pnpm workspace | None |

The scientific catalog is the manifest `apps/web/public/data/manifest.json`
(see "Data"). The Jezero coordinates are approximate orientation metadata.
Domain coordinates are planetocentric degrees with longitude positive to the
east, and durations are in seconds.

## Interface and design system

On the planning screen (`apps/web`), the map fills the whole area below the
header. The view selector (global or Jezero), the steps, the time budget and the
site sheet float above it. Each panel collapses from its title bar to free up
the map. Below 1024 px, the map stays on top and the panels scroll underneath.
Until their data is loaded, these areas show an explicit state over a
placeholder backdrop (the Mars limb or a grid) that is not data. The
`#/systeme-design` page shows the tokens, the components and these states, with
sample content labelled as such.

The design system is called "Blue Hour": on Mars, the daytime sky is
butterscotch and the sunset is blue. The night palette is the only appearance.
It applies from the first render and has no local preference.

- **One shared state.** `apps/web/src/state/planner.ts` holds the reducer and
  selectors, testable without React, and `PlannerProvider` exposes them through
  Context. Panels read this state and recompute nothing: the budget arrives
  already computed by `mission-core` (#14) and is only formatted.
- **Four data states.** `DataState` covers loading, error, no data and
  insufficient coverage. Every area that depends on data shows one of these
  states instead of a blank.
- **Colors.** The tokens in `packages/ui/src/styles.css` define a single "Blue
  Hour" palette, at the root and in the `dark` scope. Blue (`--primary`) is used
  for buttons and links. Twilight blue (`--twilight`) sets the mood of the
  backgrounds. Martian orange (`--mars`) highlights selections, the active page,
  markers and the route. `tokens.test.ts` fails if the main text contrast drops
  below 7:1, other text below 4.5:1, or a control border below 3:1.
- **Accessibility.** A state never relies on color alone: it also has an icon,
  text, shape or pattern. Keyboard focus is a solid 3 px outline defined once in
  `styles.css`; do not remove it in a component. Targets are sized for a gloved
  hand: 44 px high by default for a button, 40 px at least, and the whole header
  of a panel or the whole row of a step is clickable.
- **Typography.** Public Sans for body text. Archivo at full width for titles
  (`heading-display`), short uppercase labels (`label-caps`) and numeric
  readouts (`numeral-display`). Fonts are bundled, with no external request.
- **Shapes and light.** The style of an onboard instrument: square corners, a
  blue-to-ember horizon line (`--horizon`) on the top edge of panels and under
  the header, and viewfinder brackets on the bottom corners (`panel-frame`). A
  surface floating over the map is nearly opaque glass (`glass`, enabled by the
  `floating` prop of `Panel` and `DataState`). Light carries meaning: only the
  main action, the selection and alerts glow (`shadow-glow`, `shadow-ember`). Do
  not add rounded corners or decorative glow to a component.
- **Motion.** One orchestrated moment: panels power on when they open
  (`power-on`, staggered by `--power-delay`). After that, motion only signals
  loading (`scan`, `shimmer`) or responds to a gesture.
  `prefers-reduced-motion` disables all of it.

To add a shadcn/ui component, run the CLI from `packages/ui`:

```sh
pnpm dlx shadcn@4.23.0 add dialog
```

Then, in the generated file: replace the `@/…` imports with relative imports
(ESLint rejects them, and Vite cannot resolve them from `apps/web`), check that
the CLI did not add a `cn` dependency to `package.json`, remove the
`outline-none` and `focus-visible:ring-*` classes in favor of the global focus
style, and export the component from `src/index.ts`.

## Conventions

- All packages are private. Internal dependencies use `workspace:*`.
- Import public APIs from `@marps/mission-core`, `@marps/data` or `@marps/ui`,
  never through a path to their internal files.
- Shared package exports point to TypeScript sources, which Vite and Vitest
  transform directly. No prior package build or watcher is needed during
  development. Package builds only type-check; `apps/web` alone produces the
  deployable bundle. The packages are not meant to be run directly by Node or
  published.
- Keep the dependency graph above acyclic; no package depends on `apps/web`.
  ESLint forbids importing React, OpenLayers and other internal packages in
  `mission-core`, and TypeScript does not include browser APIs there.
- Put `*.test.ts` files next to the calculations; `pnpm test` finds them from
  the root. Never replace missing data with fictional data presented as
  scientific.
- Import shared styles through `@marps/ui/styles.css`. OpenLayers styles are
  imported by the application, which owns that dependency. Tailwind is compiled
  by the Vite plugin in `apps/web`; classes used in `packages/ui/src` are picked
  up by the `@source` directive of that file.

## Data

The MVP data is **frozen in the repository** under `apps/web/public/data`
(about 6.0 MB) and served statically at `/data/`. `pnpm build`, `pnpm test` and
the app never contact NASA or USGS for it.

| Dataset | Delivery | Content |
| --- | --- | --- |
| `mola-colorized-relief` | Remote (Trek) | Global orientation background, not frozen |
| `jezero-hirise-mosaic` | Frozen | HiRISE WMTS tiles, zoom levels 12 to 16, over the sector |
| `jezero-hirise-dem`, `-slope`, `-hillshade` | Frozen | HiRISE elevation, slope and hillshade, aggregated to 4 m |
| `jezero-ctx-dem`, `-slope`, `-hillshade` | Frozen | The same grids at 20 m (CTX), used as a fallback |
| `jezero-sampling-sites` | Frozen | Skinner Ridge, Wildcat Ridge and Amalik (NASA GeoJSON) |
| `jezero-themis-night-ir` | Frozen | THEMIS night-time infrared (Mars Odyssey), 4 level-9 tiles covering the whole HiRISE mosaic. Qualitative contrast, not a temperature |
| `jezero-meda-temperature`, `-pressure` | Frozen | MEDA air temperature and pressure for sol 500, one value per Martian hour |

The manifest separates **global orientation** (region `global`) from **Jezero
detail** (region `jezero`). Each capability (`imagery-hirise`, `terrain-dem`,
`terrain-slope`, `science-sites`, `thermal-themis`…) has a status, and a
capability that is not prepared is `unavailable` with its reason. A background
layer can never enable missing data: `capabilityStatus` in `@marps/data` only
keeps the datasets declared for the requested region and returns the lowest
status.

Each dataset records its identifier, URL, instrument, date or sol, units, CRS,
extent (planetocentric degrees, longitude positive to the east), resolution,
status, source version, credit, terms of use, and the SHA-256 checksum of the
upstream source and of each frozen file. An unknown value stays `null` (date,
sol, vertical datum). Missing data is never turned into zero: images use
transparent pixels, elevation and slope use `NaN`.

Elevation and slope are float32 grids (`NaN` means no data). The manifest gives
their origin, cell size, projection and vertical datum. `terrainDataset`,
`loadGrid` and `sampleGrid` in `@marps/data` read them. HiRISE is preferred and
CTX takes over where it is missing. The cell size is not a navigation accuracy.
Details and limits: [`docs/relief-jezero.md`](docs/relief-jezero.md).

MEDA conditions are **past measurements taken at the rover**, never a forecast
along the route. Preparation reads the full CSV of each sol and its PDS4 label:
the MD5 checksum and the column unit must match, or it stops. Only one column is
kept per measurement: `ATS_LOCAL_TEMP1` (mast sensor at 1.45 m, the least heated
by the rover) for temperature, and `PRESSURE` from the derived product for
pressure. The five temperature sensors are never averaged. Each hour keeps the
median of its valid values, their count and the measured window (MEDA only
measures part of each hour). Values that are empty, non-numeric, equal to the
`9999999999` sentinel or physically impossible (outside 120–330 K or
100–1300 Pa) are counted and discarded. An hour with no valid value stays `null`
and shows "unavailable". Values are stored in kelvins and pascals;
`kelvinToCelsius` (K − 273.15) converts them for display. The pressure
uncertainty is not used: its column is empty and its label declares it in
kelvins. The location is the last NASA waypoint (`M20_waypoints.json`) before
the sol. A sol during which the rover drove is rejected, because its
measurements would come from several places. `loadMedaConditions`,
`conditionsAt` and `availableHours` in `@marps/data` read them.

Wind is no longer published after sol 315 (damaged sensor). The `weather-wind`
capability is declared unavailable with its reason and source, and `windStatus`
reads it. Preparation stops if a wind file appears for a prepared sol.
Inventory: [`docs/meteo-et-dangers.md`](docs/meteo-et-dangers.md).

### Prepare and check

Preparation is an explicit step. It requires [uv](https://docs.astral.sh/uv/)
and network access. The Python environment is reproducible through
`tools/data/pyproject.toml` (exact versions) and `tools/data/uv.lock`.

```sh
pnpm data:prepare   # downloads, crops, computes checksums and writes the manifest
pnpm data:check     # reads the frozen files without network access
pnpm data:test      # script tests
```

`data:prepare` writes to a temporary folder, validates it, then replaces
`apps/web/public/data`. A network or validation failure leaves the current data
untouched. The CTX DEM, the block of rows read from the HiRISE DEM (103 MB out
of 1.8 GB, through HTTP `Range` requests) and the MEDA CSVs are cached in
`tools/data/.cache` (ignored by Git) and their checksums are verified: if an
upstream source changes, preparation stops for review. The sector, URLs and
credits are defined in `tools/data/marps_data/spec.py`.

`data:check` verifies: required fields, valid checksums and coordinates, sites
inside the sector, file sizes and checksums, units, `NaN` elevations (no
sentinel value), transparent pixels, grid transforms, each site lying on a valid
cell, slopes between 0° and 90° on the same grid as their elevations, 24 MEDA
hours per sol with a value only where valid measurements exist, the rover
position inside the sector, and consistency between statuses and capabilities.
Research notes are in [`docs/`](docs/) and reference samples in
[`data/research/`](data/research/).

## Environment variables and deployment

No environment variable is required. Any future `VITE_*` variable will be public
and embedded in the bundle, so never put a secret there. Document each new
variable and provide a `.env.example` when needed. Local `.env*` files are
ignored by Git. The deployment serves the content of `apps/web/dist`. The root
configuration is in `vercel.json`; see the
[deployment guide](docs/deploiement-vercel.md) for previews, staging and
rollback.

## Continuous integration

The [CI workflow](.github/workflows/ci.yml) runs on every pull request and every
push to `main`. It reads the Node version from `.node-version` and the pnpm
version from `package.json`, installs with `--frozen-lockfile`, then runs
`pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` from the root. The
pnpm store cache is keyed on `pnpm-lock.yaml`; installation still always runs.
Any error stops the job. The workflow only has read access to the repository.

On success, the `web-dist` artifact contains `apps/web/dist` and stays available
for seven days on the GitHub Actions run page. Tests use local inputs, with no
secrets and no NASA requests.

To reproduce the checks from a clean clone, follow the installation steps above,
then run the four commands in that order. To confirm that regressions are
caught, temporarily add an incompatible TypeScript assignment in
`mission-core`: `pnpm typecheck` must fail. Temporarily changing the `60` factor
of `minutesToSeconds` to `59` must make `pnpm test` fail. Revert these changes
before running the checks again.

References: [pnpm workspaces](https://pnpm.io/workspaces),
[Vite guide](https://vite.dev/guide/).

## Global Mars map and offline use (#7)

The map is mounted in the `MapStage` from #5, uses the `PlannerProvider` view
state and consumes the dataset descriptors from #6. The app opens on the
interactive global view of Mars: drag to pan, and use the mouse wheel or the
zoom controls at the bottom right to explore. "Mars whole" restores the full
planet. The Jezero marker or "Open Jezero" returns to the detailed sector.
Detailed planning is unavailable outside Jezero.

MOLA uses the NASA Trek URL and attribution from the manifest, with a
planetocentric geographic grid registered as `MARS:104905` (NASA identifier
`urn:ogc:def:crs:EPSG::104905`). Origin −180°, 90°; 256-pixel tiles; 2 × 1 tiles
at level 0; source levels 0–7. No Earth Web Mercator projection or Earth
distance calculation is used. Two NASA level-0 JPEGs bundled under
`public/data/mola` give a coarse global overview without any NASA connection.
The nominal 463 m/pixel sampling of the source does not describe the resolution
of that overview.

Entering Jezero shows the prepared local HiRISE tiles using the extent, zoom
ranges, URLs and credit from the manifest. It never requests a local tile
outside the frozen ranges. The approximate global Jezero marker is not used as a
scientific site coordinate.

Production builds precache all final assets, fonts, the lazy-loaded design
system code, the manifest and the prepared local datasets. Once the
"offline-ready" message appears, reloading works without internet. The first
installation needs a connection, or the static build served from a local
server; service workers require HTTPS or localhost. Development mode does not
install a worker. Clearing or evicting browser storage requires preparing again.
Additional global MOLA tiles that loaded successfully are cached up to 180
tiles; unvisited detail falls back to the bundled overview. This is neither a
complete high-resolution download of the planet nor a guarantee of mission
suitability.

An installation failure shows an error and a retry action; a stalled
installation times out after 30 seconds. A pending update asks users to close
every app tab and reopen it. Cache versions hash the worker logic and every
final file, including HTML and public data. CI tests cover failure, timeout and
update states, invalidation of public data and HTML, and cached navigation and
assets without network access.

Source of the bundled overview, checked on 2026-11-14: NASA / JPL-Caltech /
GSFC, MGS MOLA, distributed by NASA Trek:
https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml

Local validation at the time of this feature: lint, typecheck, 148 JavaScript
tests, the production build, the frozen-data integrity check and 19 Python tests
passed. Headless Chromium verified the planner shell, global and Jezero
navigation, rendered local imagery, all 108 precached resources, reload without
internet, mobile width, and no page errors or local 404s with NASA blocked. Live
NASA JPEGs returned HTTP 200, retry recovered once the blocked service was
restored, and keyboard navigation only requested in-range global tile URLs.

## Tablet and wrist layouts

Below 1280 CSS pixels, or on screens at most 600 pixels high, a Map / Mission
navigation appears. Map keeps the map inside the viewport; Mission shows the
panels in a separate scrollable area. On very small wrist displays, settings
remain accessible in Mission. Map options and source information open from "Map
and sources"; zoom stays above the attribution.

Map controls and the compact navigation and view selectors have targets of at
least 44 × 44 CSS pixels. Coarse-pointer devices also get larger shared
controls. The map viewport owns pan and pinch gestures; mission panels and
options scroll independently. No viewport setting disables browser zoom.

Browser viewport checks covered 240×240, 320×320, 390×844, 768×1024, 1024×768,
844×390 and 1280×800. Compact map controls stay visible without horizontal
scrolling or overlapping controls. Mission panels and map options stay
accessible, and map dragging and zooming were exercised. The production worker
precached the 108 built resources, including responsive styles and the prepared
datasets. These checks use browser simulation; physical tablet or wrist
hardware and glove input remain unverified.

## Helmet view (#30)

During a walk, “Helmet view” in the mission tracking panel opens `#/casque`: a
full-screen, high-contrast view of the current stop. It reads the running
mission that the tracking panel and the time budget use, so ticking in either
place updates both, and the margin is the budget panel's own figure.

- **Route strip:** camp, stops and camp in plan order with the planned length of
  each leg. It is a schematic of the sequence, never a position.
- **Stop checklist:** every activity of the stop is a large button; the current
  one carries a timer that counts on this screen only and is not saved.
- **Site sheet:** for a NASA site, the photo to spot, what to bring back, the
  rover's earlier work and the sheet tasks, which tick the same site progress as
  the site panel.
- **Time and route:** planned time remaining, plan margin, a bar of the available
  time, the next leg and the straight-line return to camp.
- **Alerts:** budget overrun, steep sections ahead for the slope threshold chosen
  in the route profile (an assumption) and the simulated radiation alert. When no
  relief is loaded the view says that slopes are not checked.

Progress is manual: “Activity done” (or Space) ticks the current activity and
“Undo last” (or Backspace) unticks the latest one. The current stop is the first
stop with an unticked activity; the app knows no real position on Mars. The
remaining time is a plan figure (unticked activities plus the planned walk from
the current stop back to camp), not a measured elapsed time. This is an
interface view only: no augmented reality hardware and no operational
navigation. It was not checked on a headset or with gloves.

## Jezero mosaic exploration (#8)

The Jezero view opens on the prepared mission sector and lets users explore the
full HiRISE footprint declared by NASA (77.2229331–77.583964° E,
18.3067994–18.669315° N), at WMTS levels 0–17. The pinned capabilities document
provides product bounds and matrix dimensions through optional `wmts` metadata
in the manifest. Existing schema-2 readers remain compatible. The 91 prepared
tiles at levels 12–16 keep their original local paths and integrity checksums.
Other valid tiles use the NASA URL template, with at most eight map tiles
loading at once and a 15-second request timeout. Retry and "return to prepared
sector" actions remain available after failures. Switching between Mars and
Jezero preserves the planner state.

Yellow outlines mark the product bounds, blue dashes the mission sector, and a
white dotted outline the prepared tile envelope at the current integer zoom. A
patterned background means no image is displayed; a transparent pixel or a
failed request is not evidence of navigable terrain. Scientific capabilities
stay limited to the original mission sector. The three manifest sites open their
site sheets; when touch targets overlap, a named choice is offered.

The 100 CSS-pixel scale bar uses the Mars radius from the manifest
(3,396,190 m), the angular resolution and the cosine of the center latitude.
Coordinates are planetocentric, with longitude positive to the east. The nominal
0.25 m/pixel source sampling differs from the displayed sampling and does not
establish positioning accuracy.

The production installation includes the prepared resources. Extra HiRISE tiles
streamed from NASA are not guaranteed after an offline reload; their bounded
persistence belongs to #24. A NASA connection is optional for the
prepared-sector workflow. Browser rendering, disconnected reload and physical
tablet or glove interaction have not been tested for this feature and must be
validated before operational use.

### Perseverance historical context (#20)

The Jezero sector panel has an optional Perseverance history toggle. It shows
NASA-published positions and separate drive segments, not a validated human
route or live telemetry. Select a feature on the map, or use the
keyboard-accessible list, to inspect its sol and RMC (rover motion counter).
Overlapping rover hits narrow down the list; science sites keep selection
priority. Mission steps are not affected.

The prepared extract includes the complete segments that intersect the mission
sector and their available endpoint waypoints. Outside the sector, missing
history means no prepared data, not proof that the rover never went there.
Source coordinates are kept as published; five endpoint discrepancies are listed
in the snapshot quality details. No snapping, gap filling, site substitution or
vertical alignment is applied. The `CRS84` in the upstream metadata is
interpreted explicitly as Mars planetocentric longitude and latitude, positive
to the east, not as Earth coordinates.

History files ship with the production PWA and are part of its versioned
precache. After a successful installation and the offline-ready status, the
layer needs no NASA connection. A failed history load offers a retry without
blocking imagery or the mission. Offline and tablet interaction in production
still need acceptance testing; automated checks do not establish them.

## Missions, camps and activities (#11)

An "At base" / "On mission" navigation separates preparation from tracking.

### At base: missions, templates and camps

A single **Mission** panel has three tabs: **Prepare** (the wizard, for a
mission or a template), **Camps** (the camp catalog) and **Missions** (saved
missions, templates and history). A saved mission starts directly from the
Missions tab. A new mission can always start from an existing template.
Creation has three steps:

1. Objective and name: choose reconnaissance, observation, photography or
   sampling. A name is suggested automatically and can be edited. A new mission
   can reuse a saved template without changing that template.
2. Camp and route: select a saved camp, add stops from the catalog or by
   coordinates, reorder the visits and define their activities (photo,
   observation, sampling) and durations in minutes. A mission requires a camp
   and at least one stop; a template can leave them for later.
3. Review: check the summary, set the available time, speed and reserve, then
   save. Starting the outing is offered after saving.

The **Camps** tab lets users search existing camps or save a new one, then edit
or delete them. In step 2, the "Create a camp" button opens this tab. Saving a
camp neither selects nor changes the camp of a mission being prepared. Missions
keep a copy of the chosen camp, even if the catalog changes later.

Destructive actions ask for confirmation. A message reports storage errors.
Readiness checks are only available at Jezero. The camp catalog stays available
whatever the map view.

### On a mission

Starting creates an independent copy of the plan and clears the checkmarks.
Editing a template or a mission at base does not change the outing in progress.
The reducer forbids configuration changes during tracking. The route, the
activities to check off and the site sheets remain accessible; settings and
time allocations are read-only. Tasks from the site sheets stay separate from
the visit activities and are not added to them automatically.

Tracking is saved automatically on the device and restored on reload. Each
outing has a history entry updated with its checkmarks; starting another outing
keeps the previous ones. History shows the last save date and does not claim
that an outing is finished. The camp–stops–camp geometry joins straight
segments; it is not a validated traversable path. The Budget panel shows the complete
planned mission budget, independently of tracking checkmarks.

### Mission time budget (#14)

`calculateMissionBudget` in `@marps/mission-core` uses #13's horizontal Mars
distances. Walking minutes = `60 × total kilometres / speed in km/h`, with
explicit conversion from the stored m/s and seconds. Margin equals available
time minus total walking, planned activities and reserve. The return leg is
already included in total walking and is counted exactly once.

The panel separates exploration walking, observations and activities, return,
reserve and margin, with explicit units. It also shows total walking, planned
duration excluding reserve, and total/return distance. Negative margin has a
text warning, icon and distinct color. Missing and invalid inputs have separate
states; invalid parameter drafts hide the previous budget until corrected.
Rounding occurs only for display.

Only activities explicitly planned on each visit contribute to activity time.
Site-sheet task allocations are separate and are not added again. Checking an
activity does not measure elapsed time or release margin: this is the full-plan
budget. Preparation and the active outing use separate snapshots. Durations,
walking speed and reserve are scenario assumptions; terrain, fatigue and live
consumable measurements are not part of this model. A positive margin does not
establish that the route is safe.

The [demo](docs/demo/mission-demo.md) has reproducible engine and React tests:
margin +32.3 min, then −17.7 min after adding a sampling activity, then +27.3 min
after adapting the first stop.

### Storage and simulation data

IndexedDB `marps-missions` version 3 separates `camps`, `missions`,
`templates`, `tracking` and `history`. Migrations keep existing data. Existing
preparations stay in missions and are not automatically reclassified as
templates. Missions carry `schemaVersion: 1`, their identity, type (optional for
older saves), name, region, camp, ordered stops, activities and checkmarks,
settings, assumptions and site-sheet work. General durations are in seconds,
speed in m/s and activity durations in minutes. Negative or non-finite values, a
zero speed and a reserve longer than the available time are rejected.

The repository `apps/web/src/storage/missionDatabase.ts` is the extension point
for a future shared catalog. There is currently no server, no multi-crew
synchronization and no telemetry. Clearing browser data deletes this database.

### Local save and restore (#18)

The current preparation is also saved automatically in `localStorage`, under the
key `marps-mission-draft`, with the versioned mission schema. Its name, camp,
route, activities, valid settings and site-sheet work are restored after a
reload. The wizard resumes at the first step; a form entry that is still invalid
is not saved. The **Save mission** button stores a copy in the existing
IndexedDB catalog, where templates, outings and history stay separate from the
draft. Editing a preparation does not overwrite that copy until it is saved
again explicitly.

New saves keep the identifiers, versions and SHA-256 checksums of the region's
sources in `dataReferences`. Older v1 missions without this field stay readable,
and references already stored are kept when a mission is reopened. No raster or
tile cache is serialized in `localStorage`; map resources stay in the
application caches.

A corrupted preparation, an unknown schema version or a site missing from the
catalog produces an explicit message. The original save is kept until its
replacement is confirmed. Tracking is also checked against the catalog before it
is restored, without substituting a missing site. A storage refusal or exceeded
quota shows an error, and the next edit tries to write again. Missing IndexedDB
does not crash the interface, and loading the tracking can be retried.

**Edit mission** renames a mission before saving it again. **Delete** removes
its copy from the catalog after confirmation. **Reset preparation** creates an
empty draft after confirmation and keeps saved missions, templates, tracking and
history. Tests cover serialization, reload, corruption, unknown versions,
missing sites, storage refusals and quotas.

The example camps in `packages/data/src/camps.ts` are fictional and seeded only
once. Their positions in the prepared sector do not confirm habitability,
equipment or any NASA selection. Our research found no NASA catalog of
registered human camps on Mars. The NASA report on
[science and planetary protection before human missions](https://ntrs.nasa.gov/citations/20250009522)
studies a Jezero scenario without validating these camps.
[Perseverance data](https://science.nasa.gov/mission/mars-2020-perseverance/)
describes real robotic exploration and stays separate from the simulations.

## Global Mars atlas

In the **Mars whole → Layers** view, the atlas adds an HRSC color background,
USGS geology and TES thermal inertia. Click on Mars, or move the map with the
keyboard then choose **Read in the center of the map**, to read the
coordinates, the geologic unit when that layer is on, the mean and true solar
time, and the season `Ls`. The UTC date is adjustable (2000–2026, the range in
which the time conversion was verified). These calculations are independent of
mission tracking and of MEDA measurement times.

The color background is the HRSC preview at about **16.7 km/pixel**, distinct
from the original 2 km/pixel product. The 1,311 polygons of SIM 3292 come from
the Esri StoryMaps copy, simplified to 0.08°. TES is a qualitative layer at 8
pixels/degree, limited to 60°S–60°N; clicking never derives a temperature or
inertia value from its colors. The Jezero marker stays accessible above the
layers.

The files are frozen separately in `apps/web/public/atlas` (about 7.2 MB), with
their own manifest (sources, transformations, checksums), so that
`data:prepare` does not delete them. The build and the offline installation
include them automatically. Sources are also listed on the **Sources** page.
The Mars Climate Database is offered as a link to its external interface; no MCD
climate field is integrated. Detailed planning remains limited to Jezero.

Preparation and acquisition limits: [atlas note](docs/atlas-mondial.md).

## Languages

Use the header selector to switch between French and English. The initial
language follows the browser, with French as the fallback. The preference is
saved on the device. Both translation catalogs ship with the application and
work offline. Dates, numbers and coordinates follow the selected language.

Translations live in `apps/web/src/locales/fr.json` and
`apps/web/src/locales/en.json`. Keep their keys and interpolation variables
aligned. The localization tests check catalog parity and French source text
coverage, including prepared scientific data and site sheets.

## Hypothetical mission route (#12)

In **Mission → Prepare → Camp and route**, the **Route drawing** section sits
beside the itinerary. Select a leg by its departure and arrival, including the
return to camp.
**Draw** records intermediate points (double-click to finish); **Modify** lets
you drag or insert vertices. Camp and visit endpoints remain fixed. Escape or
Cancel discards the current gesture. While editing, a banner on the map repeats
the selected leg and the gesture instructions, with a cancel action. Leaving the
route preparation step cancels the editing interaction. The return leg is stored separately and
included once in the geometry and distance calculations. Routes are hypothetical,
not computed safe paths. Outside-sector vertices produce a coverage warning;
missing terrain samples remain explicit gaps in the profile.

Changing the camp, adding/removing visits or reordering them resets all legs to
direct segments, as stated beside the controls. Empty missions and camp-only
plans have no line; coincident visits retain their order and zero-length legs.
Custom vertices persist with the mission, draft, templates and tracking; older
saves continue to use direct segments. Tracking is read-only. The terrain profile
now samples the current mission rather than a separate demonstration route.

For a demonstration, choose a simulated camp in the mission wizard, then use
**Demo: visit the three sites** in the route section while the itinerary is empty.
The three catalogue sites are visited in catalogue order, followed by return to
the selected camp. Edit each connecting leg as desired; this scenario makes no
claim of traversability. Drawing and dragging still require manual browser and
touch acceptance testing.

## Return limit under mission assumptions (#33)

The Budget drawer shares a planned immediate-retreat calculation with the map.
At each chronological position it reverses the route already traveled, including
edited vertices and positions on the planned return leg. It does not substitute
the straight-line distance or the remaining planned route. Earlier activities
and the elapsed fraction of the current activity count; future activities are
abandoned. Completion checkboxes do not measure elapsed time or location.

Time-only mode works without terrain. **Include O₂ in return limit** explicitly
adds the existing simulated model-v1 oxygen constraint; this choice persists
with the mission. Older missions can explicitly initialize simulated O₂
parameters. Reverse slopes use their own costs. Missing terrain/parameters
remain indeterminate; flat terrain is an explicit assumption in O₂ settings.
The protected reserves are subtracted once, and zero margin reaches a reserve.

The summary identifies the limiting constraint, visit/activity or route leg,
numerical margins, and interpolation bracket. Solid/dashed/dotted portions and
triangular threshold markers complement text. All thresholds remain in an
accessible touch-target list; overlapping visits retain chronological identity.
Overlapping route strokes show the later passage, so consult the list for each
passage's state. The compact Time menu opens the detailed summary.

Calculations use local mission inputs and the already-loaded prepared DEM, with
no remote service. Derived results are recomputed rather than saved. Evaluation
is capped at 50,000 travel samples to bound work on tablets; a larger route is
explicitly unevaluated. Terrain spacing is estimation granularity, not navigation
accuracy. This hypothetical plan and uncalibrated O₂ model are not telemetry or
a guarantee of return. Tablet interaction and disconnected production acceptance
must be verified separately from automated calculation and storage tests.
