# Jezero relief: altitudes, slopes and shaded relief

Verification and preparation of November 14, 2026 (issue #10). The relief of the sector
from Jezero comes from **DEM HiRISE at 1 m, aggregated at 4 m**; the **DEM CTX at 20 m** remains
frozen next to it as a fallback game. Both serve the altitude profile and the
slope alerts. Neither is navigational data.

## What was checked

### DEM HiRISE: usable

[USGS](https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_hirise_dtm_mosaic) sheet ·
[GeoTIFF](https://planetarymaps.usgs.gov/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif)

- **Product.** Mosaic “Mars 2020 Terrain Relative Navigation HiRISE DTM”, version
`soc_006`, from the same series as the already frozen HiRISE imagery. It's not DTM
isolated `PSP_002387_1985` from the University of Arizona cited in the issue: this one
(320 MB, 1 m/pixel, center 18.49°N 77.41°E) is accessible but has not been
downloaded, the USGS mosaic already being registered on the DEM CTX.
- **Access.** HTTP 200 after redirection to USGS storage, without account or key.
`Range` requests are served (HTTP 206).
- **Weight.** 1,839,545,409 bytes: 21,400 columns × 21,488 rows, float32 no
compressed, one line per tape. The file is never downloaded in full.
- **Right of way.** 77.2229–77.5840°E and 18.3068–18.6693°N. It contains the sector.
- **Processing.** The header (262,144 bytes) gives the position of each line; a
single query reads lines 12,104 to 13,303, or 102,720,000 bytes, in 17 s
approximately during the check. The block is cached and its SHA-256 is pinned in
`tools/data/marps_data/spec.py`.
- **Gaps.** None: the 1200 × 1020 pixels read for the sector are finite and
none have the declared NoData value (`-3.4028226550889045e+38`).
- **Projection.** Same as DEM CTX: equirectangular, sphere of radius
3,396,190 m, central meridian and standard parallel at 0°, pixel = area.

### DEM CTX 20 m: fallback retained

The already verified GeoTIFF (9,662,387 bytes, 1,596 × 1,512, float32) is split as
Before. Its 51 × 60 mesh grid remained identical to the nearest byte after the
overhaul of the preparation.

## Projection and transformation

Both products use x = R·λ and y = R·φ (radians, R = 3,396,190 m). The mesh
(row, column) covers x starting from `origin.x + colonne × pas` and y going down
from `origin.y − ligne × pas`. The manifest carries this transformation in
`raster`: `origin`, `pixelSizeMetres`, `projection`, `width`, `height`.

| Grid | Meshes (columns × rows) | Not | Origin x, y (m) |
| --- | --- | --- | --- |
| HiRISE | 253 × 298 | 4m | 4,587,562.0; 1,094,510.0 |
| CTX | 51 × 60 | 20m | 4,587,563.250853; 1,094,513.140188 |

**Pitch is not a distance from the ground in both directions.** With a parallel
standard at 0°, a mesh measures its pitch from north to south, but only
step × cos(latitude) from east to west: 18.97 m instead of 20 m at Jezero (18.45°N).
The slopes take into account this difference of approximately 5%.

## Vertical data

The name of both files indicates `MOLAtopography_DeltaGeoid`: altitudes of type
MOLA topography, above the areoid. The USGS sheets do not give any other
definition ; the manifest says so in `verticalDatum`. Fergason et al. (2020)
indicate that the CTX mosaic was offset 183.3 m vertically to align
on HRSC, then the HiRISE mosaic has been aligned with the CTX mosaic.

## Correspondence between sites and meshes

The three stops fall on a valid mesh of the two grids. `pnpm data:check`
the control, and the tests of `@marps/data` reread the same files.

| Stop | HiRISE altitude 4 m | Altitude CTX 20 m | Sampling altitude (NASA) | HiRISE Slope | Slope CTX |
| --- | --- | --- | --- | --- | --- |
| Skinner Ridge | −2,520.37 m | −2,516.72 m | −2,520.19 m | 20.1° | 8.3° |
| Wildcat Ridge | −2,522.96 m | −2,519.85 m | −2,523.10 m | 8.3° | 10.3° |
| Amalik | −2,526.59 m | −2,526.77 m | −2,526.53 m | 3.9° | 3.4° |

HiRISE altitudes deviate by less than 0.2 m from those published with the
samples from the rover, which come from another source. This is an indicator of good
adjustment on three points, not a validation of the datum: do not mix the two
series in the same profile.

On the sector, the HiRISE grid reduced to 20 m differs from the CTX grid by 0.09 m
in median, with a quadratic deviation of 3.2 m (5ᵉ and 95ᵉ percentiles: −5.8 m and
+4.6 m). Fergason et al. (2020) publish a median difference of around 0.4 m between
two mosaics, a vertical adjustment of 3.8 m between CTX models and an offset
average horizontal of 9.6 m of CTX images.

## Product files

All under `apps/web/public/data/jezero/dem/`, described in the manifest.

| Dataset | File | Content |
| --- | --- | --- |
| `jezero-hirise-dem` | `hirise-4m.f32` (301,576 bytes) | Altitudes in meters |
| `jezero-hirise-slope` | `hirise-4m-slope.f32` | Slopes in degrees |
| `jezero-hirise-hillshade` | `hirise-4m-hillshade.png` | Shaded relief, 253 × 298 |
| `jezero-ctx-dem` | `ctx-20m.f32` (12240 bytes) | Altitudes in meters |
| `jezero-ctx-slope` | `ctx-20m-slope.f32` | Slopes in degrees |
| `jezero-ctx-hillshade` | `ctx-20m-hillshade.png` | Shaded relief, 51 × 60 |

- **HiRISE aggregation.** Average by blocks of 4 × 4 pixels, aligned to the origin of the
source file. At 1 m, each grid would weigh 4.8 MB; at 4 m, 0.3 MB. One block
containing a single pixel without data remains without data.
- **Slope.** Horn method on 3 × 3 meshes: an average slope on a base of
8 m (HiRISE) or 40 m (CTX), not the local slope underfoot. On the sector:
median 4.6°, 95th percentile 20.7° and maximum 60.1° in HiRISE; 4.6°, 16.8° and 27.6°
in CTX. The same escarpment therefore appears half as steep at 20 m.
- **Shaded relief.** Fictitious lighting from the northwest (azimuth 315°, height 45°),
without vertical exaggeration. Grayscale image with transparency, to be stretched
on the extent of the dataset.

### Edges, gaps and scales

- **Edges.** The preparation reads one more stitch on each side of the sector: the
edge stitches have real neighbors. If the window exited the source file, the
missing stitch would remain without data and the slope of the edge too.
- **Gaps.** An altitude without data is `NaN` in the grid and `null` in
`sampleGrid` ; it is never 0. A slope is `NaN` as soon as one of the nine meshes
used missing. The corresponding pixels of the shaded relief are transparent. THE
data set then changes to `partial`.
- **Scales.** Frozen HiRISE imagery goes down to 0.64 m/pixel, relief to 4 m or
20m. The shaded relief does not show the details visible in the image.

## Limits to display

- **Mesh size is a sampling step, not a precision.** None
Absolute uncertainty of position or altitude has not been validated here. Each grid
door `raster.navigationGrade: false`; `data:check` rejects any other value.
- **Sampling error.** A value is the average of a mesh. Between two
neighboring meshes the altitude changes by 0.18 m in median and up to 8.6 m in HiRISE
4m; 0.85 m in median and up to 12.5 m in CTX 20 m. A block, a step or
a crevice smaller than the mesh does not appear.
- **No passability.** A slight slope says nothing about the bearing capacity of the ground,
blocks or sand. A slope threshold is a scenario choice.
- **Reading to the nearest.** `sampleGrid` returns the value of the mesh which contains
the point, without interpolation.

## Use in the application

```ts
import { loadGrid, loadManifest, sampleGrid, terrainDataset } from '@marps/data';

const manifest = await loadManifest();
const dataset = terrainDataset(manifest, 'jezero', 'elevation'); // HiRISE, otherwise CTX
if (dataset) {
  const grid = await loadGrid(dataset);
  const elevation = sampleGrid(grid, { longitude: 77.40617493, latitude: 18.45893136 }); // metres or null
}
```

`terrainDataset` prefers a complete grid to a perforated grid, then the mesh
finer. Use the same grid over an entire layout.

## Reference

Fergason, R. L. et al., 2020, *Mars 2020 Terrain Relative Navigation Flight Product
Generation: Digital Terrain Model and Orthorectified Image Mosaics*, 51st Lunar and
Planetary Science Conference, <https://www.hou.usra.edu/meetings/lpsc2020/pdf/2020.pdf>.
