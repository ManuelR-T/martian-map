# Jezero geology: interpretive units of USGS SIM 3464

Preparation of November 15, 2026 (issue #28). The geologic layer of the Jezero map comes from
the USGS map **SIM 3464**, clipped to the delta-front sector. It is an interpretation drawn by
its authors at 1:75,000, not a measurement, and the app says so wherever it is shown.

## Source

- **Map.** Sun, V., and Stack, K., 2020, *Geologic map of Jezero crater and the Nili Planum
  region, Mars*: U.S. Geological Survey Scientific Investigations Map 3464, scale 1:75,000,
  [doi:10.3133/sim3464](https://doi.org/10.3133/sim3464).
- **Terms.** The [USGS metadata](https://pubs.usgs.gov/sim/3464/sim3464_metadata.txt) give no
  access or use constraint (`accconst: None`); the README asks to cite the publication.
- **Archive.** [`sim3464_database.zip`](https://pubs.usgs.gov/sim/3464/sim3464_database.zip),
  349,336,873 bytes, last modified 2020-12-03. It holds an ArcMap project, rasters (CTX, HRSC,
  THEMIS) and the Esri file geodatabase `Nili.gdb`.
- **Layer.** `GeoUnits_v1` (1,304 polygons, fields `unit`, `name`, `symbol`, `Color_ID`), in
  Mars Transverse Mercator: sphere of 3,396,190 m, central meridian 77.5° E, scale factor 1,
  no false easting or northing (`CoordinateSystems/MTM_clon77_5E.prj`).

## Preparation

`tools/data/marps_data/geology.py`, called by `prepare_geology` in `prepare.py`:

1. **Partial download.** One range request reads the last 64 KB of the zip (central directory),
   a second one the 22.6 MB block holding the `Nili.gdb` entries. The other ~327 MB, mostly
   rasters, are never downloaded. The block is pinned by SHA-256 in `spec.GEOLOGY_GDB_SHA256`
   and cached in `tools/data/.cache/sim3464-gdb.bin`; zip CRCs are checked on extraction.
2. **Reading.** `pyogrio` (bundled GDAL, OpenFileGDB driver) reads `GeoUnits_v1` inside a
   box around the sector. The preparation stops if the layer projection is not MTM 77.5° E on
   the Mars 2000 sphere.
3. **Conversion.** Inverse spherical transverse Mercator to planetocentric lon/lat, written in
   `geology.from_mtm`. It matches PROJ to 1 mm on the three stops (see `tests/test_geology.py`).
4. **Clipping.** Units are cut to the sector (`spec.SECTOR`) and merged per symbol with
   `shapely`; coordinates are rounded to 1e-7° (about 6 mm).
5. **Legend.** Name and symbol as published; period from the symbol prefix (N Noachian,
   H Hesperian, A Amazonian, as the pamphlet defines it); colours chosen by the app in
   `spec.GEOLOGY_UNITS`, because the map sheet colours live in ArcMap files not read here. A
   unit new to the sector without a colour stops the preparation.

Units in the sector:

| Symbol | Name | Period | Share of the sector |
| --- | --- | --- | --- |
| NHjf2 | Jezero fan 2 unit | Noachian–Hesperian | 62.8 % |
| Njf | Jezero floor unit | Noachian | 27.4 % |
| Nue | Upper etched unit | Noachian | 8.6 % |
| Aeb | Eolian bedform unit | Amazonian | 1.2 % |

## Registration and uncertainty

The README states that the map was drawn on a semi-controlled CTX mosaic, before the controlled
Mars 2020 CTX mosaic of July 2020, and has **random offsets of about 100–200 m** from it. The
HiRISE imagery and elevation grids of the app are registered to that controlled mosaic.

- **No shift is applied.** The offset is random: no single translation corrects it, and
  estimating local shifts would need control points that the archive does not provide.
- **The uncertainty is the upper bound, 200 m.** It is stored in the manifest
  (`geology.registration.offsetMetres`) and shown under the legend.
- **Contacts are drawn dashed**, never as hard edges.

## Units under the stops

For each stop the preparation lists every unit within 200 m, measured in MTM metres on the
unclipped polygons (scale error below 0.01 % here). A unit is assigned only when it is the
only candidate; otherwise the stop stays undetermined and the app lists all candidates.

| Stop | Units within 200 m (distance) | Assigned |
| --- | --- | --- |
| Skinner Ridge | NHjf2 (0 m), Njf (190 m) | none |
| Wildcat Ridge | NHjf2 (0 m), Njf (173 m) | none |
| Amalik | NHjf2 (0 m), Njf (87 m), Nue (167 m) | none |

All three stops plot inside the fan unit, but a floor-unit contact lies within the offset of
each one, so none is assigned. `pnpm data:check` rejects a manifest that assigns a unit while
another lies within the uncertainty.

## Manifest and app

- Dataset `jezero-geology-units`, kind `geology`, capability `geology`; the manifest schema is
  now version 4. The `geology` block carries authors, year, scale, `interpretive: true`, the
  registration bound, the legend and the per-stop candidates.
- `packages/data`: `findGeologyDataset` and `loadGeologyUnits`, which rejects any unit missing
  from the legend. The scientific status of the dataset is `interpreted`.
- Jezero map: "Geologic map" switch, hidden by default and loaded on first use, with opacity,
  legend, offset warning, unit under each stop, authors, year, scale and link to the USGS record.

## Limits

- 1:75,000 map: units smaller than a few hundred metres are not mapped.
- The unit names are those of the authors and are not translated.
- No sample is tied to a unit: Perseverance publications remain the reference for the rocks
  actually sampled at each stop.
