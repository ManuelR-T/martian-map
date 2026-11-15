# Detailed regions beyond Jezero

Issue #31. The catalogue is not tied to Jezero: every detailed region comes from
`apps/web/public/data/manifest.json` (`regions[]` with `kind: "detailed"`), declared in
`tools/data/marps_data/spec.py` (`PENDING_REGIONS`) and written by `prepare.py`.

The app derives its region list, map markers and region view from the manifest
(`detailedRegions()` in `packages/data`). A region shows what its capabilities say and nothing else:

- **Verified local imagery** opens the detailed map (today only Jezero).
- **No verified imagery** frames the region on the global MOLA orientation basemap, outlines
  its sector and lists each capability with its status and reason.
- **Planning** (steps, budget, site sheets, conditions) stays in the mission's region. Other
  regions are for orientation until their own data and scenario exist.

Nothing is copied from Jezero: weather, hazards, sites and sheets belong to one region only.

## Declared regions

| Region | Sector (lon °E, lat °N) | Why | State |
| --- | --- | --- | --- |
| Jezero | 77.395–77.412, 18.445–18.465 | Perseverance, demo scenario | Detailed, verified |
| Gale | 137.30–137.55, −4.75 to −4.50 | Curiosity landing site and traverse | Declared, all capabilities unavailable |
| Utopia Planitia | 109.80–110.05, 24.95–25.20 | Zhurong landing site | Declared, all capabilities unavailable |
| Elysium Planitia | 135.50–135.75, 4.40–4.60 | InSight lander | Declared, all capabilities unavailable |

Sectors frame the published landing coordinates for navigation only. Confirm them against the
mission sources during the checklist below, before any data depends on them.

## Checklist per region (before turning a capability on)

Copy for each region. A capability becomes `available` or `partial` only once its line is done.

- [ ] **Imagery**: product (HiRISE, CTX…), Trek or PDS layer, coverage of the sector, resolution.
- [ ] **DEM**: product, resolution, vertical datum, NoData holes inside the sector.
- [ ] **Scientific sources**: sites and sheets cited from mission publications, specific to the region.
- [ ] **Coverage**: extent of each dataset contains the region sector (`data:check` enforces it).
- [ ] **Reference frame**: planetocentric, longitude positive east, Mars radius 3 396 190 m.
- [ ] **Access and credits**: terms read (`terms.verified`), credit line, redistribution allowed.
- [ ] **Verification**: HTTP status, content hash, overlay checked in the browser, file sizes.
- [ ] **Scenario**: a region-specific demo; no Jezero weather, hazards or sheets reused.
- [ ] **Offline**: separate offline cache only if decided for this region.

## Adding a region

1. Add it to `PENDING_REGIONS` in `tools/data/marps_data/spec.py` (id, name, extent).
2. Run `pnpm data:prepare` (or rebuild the manifest), then `pnpm data:check` and `pnpm data:test`.
3. It appears on the global map with an "Open" button; no app code changes are needed.
4. To enable data, add its datasets in `prepare.py` and replace the pending capabilities with
   real ones, once the checklist passes.
