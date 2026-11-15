# Data preparation

The preparation Python scripts and their dependencies remain in this folder.
They are not required to install, start or build the frontend.

- `marps_data/spec.py`: Jezero sector, upstream URL, credits, conditions of use.
- `marps_data/prepare.py`: downloads, slices and freezes the data, then writes the manifest.
- `marps_data/check.py`: validates frozen data offline.
- `marps_data/geo.py`: shared grid arithmetic (WMTS tiles, DEM window).
- `marps_data/terrain.py`: aggregation, slope and shaded relief calculated on altitudes.
- `marps_data/geology.py`: partial read of the USGS SIM 3464 zip, MTM to lon/lat, clipping and site candidates (see `docs/geologie-jezero.md`).

From the root of the repository, with [uv](https://docs.astral.sh/uv/) installed:

```sh
pnpm data:prepare   # network required; writes apps/web/public/data
pnpm data:check     # offline
pnpm data:test      # pytest
```

To change the sector, zooms or a source, modify `spec.py`, restart
`pnpm data:prepare`, then commit the regenerated data and manifest. For
add a Python dependency: `uv add --directory tools/data <paquet>==<version>`,
and commit `uv.lock`. See the root README, “Data” section.

## Perseverance history

`marps_data/rover.py` selects original points and full segments intersecting
`spec.SECTOR`, including endpoint waypoints when available. It writes two local
GeoJSON files and `quality.json` under `jezero/rover/`. Source hashes are pinned
in `spec.ROVER_HASHES`; raw downloads are cached as `.cache/M20_waypoints.json`
and `.cache/M20_traverse.json`. Ordinary builds/checks/tests never download them.
To refresh, explicitly download and review the changed source, update the hash,
replace its cached input, and run `pnpm data:prepare` then `pnpm data:check`.
Never accept changed geometry or metadata solely to bypass a hash failure.
Schema 3 adds the rover dataset kinds; schema 4 adds the `geology` kind. Ship manifest and consumer together.
