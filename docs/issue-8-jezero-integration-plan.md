# Issue #8: Jezero HiRISE integration plan

Status: implemented in the working tree; browser/tablet acceptance remains pending. Branch:
`feat/8-jezero-hirise-coverage`, created from the local `dev` checkout.

## Goal and operating assumptions

Deliver [issue #8](https://github.com/ManuelR-T/martian-map/issues/8): explore
the full NASA HiRISE mosaic, identify the three scientific stops, and understand
which imagery and mission data are actually available. The primary workflow is
a tablet PWA operating without an Earth connection. Prepared local resources
must work independently of NASA, live capabilities discovery, and telemetry.
Connected NASA exploration is an optional preparation capability, not a runtime
requirement for an astronaut's prepared mission.

This feature extends the existing map rather than replacing the planner.
Dependencies #6 and #7 are closed. #9 is also closed: reuse its site sheets and
selection state. [#24](https://github.com/ManuelR-T/martian-map/issues/24) remains
responsible for bounded persistence of additional Jezero tiles and stronger
offline preparation/storage reporting. Neither imagery nor this plan certifies
human navigation or terrain traversability.

## Repository findings

- `PlannerMap.tsx` selects manifest imagery; `GlobalMarsMap.tsx` currently mounts
  both views. Jezero has only local imagery, no site overlay or metre scale, and
  its view extent/zoom limits come from the prepared extract.
- `marsWmts.ts` already uses the correct 2 × 1 geographic tile grid at level 0.
  Its region source deliberately returns no URL outside frozen tile ranges.
  Preserve that local-file protection while adding remote coverage.
- The manifest has 91 prepared HiRISE PNGs across levels 12–16, not just the two
  level-12 tiles mentioned in the issue. Its imagery `extent` is the finest
  frozen tile envelope, not the NASA product bounds. Other levels have different
  tile envelopes; one rectangle cannot describe exact offline coverage.
- `Catalog` drops the manifest's planet and region-coverage metadata, returning
  a separate approximate region navigation list. The detailed map needs the
  actual manifest mission extent and Mars radius.
- `selectPlanningStatus` currently checks global versus regional view only.
  Exploring a larger image must not extend the geographic scope of mission
  capabilities or enable arbitrary outside-sector planning.
- The production worker precaches the shell and local datasets atomically and
  maintains a separate bounded MOLA cache. It does not persist remote HiRISE
  tiles. Existing install readiness does not establish extra tile coverage.
- Source files currently contain French interface text without a locale catalog.
  Follow the UI preference for English source messages and matching French
  messages when adding copy; keep any message extraction limited to this feature.

## Verified product contract

Use the frozen, fingerprinted
`apps/web/public/data/jezero/hirise/WMTSCapabilities.xml` as the reproducible
source. Its upstream reference is the
[NASA WMTS capabilities](https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/WMTSCapabilities.xml).
These values were inspected in the repository snapshot, not revalidated against
the live service during planning:

| Property | Value |
| --- | --- |
| Layer | `JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd` |
| Style / matrix set / format | `default` / `default028mm` / `image/png` |
| CRS | `urn:ogc:def:crs:EPSG::104905`; existing map code `MARS:104905` |
| Product bounding box | 77.2229331–77.583964° E; 18.3067994–18.669315° N |
| Mission sector | 77.395–77.412° E; 18.445–18.465° N |
| Origin / tile size | −180°, +90° / 256 × 256 pixels |
| Declared levels | 0–17; width `2^(z+1)`, height `2^z` |
| Angular resolution | `360 / (256 * matrixWidth)` degrees per pixel |
| Mars reference radius | 3,396,190 m, from `manifest.planet.radiusMeters` |

Coordinates remain planetocentric degrees, east-positive, in longitude/latitude
order. The misleading WMTS `WGS84BoundingBox` element does not make this Earth
data. Derive the angular grid from matrix dimensions and origin; do not apply an
Earth metres-per-degree conversion to WMTS scale denominators. The product box
is an envelope, not proof that every pixel inside has imagery. Preserve alpha
transparency as NoData.

## Implementation sequence

### 1. Separate product, mission, and prepared coverage in the manifest

Extend the imagery contract with optional remote WMTS metadata: layer, style,
matrix set, CRS, format, tile URL, product bounds, and explicit matrix entries
(identifier, origin, tile dimensions, matrix dimensions/angular resolution).
Keep existing local delivery, files, and per-level ranges as the prepared
inventory. Keep the existing dataset extent semantics; add product bounds
explicitly rather than silently expanding a field used by integrity checks.

Generate these values from the pinned capabilities in `tools/data`, validate
them in `check.py`, and version the manifest schema with its TypeScript and
Python consumers together. Update committed metadata reproducibly without
redownloading DEMs or changing binary assets unnecessarily. Expose planet and
manifest region coverage through `Catalog` while preserving navigation metadata
used by the global Jezero marker. Update fixtures/callers affected by the contract.

Represent three independent concepts throughout the map:

1. Product bounds: where imagery exploration is permitted.
2. Mission sector: where the declared scientific/terrain capabilities apply.
3. Available tiles: exact prepared ranges per level plus any verified #24 cache
   inventory, never an inferred filled rectangle.

### 2. Implement bounded, local-first tile resolution

Extract a pure tile resolver beside `marsWmts.ts`. Reject unsupported levels,
matrix indices, and tiles not intersecting the product bounds. For a valid
tile, resolve a prepared local file first; otherwise expose the declared NASA
URL for an optional connected request. Never generate nonexistent local paths.
Use manifest URLs and `BASE_URL` for bundled assets.

Build the Jezero WMTS grid from the manifest matrices, with longitude wrapping
disabled. The view starts fitted to the mission sector, but allows panning
through the full product extent and zooming across declared levels 0–17.
Do not cap the view at prepared levels 12–16 or imply extra resolution through
unlabeled overzoom. Coarser prepared imagery may remain visible as a fallback
when finer tiles are unavailable; label that fallback accurately.

Use bounded requests and cancellable/timeout-aware loading where applicable.
Avoid speculative full-mosaic prefetching. A failed optional remote tile must
leave prepared imagery, controls, and the planner usable. `navigator.onLine`
is a hint; actual request outcomes determine reachability. Include HTTP, CORS,
decode, timeout, and local-file failure paths; offer explicit retry without an
unbounded retry loop. Clean up loaders, listeners, and stale state on view changes.

### 3. Add a dedicated regional map integration

Keep global behavior in `GlobalMarsMap.tsx`; introduce `JezeroMap.tsx` for the
regional layers and controls, sharing source/grid helpers. `PlannerMap` owns
the choice and wires planner callbacks. Reuse the existing Mars/Jezero switch
and add a one-action return to the prepared sector, available even on failure.
Changing views must preserve mission work and selection.

Overlay the product boundary, mission boundary, and prepared coverage with
distinct line patterns and textual labels. Use a neutral patterned background
for transparent/missing imagery, with separate status for known NoData,
unavailable downloads, and request failures. Do not classify a failed tile as
scientific NoData or promise a complete pixel-coverage mask from bounding boxes.
Show the current coverage/connection state outside the collapsed source panel;
avoid a generic “imagery loaded” message before loads complete. Keep source
credits and limitations in the expandable information panel.

Add a dynamic scale in metres/kilometres using the manifest Mars radius and the
current latitude. Provide a Mars-specific point-resolution calculation for the
geographic projection or calculate the horizontal scale explicitly; never use
OpenLayers' default Earth sphere for distances. Test latitude dependence
(`cos(latitude)` for a horizontal geographic scale). Distinguish nominal source
sampling (0.25 m/pixel) from displayed sampling: prepared level 16 is about
0.636 projected m/pixel, level 17 about 0.318, with east–west ground spacing
varying by latitude. Neither is a positioning-accuracy claim.

### 4. Connect the existing scientific sites

Read the three site coordinates from the loaded manifest, scoped to its sites
dataset and mission region. Render labeled point features and a selected state;
dispatch the existing `siteSelected` action so map and list open the same sheet.
Do not recreate sheets, duplicate site coordinates in application code, or use
the approximate global Jezero marker as a site position.

Skinner Ridge and Wildcat Ridge are close together: use touch hit tolerance and
a labeled choice when several sites are hit, rather than silently choosing one.
Provide the existing list as a keyboard/non-map alternative. Verify all three
positions against the frozen GeoJSON and visible imagery; record that this is
coordinate/render alignment, not independent geodetic validation.

Keep the mission sector immutable during map exploration. Retain existing
mission/site data while panning outside it, show an outside-sector notice, and
prevent location-dependent planning actions from accepting outside-sector
coordinates. Do not enable new science sites, terrain, or validated route
planning because a remote image was displayed. Extend capability/location
checks where needed; a regional-view flag alone is insufficient evidence.

### 5. Preserve offline behavior and define the #24 handoff

#8 must render prepared tiles after production installation, survive offline
reload, show unavailable areas honestly, and support return to the prepared
sector and global view. Keep prepared resources in the existing versioned app
cache; optional imagery failures cannot invalidate installation. No Earth
request may block entry into the prepared mission workflow.

Give #24 a stable tile identity (product/version/matrix set/level/row/column),
the resolver's remote URLs, and an availability interface distinguishing
prepared, verified cached, remote-only, failed, and unknown states. Before #24,
promise offline availability only for prepared resources; HTTP/browser cache
hits alone do not establish durable availability. After #24, query its actual
inventory so cached additions can render without internet. Keep opportunistic
cache writes, eviction, quotas, download estimates/progress, storage-loss
detection, and mission-cache protection in #24. Never precache the full NASA
mosaic as a side effect of installing #8.

The initial install/local distribution still needs HTTPS or localhost.
On Mars, prepare/distribute the static build and region data before use;
the optional NASA path is for connected environments. No new backend or
live Earth service is required for the prepared-sector workflow.

### 6. Make tablet interaction the primary acceptance target

Preserve the existing Carte/Mission layouts and shared design tokens. Test
768×1024, 1024×768, and 1280×800 first, plus narrow mobile and desktop regression
checks. Controls must remain at least 44 × 44 CSS pixels, readable in both
themes, keyboard reachable, and clear without color or hover alone. Separate
pan/pinch gestures from panel scrolling and site selection. Browser zoom stays
enabled. Scale, status, attribution, and recovery controls must not overlap.

Retain the concise French product interface with corresponding English source
messages for new text. Keep high-frequency tile progress out of noisy live
announcements; announce meaningful coverage/failure transitions. Avoid heavy
per-frame React updates and unnecessary map recreation; bound tile work and
release resources on unmount. Exercise physical tablet/glove interaction when
hardware is available and explicitly record if only simulation was possible.

## Verification and completion criteria

Add focused tests for the behavior that changes:

- Manifest generation/checking: pinned WMTS metadata, schema agreement, valid
  matrices, unchanged mission bounds, per-level prepared ranges, and catalog
  access to the planet/coverage metadata.
- Tile resolver: correct row/column order; local precedence; valid NASA URL
  beyond the extract; supported levels including 17; product-edge intersection;
  rejection outside product/matrix bounds; no nonexistent local requests.
- Mars scale: known radius, latitude correction, and no Earth-distance default.
- State/integration: map/list selection agreement, preservation across view
  changes, outside-sector restrictions, failed-to-retry transitions, and no
  scientific capability expansion from imagery.
- Production PWA: prepare while NASA is blocked, disconnect and reload, open
  Jezero and all three sites, see prepared imagery, pan into an unavailable area,
  then recover to the prepared sector and global overview. Verify that high-zoom
  gaps are not presented as guaranteed offline coverage.
- Connected exploration: cross the local extract boundary; observe a real NASA
  PNG render with browser CORS enabled; induce network failure/timeout; restore
  connectivity and retry. Record live-service failures separately from local
  deterministic tests. Persisted additional imagery after reload is a #24
  integration test, not a capability to claim from #8 alone.

Follow `eslint.config.js`: ESLint/TypeScript recommended rules, React Hooks
rules, and zero warnings. Respect strict TypeScript, unused-symbol checks, and
`noUncheckedIndexedAccess`. Import shared APIs through `@marps/*`; use relative
imports inside `packages/ui`. Keep DOM/OpenLayers/network behavior in `apps/web`,
manifest contracts in `packages/data`, reusable visuals in `packages/ui`, and
`mission-core` free of React/OpenLayers/internal package dependencies. Use the
existing dependency versions and pnpm lockfile; no new library is planned.

Before implementation completion, use Node 24.14.0 and pnpm 9.15.4, then run
`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm data:check`, and
`pnpm data:test` (the last two cover the planned metadata pipeline changes).
Keep deterministic tests network-free. Update the README with actual coverage,
controls, coordinate/scale conventions, and the #24 boundary; do not mark
acceptance criteria complete until the corresponding behavior is verified.

Planning-session validation: inspected issue #8, dependencies #6/#7, related
#9/#24, source contracts, worker, lint/TypeScript/CI configuration, and frozen
WMTS metadata. No runtime code or datasets changed. The shell currently exposes
Node 23.7.0 and no `pnpm`; implementation checks will require the pinned toolchain.
No application tests or browser checks were run for this documentation change.


## Implementation record

Implemented the optional WMTS product contract and generator/checker, full-product
regional view, local-first resolver, prepared imagery fallback, bounded tile
loading with timeout/retry, distinct product/mission/per-level prepared boundaries,
Mars horizontal scale, shared site selection and overlapping-touch choice, and
English/French message definitions. Existing planner actions remain site-based;
no arbitrary outside-sector mission-location action was introduced.

Plan adjustment: retain schema version 2 because `wmts` is an optional additive
field and existing dataset extent/delivery semantics are unchanged. Older data
continues to use the existing regional renderer. Catalog planet/coverage fields
are optional for compatibility with existing injected catalogs. No binary data
was regenerated. Persistent extra-tile inventory remains the #24 handoff; the
resolver exposes prepared/remote identity and does not claim cached coverage.

Validation: lint, strict typechecking, 178 JavaScript tests, frozen-data integrity,
and 38 Python tests pass. The production build succeeds with Vite's large-chunk
warning. A live NASA level-17 tile returned HTTP 200, image/png and
Access-Control-Allow-Origin: *. Python checks ran directly through the existing
`tools/data/.venv` because `uv` is unavailable. Browser interaction, production
offline reload, visual coordinate alignment, and physical tablet/glove tests
remain unverified. No commit or push was made.
