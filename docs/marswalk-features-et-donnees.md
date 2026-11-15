# Marswalk Planner — verified features and data

Verification November 14, 2026. SWE student team, prototype in two days. **The data needed for the MVP is available and samples are kept in the repository.** This does not mean that the features or their browser integration are already implemented.

## Recommended perimeter

A small sector of the Jezero Delta front; three stops: Skinner Ridge, Wildcat Ridge and Amalik. The departure represents a fictitious camp set by the user. The coordinates of the samples come from NASA, the activities proposed to the astronauts and their duration are choices from the scenario.

P0 = demonstration base; P1 = after the base; P2 = extension.

| Priority | Functionality and expected result | Data and status |
| --- | --- | --- |
| P0 | 2D map: zoom, movement, landmarks | HiRISE by Jezero via NASA Trek; XML and three PNG tiles downloaded and decoded. The two tiles covering the three stops are non-transparent. |
| P0 | Choose the starting camp | User click in the area; fictitious position explicitly indicated. No need for an actual human base. |
| P0 | Show three scientific stops | GeoJSON NASA samples downloaded; names, contact details, samples and rock types inspected. JPL sources for their scientific interest. |
| P0 | Add, remove and reorder stops | Application status; no additional external data. |
| P0 | Trace a route including the return | Drawn polyline or prepared scenario. Historical trace of the rover available as context, without qualification as a pedestrian path. Do not present segments connecting points as a calculated passable path. |
| P0 | Calculate total distance | Martian coordinates and radius. Measure the entire polyline, including the return; do not use the default earth radius. |
| P0 | Set mission duration, speed and observation times | Scenario parameters, not NASA measurements of human movement. No physiological calibration validated in this work. |
| P0 | Show walking time, observation time, return and margin | Deterministic calculation from the route and parameters; explicit reservation, counted only once. |
| P0 | Alert on an overrun and recalculate after each modification | Calculated state; means exceeding the chosen budget, not predicting survival. |
| P0 | Information about each stop: interest, proposed activity, source | Facts sourced from NASA/JPL; activities and durations written by the team. Photos must be associated with their true location/date. |
| P0 | Distinguish observations, calculations and hypotheses | Origin of each data, scale/resolution and date; keep the status unknown. |
| P1 | Relief and altitude profile of the route | Fixed altitude and slope grids: DEM HiRISE aggregated at 4 m, DEM CTX 20 m in retreat; the three stops fall on valid stitches. See [relief-jezero.md](relief-jezero.md). |
| P1 | Night infrared layer and explanation | THEMIS Mars Odyssey mosaic at 100 m/pixel; a tile covering the sector downloaded and decoded. Historical contrasts, not current temperature in degrees. |
| P1 | Save/reload and export a mission sheet | Local JSON and printable form from application state. |
| P1 | Offline demonstration on the chosen sector | Freeze the necessary files; the DEM is preserved, but only a few tiles have been downloaded. Create the complete cache at the chosen zooms and test it. |
| P2 | Suggest a path according to the slopes | Slope grids available (4 m and 20 m), but a cost grid must be constructed, scenario thresholds set, obstacles tested and gaps addressed. Even at 4 m, the DEM does not describe every obstacle. |

## Sources and proof of access

### HiRISE Imaging: available

[NASA Trek Catalog](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars).

Layer: `JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd`.

- [WMTS](https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/WMTSCapabilities.xml) configuration retrieved entirely via HTTP 206.
- `12/1627/5857.png` and `12/1628/5857.png` tiles: HTTP 200, 256 × 256 images decoded, three-point coverage verified by WMTS grid.
- Observed `Access-Control-Allow-Origin: *` header with local origin.
- Martian equirectangular grid, 2 × 1 tiles at level 0; configure the coordinate system and distances. Tile sampling depends on zoom, even if the source product is at 25 cm/pixel.

### CTX altitudes: available, full file preserved

[USGS](https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_ctx_dtm_mosaic) file · [GeoTIFF direct](https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif).

- HTTP 200, 9,662,387 bytes; GeoTIFF actually decoded with `tifffile`.
- 1,596 columns × 1,512 rows; float32 values; step of 20 m; all cells read are finished and none contain the declared NoData value.
- Equirectangular projection, Mars 2000 sphere with radius 3,396,190 m, central meridian and standard parallel at 0°.
- Extent calculated from GeoTIFF: approximately 77.1605–77.6990°E and 18.2110–18.7212°N. It contains the three stops.
- Altitude values ​​were read at three coordinates. This control of influence is not an independent validation of the horizontal registration or the vertical datum of the sources. For the profile, use the same DEM over the entire route, without mixing its values ​​and the altitudes of the samples.
- A grid spacing of 20 m does not allow us to say that a path is passable on foot.

The previous note did not validate the global MOLA download. This result relates to **another product: a local CTX DEM from Jezero**, now downloaded and inspected.

### Stops and routes: available

[Samples NASA](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_SAMPLE_v3.json) · [Positions](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json) · [Trace](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json).

All three HTTP 200 responses have been decoded. Excerpts are kept in `data/research/`. See [detailed site control](verification-sites-jezero.md) for coordinates and scientific sources. The stops are in a geometric diameter of approximately 555 m; this value is not the length of a route.

The preserved historic segment does not connect the three stops. You have to prepare the route of the scenario; it should not automatically appear as a validated human route.

### THEMIS infrared: integrated (#22)

[NASA Trek](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars) catalog layer: `THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018`, Mars Odyssey mission, nighttime mosaic at 100 m/pixel.

Retrieved WMTS configuration and `9/203/732.png` tile, HTTP 200 tile, PNG 256 × 256 decoded, opaque and non-uniform, CORS `*`. The research sample is in `data/research/`.

Integrated by #22: `pnpm data:prepare` freezes the WMTS capacities and the 4 tiles of level 9 (the finest, approximately 81 m/pixel) which cover the entire area of ​​the HiRISE product, under `apps/web/public/data/jezero/themis/` (game `jezero-themis-night-ir`, approximately 220 KB). The official template contains `1.0.0//{Style}`; the single form `/` returns the same bytes. Beyond ±65° latitude and at level 10, Trek responds to HTTP 404.

These gray levels are not temperatures. The USGS describes these mosaics as qualitative 8-bit products, stretched and melted for display: no degrees, no encrypted thermal inertia. At night, dust and fine sand cool quickly and appear dark; rock and hardened soils remain clear ([USGS](https://stac.astrogeology.usgs.gov/docs/data/mars/themis_controlled_mosaics/)).

### Detailed geology: product identified, additional preparation

[USGS SIM 3464](https://pubs.usgs.gov/publication/sim3464) · [README](https://pubs.usgs.gov/sim/3464/sim3464_readme.txt) · [Archive SIG](https://pubs.usgs.gov/sim/3464/sim3464_database.zip).

README retrieved (HTTP 200); central directory of the ZIP inspected by partial request (HTTP 206). The 349,336,873 byte archive contains a geodatabase and rasters; complete download and conversion not completed. The README indicates random offsets of approximately 100–200 m from the controlled operational mosaic. To be kept in extension: do not assume precise alignment with each sample.

## Minimum duration model

All times are in minutes and distances in kilometers; speed is in km/h.

```text
walking = 60 × total route distance / selected speed
observations = sum of the selected durations at each stop
margin = available time − walking − observations − selected reserve
```

The complete route includes the return to camp. The return is displayed separately in the interface but is not subtracted twice. If a stop is deleted, also recalculate the route and its distance. The observation times make it possible to demonstrate an exceedance even in this small sector.

The indicator remains “margin according to assumptions”. Oxygen, radiation dose, current local weather and survival probability are not part of the verified model.

## Artifacts and next step

- `data/research/jezero-ctx-dem-20m.tif`: true source raster, approximately 9.7 MB.
- `data/research/jezero-hirise-wmts.xml` and `jezero-hirise-*.png`: configuration and three source tiles.
- `data/research/jezero-themis-night-*.png`: an infrared tile.
- `data/research/perseverance-*-extrait.json`: three small NASA extracts.
- [Manifest of controls](../data/research/marswalk-data-verification.json): URLs, sizes, SHA-256 fingerprints, formats and site coverage.

Next development milestone: superimpose the three points on the HiRISE background in the browser, then vary an observation time and check the recalculation of the margin. No browser rendering, application calculator, or full offline testing was performed during this data verification.
