# Integrated World Atlas

Addition of November 15, 2026. Sources and scientific choices detailed in
[the initial search](ressources-mars-global.md).

## Files and preparation

`apps/web/public/atlas/manifest.json` is the independent atlas manifest.
It retains the URLs actually acquired, dates, SHA-256 fingerprints of
responses and derived files, dimensions, extents and transformations.
It does not modify the capabilities of the Jezero Manifesto mission sector.

From the Python environment of `tools/data` (Pillow, already declared):

```sh
python tools/data/prepare_atlas.py
```

The ASU server presented an incomplete TLS chain upon acquisition. A
one-time exception was used for this single public TES download,
explicitly recorded by `tlsVerified: false` in the manifest. For
reproduce this acquisition in the same environment:

```sh
python tools/data/prepare_atlas.py --allow-insecure-tes
```

This option does not concern HRSC or geological polygons. No access
network is not necessary to build or use the installed atlas.
The preparer's assertions check dimensions, native repository and
full pagination. `pnpm test` also checks the fingerprints of frozen files.

## Transformations and scope

- **HRSC**: equirectangular JPEG preview provided by the ESA/DLR/FU Berlin team,
1280 × 640, without color editing. The original GeoTIFF is approximately
683 MB: only its first 65,536 bytes were acquired with HTTP Range
to read dimensions, pitch and geographic anchoring. The imprint of this
answer concerns this fragment, not the full GeoTIFF. Source ray
3,396,000 m, equirectangular projection centered at 0°; right-of-way converted into
degrees from metadata. Sampling delivered: 16,671.875 m/pixel at
the equator. Margins slightly overflowing ±180°/±90° come from the raster
original; the view retains the usual Martian boundaries.
- **Geology**: USGS SIM 3292, Tanaka et al. (2014), 1:20,000,000. Distribution
accessible by Esri StoryMaps (`dasbury_storymaps`), not download
direct USGS (403 in this environment). All 1,311 objects were
recovered in two pages, with units, original descriptions, geometries
and distribution palette. Native Repository WKID 104971, Mars 2000
spherical in degrees; no terrestrial conversion. Server simplification
to 0.08°, rounding coordinates to four decimal places. These borders
generalized are used for regional reading; colors do not code
a security score. The description of the selected unit is the legend
to the point read. No automatic translation or reinterpretation of ages.
- **TES**: PNG WMS ASU at 2880 × 1440, longitude −180° to +180°, latitude
planetocentric. Crop lines 240 to 1200 to strictly limit
display at ±60°; no extrapolation to the poles. Image preserved in RGBA,
without palette transformation or smoothing. Qualitative legend conforms to
the ASU reference image: weak violet, strong white. No numerical value
is not reconstructed from the colors. Credit NASA MGS/TES, ASU,
Christensen et al. (2001).
- **March24**: pure TypeScript calculations in `mission-core`, controlled with the
two examples published by NASA GISS (2000 and Spirit landing 2004).
Longitudes is positive; LMST/LTST and `Ls` cyclic results. Table
TAI−UTC applicable from 2000 to 2026, including changes from 2006, 2009, 2012,
2015 and 2017. No additional seconds at the end of 2026 according to
[USNO/IERS Bulletin C](https://maia.usno.navy.mil/products/leap-second).
Out of range: unavailable, no silent extension of the table.
- **MCD**: links to official LMD documentation and interface. The basis
complete requires registration; no scenario or NetCDF file acquired,
No live weather or climate values ​​displayed in the app.

## Validation

Testing of NASA examples, temporal and longitude limits, integrity of
files, OpenLayers reading of polygons in their Mars repository, coordinates
and attributes, activation of layers, geological reading in the center on the keyboard and
subscription cleaning. The production build includes the atlas in the precache
version of the PWA. Display and interactions on browser and hardware
actual figures remain to be validated; component testing does not establish this recipe.
