# Marps

A static application for planning scientific field outings on Mars. The MVP targets Jezero. React, TypeScript, Vite, OpenLayers, Tailwind CSS and shadcn/ui run in a private pnpm workspace.

## Installation

Use **Node 24.14.0** (`.nvmrc` and `.node-version` files) and
**pnpm 9.15.4**, fixed by `packageManager`. Versions of direct dependencies
are accurate and the repository maintains a single `pnpm-lock.yaml` at the root.

With nvm and Corepack:

```sh
nvm install
nvm use
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm install --frozen-lockfile
```

If Corepack is not installed with your Node distribution, install it first
`corepack@0.34.6` with `npm install --global corepack@0.34.6`.
Do not use npm or Yarn to install project dependencies.
The `engines` and `engine-strict` ranges reject incompatible versions.

## Commands from root

```sh
pnpm dev        # Vite, http://localhost:5173 (or the next available port)
pnpm build      # Checks the packages, then builds apps/web/dist
pnpm lint       # ESLint, no warnings allowed
pnpm typecheck  # Strict TypeScript for every package
pnpm test       # Vitest, pure calculation and frozen manifest tests
pnpm data:prepare  # Downloads and freezes data (network required; see “Data”)
pnpm data:check    # Validates frozen data and the manifest offline
pnpm data:test     # pytest, data preparation script tests
```

To serve the static result locally after a build:
`pnpm --filter @marps/web preview`.
No business servers, databases, or Python processing are required.

## Responsibilities and dependencies

| Directory | Responsibility | Internal dependencies |
| --- | --- | --- |
| `apps/web` | React composition, OpenLayers integration, browser interactions | `mission-core`, `data`, `ui` |
| `packages/mission-core` | Business types and pure calculations, without framework, DOM or network access | None |
| `packages/data` | Manifest contracts (region, site, source), manifest reading and coverage rule | `mission-core` (types) |
| `packages/ui` | Design system: tokens, shadcn/ui components and mission components | None |
| `tools/data` | Python scripts for downloading, preparation and validation, outside pnpm workspace | None |

The scientific catalog is the `apps/web/public/data/manifest.json` manifest
(see “Data”).
Jezero coordinates are approximate orientation metadata.
Business coordinates are in planetocentric degrees, positive longitude towards
the east; times are in seconds. Complete mission calculations fall under
following tasks.

## Interface and design system

On the planning screen (`apps/web`), the map occupies the entire area
under the headband. The view selector (global or Jezero), the steps, the budget
of time and the site sheet float on top; each panel folds up
its title banner to release the card. Below 1024 px, the map remains on top
and the panels scroll underneath. Until their data is integrated,
these locations display an explicit state, on a waiting setting (limbo of
Mars or grid) which is not data. The `#/systeme-design` page of
the application shows the tokens, components and these states, with contents
examples marked as such.

The design system is called “Blue Hour”: on Mars, the daytime sky is
caramel and the sunset is blue. The night palette is the only one
appearance, applied from the first rendering, without local preference.

- **A single shared state.** `apps/web/src/state/planner.ts` contains the
reducer and selectors, testable without React; `PlannerProvider`
exposed by Context. The panels read this state and do not recalculate anything: the
budget arrives already calculated by `mission-core` (#14), then formatted.
- **Four data states.** `DataState` covers loading, error, absence of
data and insufficient coverage. Any area that depends on data in
displays a rather than a blank.
- **Colors.** `packages/ui/src/styles.css` tokens define a
single “Blue Hour” palette, at the root and in the `dark` scope.
Blue (`--primary`) carries the buttons and links; twilight blue
(`--twilight`) preserves the atmosphere of the funds. Martian orange (`--mars`)
highlights selections, active page, landmarks and path.
`tokens.test.ts` fails if main text goes below 7:1, other text
under 4.5:1 or a control border under 3:1.
- **Accessibility.** A state is never based on color alone: ​​it carries
also an icon, text, shape or pattern. The keyboard focus is a
3 px solid outline defined once in `styles.css`; do not remove it
of a component. The targets are designed for a gloved hand: 44 px high
by default for a button, 40 at least, and the entire strip of a panel
or the entire line of a step can be activated.
- **Typography.** Public Without for the text, Archivo on its entire width for
titles (`heading-display`), short labels in capitals
(`label-caps`) and encrypted statements (`numeral-display`), served from the
bundle, without external call.
- **Shapes and light.** On-board instrument spirit: right angles, fillet
blue horizon towards embers (`--horizon`) on the high edge of the panels and
under the headband, viewfinder brackets at the bottom corners (`panel-frame`). A
surface placed on the card is an almost opaque glass (`glass`, activated by
the `floating` property of `Panel` and `DataState`). Light has a meaning:
only the main action, selection and alerts shine
(`shadow-glow`, `shadow-ember`). Do not add rounded corners or glow
decorative one-component.
- **Movement.** A single orchestrated moment, the powering of the panels to
opening (`power-on`, scaled by `--power-delay`). Then a
movement signals a loading (`scan`, `shimmer`) or responds to a gesture.
`prefers-reduced-motion` neutralizes them all.

To add a shadcn/ui component, launch the CLI from `packages/ui`:

```sh
pnpm dlx shadcn@4.23.0 add dialog
```

Then, in the generated file: replace the `@/…` imports with imports
relative (ESLint refuses them, Vite does not resolve them since `apps/web`),
check that the CLI has not added a dependency `cn` to `package.json`,
remove classes `outline-none` and `focus-visible:ring-*` in favor of focus
global, and export the component from `src/index.ts`.

## Conventions

- All packages are private. Any internal dependency uses `workspace:*`.
- Import public APIs by `@marps/mission-core`,
`@marps/data` or `@marps/ui`, without a path to their internal files.
- Shared package exports point to TypeScript sources: Quickly
and Vitest transform them directly. No prior build or watcher
packages is not necessary for development. Their builds are type-checked;
only `apps/web` issues the deployable bundle. These packages are not intended for
be executed directly by Node or published.
- Keep the graph above without cycle; no packages depend on `apps/web`.
ESLint prohibits imports of React, OpenLayers and other internal packages
in `mission-core`. Browser APIs are not included by TypeScript.
- Place the `*.test.ts` tests near the calculations; `pnpm test` has discovered them since
the root. Do not replace missing data with fictitious data
presented as scientific.
- Import styles shared via `@marps/ui/styles.css`. The styles
OpenLayers are imported by the application, which has this dependency.
Tailwind is compiled by the Vite plugin from `apps/web`; the classes used
in `packages/ui/src` are detected by the `@source` directive of this file.

## Data

The MVP data is **frozen in the repository** under `apps/web/public/data`
(approximately 6.0 MB) and served statically at the address `/data/`. `pnpm build`,
`pnpm test` and the app never contact NASA or USGS.

| Dataset | Delivery | Content |
| --- | --- | --- |
| `mola-colorized-relief` | remote (Trek) | Global orientation background, not fixed |
| `jezero-hirise-mosaic` | frozen | HiRISE WMTS tiles, zooms 12 to 16, on the sector |
| `jezero-hirise-dem`, `-slope`, `-hillshade` | frozen | Altitudes, slopes and shaded relief HiRISE, aggregated at 4 m |
| `jezero-ctx-dem`, `-slope`, `-hillshade` | frozen | The same grids at 20 m (CTX), in retreat |
| `jezero-sampling-sites` | frozen | Skinner Ridge, Wildcat Ridge and Amalik (GeoJSON NASA) |
| `jezero-themis-night-ir` | frozen | THEMIS night infrared (Mars Odyssey), 4 level 9 tiles covering the entire HiRISE mosaic; qualitative contrast, not a temperature |

| `jezero-meda-temperature`, `-pressure` | frozen | MEDA soil temperature and pressure 500, one value per Martian hour |

The manifest separates the **global orientation** (region `global`) from the **detail of
Jezero** (region `jezero`). Each capacity (`imagery-hirise`, `terrain-dem`,
`terrain-slope`, `science-sites`, `thermal-themis`…) carries its status; an unprepared capacity
is `unavailable` with his reason. A background can never activate data
absent: `capabilityStatus` of `@marps/data` only retains declared games
for the requested region and takes the lowest status.

Each dataset maintains identifier, URL, instrument, date/sol, units,
CRS, right-of-way (planetocentric degrees, positive longitude towards the east),
resolution, status, source version, credit, conditions of use, imprint
SHA-256 of the upstream source and each frozen file. An unknown value remains
`null` (date, sol, vertical datum); an absence of data is never converted
to zero: transparent pixels for images, `NaN` for altitude and slope.

Altitudes and slopes are float32 grids (`NaN` = no data) whose
manifest gives the origin, step, projection and vertical datum.
`terrainDataset`, `loadGrid` and `sampleGrid` of `@marps/data` read them; HiRISE
is preferred, CTX takes over if missing. The mesh size is not a
navigation accuracy. Details and limitations: [`docs/relief-jezero.md`](docs/relief-jezero.md).

MEDA conditions are **measurements passed to the rover**, never a forecast
on the course. The preparation reads the complete CSV of each soil and its label
PDS4: the MD5 fingerprint and the column unit must match, otherwise it
stops. Only one column is kept per measurement: `ATS_LOCAL_TEMP1` (sensor of
mast at 1.45 m, the least heated by the rover) for the temperature, `PRESSURE` of
derivative product for pressure. The five sensors are never averaged.
Each hour keeps the median of valid values, their number and the window
measured (MEDA only measures part of the hour). An empty, non-numeric value,
equal to the `9999999999` sentinel or physically impossible (except 120–330 K or
100–1300 Pa) is counted and discarded; a time without a valid value remains `null`
and displays “unavailable”. The values ​​remain in kelvins and pascals;
`kelvinToCelsius` (K − 273.15) converts them to display. The uncertainty of
pressure is not used: the column is empty and its label declares it as
kelvins. The location is the last NASA stop (`M20_waypoints.json`) before ground;
a ground where the rover has rolled is refused, because its measurements would come from several
places. `loadMedaConditions`, `conditionsAt` and `availableHours` of
`@marps/data` read them.

The wind is no longer published after ground 315 (damaged sensor): the capacity
`weather-wind` is declared unavailable, with its reason and source, and
`windStatus` reads it. Preparation stops if a wind file appears for
prepared soil. Inventory: [`docs/meteo-et-dangers.md`](docs/meteo-et-dangers.md).

### Prepare and check

Preparation is an explicit step. She asks [uv](https://docs.astral.sh/uv/)
and accesses the network; the Python environment is reproducible thanks to
`tools/data/pyproject.toml` (exact versions) and `tools/data/uv.lock`.

```sh
pnpm data:prepare   # downloads, crops, computes checksums and writes the manifest
pnpm data:check     # reads frozen files without network access
pnpm data:test      # script tests
```

`data:prepare` writes to temporary folder, validates, then replaces
`apps/web/public/data` ; a network or validation failure leaves the data
current intact. The DEM CTX, the block of lines read in the DEM HiRISE (103 MB
on 1.8 GB, per request `Range`) and MEDA CSVs are cached in `tools/data/.cache` (ignored
by Git) and their footprint is checked: if an upstream source changes, the preparation
stops for review. The sector, URLs and credits are in
`tools/data/marps_data/spec.py`.

`data:check` control: required fields, valid footprints and coordinates, sites in
area, file sizes and footprints, units, altitudes `NaN`
(no sentinel value), transparent pixels, grid transformation,
presence of each site on a valid mesh, slopes between 0° and 90° on the same
grid as their altitudes, 24 hours MEDA by ground with a value only
where valid measurements exist, position of the rover in the sector, and
status/capacity consistency.
Research notes are in [`docs/`](docs/) and control samples
in [`data/research/`](data/research/).

## Variables and deployment

No environment variables are required. Future variables `VITE_*`
will be public and integrated into the bundle: never place any secrets there.
Document each new variable and provide a `.env.example` if necessary.
Local `.env*` files are ignored. The deployment must serve the content of
`apps/web/dist`. The root configuration is in `vercel.json`; see the
[deployment guide](docs/deploiement-vercel.md) for previews, recipe
and reverting to a previous version.

## Continuous integration

The workflow [CI](.github/workflows/ci.yml) runs on each pull request and
each push on `main`. It reads Node in `.node-version` and pnpm in
`package.json`, install with `--frozen-lockfile`, then run from root
`pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`.
The pnpm store cache depends on `pnpm-lock.yaml`; installation remains mandatory.
An error stops the job. Only reading of the deposit is authorized.

After success, the artifact `web-dist` contains `apps/web/dist` and remains available
seven days in the GitHub Actions run page. Tests use inputs
local, without secrecy or NASA calls. The base is currently testing the units of
duration ; return tests, distances and missing data will accompany the
mission engine in its dedicated exits.

To reproduce the controls, from a clean clone, follow the installation
above then run the four commands in that order. To check the
regression detection, temporarily add TypeScript assignment
incompatible in `mission-core`: `pnpm typecheck` must fail. Replace
temporarily the factor `60` of `minutesToSeconds` by `59` must fail
`pnpm test`. Cancel these changes before rerunning the checks.

References: [workspaces pnpm](https://pnpm.io/workspaces),
[Vite](https://vite.dev/guide/) guide.

## Global Mars map and offline use (#7)

The map is mounted in #5's `MapStage`, uses `PlannerProvider` view state, and
consumes #6's dataset descriptors. The existing planner, design system, French
interface, theme and panels are preserved. The app opens on the interactive global Mars
view; drag to pan and use the wheel or lower-right zoom controls to explore.
“Entire Mars” restores the full-planet extent; the Jezero marker or “Open Jezero” returns to
the detailed sector. Detailed planning remains unavailable outside Jezero.

MOLA uses the manifest's NASA Trek URL and attribution, with a planetocentric
geographic grid registered as `MARS:104905` (NASA identifier
`urn:ogc:def:crs:EPSG::104905`). Origin: −180°, 90°; 256-pixel tiles;
2 × 1 tiles at level 0; source levels 0–7. No Earth Web Mercator or Earth distance
calculation is used. Two bundled NASA level-0 JPEGs under `public/data/mola`
provide a coarse global overview without NASA connectivity. The nominal
463 m/pixel source sampling does not describe that overview's resolution.

Jezero entry displays the prepared local HiRISE tiles using the manifest's
extent, zoom ranges, URLs, and credit. It never requests a local tile outside
the frozen ranges. Further detailed-map tools and site overlays belong to #8/#9.
The approximate global Jezero marker is not used as a scientific site coordinate.

Production builds precache all final assets, fonts, lazy-loaded design-system
code, the manifest, and prepared local datasets. After the French offline-ready
message appears, reload works with internet disconnected. First installation
requires a connection or distribution of the static build over a local server;
HTTPS or localhost is required for service workers. Development mode does not
install a worker. Browser storage clearing/eviction requires preparing again.
Successfully fetched additional global MOLA tiles are cached with a 180-tile
limit; unvisited detail falls back to the bundled overview. This is not a complete
high-resolution planetary download or a guarantee of mission suitability.

Installation failure shows an error and retry action; has stalled installation
times out after 30 seconds. Waiting updates ask users to close all app tabs and
reopen. Cache versions hash worker logic and every final file, including HTML and
public data. Regular CI tests cover failure/timeout/update states, public-data
and HTML invalidation, and cached navigation/assets without network access.

Source of the bundled overview, verified 2026-11-14: NASA / JPL-Caltech / GSFC,
MGS MOLA, distributed by NASA Trek:
https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml

Local validation: lint, typecheck, 148 JavaScript tests, production build, the
frozen-data integrity check, and 19 Python tests pass. Headless Chromium verified
the planner shell, global/Jezero navigation, rendered local imagery, all 108
precached resources, reload without internet, mobile width, and no page errors
or local 404s with NASA blocked. Live NASA JPEGs returned HTTP 200; retry
recovered after restoring the blocked service, and keyboard navigation emitted
only in-range global tile URLs. A deployed check of this feature branch remains
pending publication; earlier `dev` deployments do not contain this implementation.

## Tablet and wrist layouts

Below 1280 CSS pixels, or on screens at most 600 pixels high, use the Map /
Navigation mission. Map keeps the map within the viewport; Mission exposes the
existing panels in a separate scrollable area. On very small wrist displays,
settings and theme controls remain accessible in Mission. Map options and source
information open from “Map and sources”; zoom stays above attribution.

Map controls and compact navigation/view selectors have targets at least 44 × 44
CSS pixels. Coarse-pointer devices also receive larger shared controls. The map
viewport owns pan/pinch gestures; mission panels and options scroll independently.
No viewport setting disables browser zoom.

Browser viewport checks covered 240×240, 320×320, 390×844, 768×1024, 1024×768,
844×390, and 1280×800. Compact map controls remain visible without horizontal
scroll or control overlap. Mission panels and map options remain accessible;
map dragging and zooming were exercised. The production worker hid the 108 built
resources, including responsive styles and the prepared datasets. These checks
use browser simulation; physical tablet/wrist hardware and glove input remain
unverified.

## Jezero mosaic exploration (#8)

The Jezero view starts at the prepared mission sector and allows exploration of
NASA's full declared HiRISE footprint (77.2229331–77.583964° E,
18.3067994–18.669315° N), at WMTS levels 0–17. The pinned capabilities supply
product bounds and matrix dimensions through optional manifest `wmts` metadata.
Existing schema-2 readers remain compatible. The 91 prepared tiles at levels
12–16 retain their original local paths and integrity hashes; other valid tiles
use the NASA template, with at most eight simultaneous map tile loads and a
15-second request timeout. Retry and return-to-prepared-sector actions remain
available after failures. The Mars/Jezero switch preserves planner state.

Yellow outlines mark product bounds, blue dashes the mission sector, and white
point outlines the prepared tile envelope at the current integer zoom. Patterned
background means no displayed image; a transparent pixel or a failed request is
not evidence of navigable terrain. Scientific capabilities remain scoped to the
original mission sector. The three manifest sites select their existing sheets;
overlapping touch hits offer a named choice.

The 100 CSS-pixel scale uses the manifest Mars radius (3,396,190 m), angular
resolution and cosine of the center latitude. Coordinates are planetocentric,
east-positive longitude/latitude. Nominal 0.25 m/pixel source sampling is distinct
from displayed sampling and does not establish positioning accuracy.

Production installation includes prepared resources. Extra streamed HiRISE tiles
are not promised after offline reload: their bounded persistence belongs to #24.
NASA connectivity is optional for the prepared-sector workflow. Validate browser
rendering, disconnected reload, and physical tablet/glove interaction before
operational use; these have not been exercised for this implementation.

### Perseverance historical context (#20)

The Jezero sector panel includes an optional Perseverance history toggle. It
shows NASA-published positions and separate drive segments, not a validated
human route or current telemetry. Select a feature on the map or use the
keyboard-accessible list to inspect its sol/RMC. Overlapping rover hits narrow
the list; science sites keep selection priority. Mission steps are unaffected.

The prepared extract includes complete segments intersecting the mission sector
and their available endpoint waypoints. Outside it, missing history means no
prepared data, not evidence that the rover never visited. Original source
coordinates are preserved; five endpoint discrepancies are listed in the
snapshot quality details. No snapping, gap filling, site substitution or vertical
alignment is performed. CRS84 in the upstream metadata is interpreted explicitly
as Mars planetocentric east-positive longitude/latitude, not Earth coordinates.

History files ship with the production PWA and are included in its versioned
precache. After a successful online/local installation and offline-ready status,
the layer needs no NASA connection. Failed history loads offer retry without
blocking imagery or the mission. Production offline/tablet interaction still
requires acceptance testing; the automatic checks do not establish it.

## Missions, camps and activities (#11)

Navigation at base/on mission separates preparation and monitoring. The theme,
the map and the Panel, Button and StepList components are preserved.

### At the base: missions, models and camps

A single **Mission** panel has three tabs: **Prepare** (the wizard, for
a mission or a model), **Camps** (the camp catalog) and **Missions**
(recorded missions, models and history). A recorded mission is
starts directly from the Missions tab. A new mission can
always start from an existing model.
Creation follows three steps:

1. Objective and name: choose reconnaissance, observation, photography or
levy. A name is proposed automatically and remains modifiable. A
new mission can take over a saved model without modifying this model.
2. Camp and route: select a camp already registered, add stages
from the catalog or by contact details, reorder the visits and define their
activities (photo, observation, sampling) and durations in minutes. A mission
requires a camp and at least one stage; a template can leave them to complete.
3. Verification: consult the summary, set available time, speed and
reserve, then save. Startup is suggested after recording.

The **Camps** tab allows you to search among existing camps or to
save a new one, then edit or delete them. In step 2,
the “Create camp” button opens this tab. Save a camp does not select
nor does it modify the camp of a mission in preparation. The missions keep a copy of the chosen camp,
including if the catalog is subsequently modified.

Destructive actions require confirmation. A message indicates errors
storage. Readiness checks are only available in Jezero.
The camp catalog remains viewable regardless of the map view.

### On a mission

Start creates an independent copy of the plan and resets the checkmarks.
Modifying a model or mission at the base does not modify the current output.
The reducer prohibits configuration changes in tracking. The route,
checkable activities and site sheets remain accessible; the settings
and allocations are read-only. The tasks of the cards remain distinct
activities of the visits and are not automatically added to them.

The tracking is automatically saved on this device and restored to the
reloading. Each output has an updated history entry with
its checkmarks; starting another exit keeps the previous ones. History
indicates the last save date and does not claim that an output is
finished. The camp–stages–camp geometry connects direct segments: it does not
does not constitute a validated practicable path. The complete budget calculation remains #14.

### Storage and simulation data

IndexedDB `marps-missions` version 3 separates `camps`, `missions`, `templates`,
`tracking` and `history`. Migrations retain old data. THE
existing preparations remain in missions; they are not reclassified
automatically as templates. The missions carry `schemaVersion: 1`, their
identity, type (optional for old saves), name, region, camp,
ordered steps, activities and checkmarks, parameters, assumptions and work of
files. General times are in seconds, speed in m/s and times
of activities in minutes. Negative/non-finite values, zero velocity and
a reserve greater than the available duration are refused.

The `apps/web/src/storage/missionDatabase.ts` repository constitutes the point to
expand for a future shared catalog. There is currently no server,
neither multi-crew synchronization nor telemetry. Clear data from
browser deletes this database.

### Local backup and restore (#18)

The current preparation is also automatically saved in
`localStorage`, under the key `marps-mission-draft`, with the mission diagram
versioned. She finds her name, her camp, her route, her activities, her
Valid settings and files work after reloading. The assistant
resumes at the first step; a still invalid form entry is not
not recorded. The **Save Mission** button keeps a copy in
the existing IndexedDB catalog; models, outputs and histories remain there
separated from the draft. Modifying a preparation does not overwrite this copy before
a new explicit recording.

New backups keep the identifiers in `dataReferences`,
versions and SHA-256 fingerprints of sources in the region. The old missions
v1 without this field remain readable; the references already registered are
retained upon reopening. No rasters or tile caches are serialized
in `localStorage`: map resources remain in caches
of the application.

A corrupt preparation, an unknown schema version, or a missing site in the
catalog produces an explicit message. The original backup is preserved
until its confirmed replacement. Monitoring is also controlled in relation to
in the catalog before restoration, without replacing a missing site. A refusal of
storage or quota exceeded displays an error; a later modification
try writing again. The absence of IndexedDB does not crash the interface and
tracking loading can be restarted.

**Edit mission** allows you to rename it before saving it again;
**Delete** removes its copy from the catalog after confirmation.
**Reset preparation** creates an empty draft after confirmation and
maintains saved missions, templates, tracking and history.
Testing covers serialization, reloading, corruption, versions
unknowns, missing sites, storage refusals and quotas.

The `packages/data/src/camps.ts` example camps are fictitious and initialized
only once. Their positions in the prepared sector neither confirm nor
habitability, neither presence of equipment, nor NASA selection. The research has not
identified from NASA catalog of recorded Martian human camps. The report
[NASA on science and planetary protection before human missions](https://ntrs.nasa.gov/citations/20250009522)
is studying a scenario in Jezero without validating these camps. THE
[data Perseverance](https://science.nasa.gov/mission/mars-2020-perseverance/)
concern real robotic exploration and remain separate from simulations.

## World Atlas of Mars

In the **Entire Mars → Layers** view, the atlas adds an HRSC color background,
USGS geology and TES thermal inertia. Click on Mars, or move it
card on the keyboard then choose **Read in the center of the card**, to read
coordinates, geological unit if the layer is activated, solar time
average/true and the season `Ls`. The UTC date is adjustable (2000–2026, range
time conversion verified). These calculations are independent of the monitoring of
mission and times of MEDA measurements.

The color background delivered is the HRSC preview at approximately **16.7 km/pixel**, distinct from the
original product at 2 km/pixel. The 1,311 polygons of SIM 3292 come from the
Esri StoryMaps copy, simplified to 0.08°; their descriptions remain in English.
TES is a qualitative layer at 8 pixels/degree, limited to 60°S–60°N: none
temperature or inertia value is not deduced from its colors when clicked.
The Jezero marker remains accessible above the layers.

The files are frozen separately in `apps/web/public/atlas` (~7.2 MB), with
their own manifest (sources, transformations, imprints), so that
`data:prepare` does not delete them. The offline build and installation
include automatically. The sources can also be consulted on the page
**Sources**. The Mars Climate Database is offered by link to its interface
external ; no MCD climate field is integrated. Detailed planning
remains limited to Jezero.

Preparation and acquisition limits: [atlas note](docs/atlas-mondial.md).

## Languages

Use the header selector to switch between French and English. The initial language follows the browser, with French as the fallback. The preference is saved on the device. Both translation catalogues ship with the application and work offline. Dates, numbers and coordinates follow the selected language.

Translations live in `apps/web/src/locales/fr.json` and `apps/web/src/locales/en.json`. Keep their keys and interpolation variables aligned. The localization tests check catalogue parity and French source text coverage, including prepared scientific data and site sheets.

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
