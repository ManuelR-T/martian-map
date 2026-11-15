# Whole Mars: five additional resources for Marps

Documentary research verified on **November 15, 2026**, after reading
`README.md`. This selection completes the resources already in the manifest
without taking them over. It aims for scientific exploration
worldwide, while detailed preparation remains limited to Jezero.

**Scope:** primary pages and documentation accessed by the web tool; none
raster, GIS package or model downloaded, no calculations performed, no CORS tests,
HTTP Range, browser or OpenLayers implemented. A readable page does not validate the
direct distribution of its data in the application. The proposed adaptations
Below are product recommendations, not validated integrations.

## 1. HRSC / Mars Express: global color background — priority 1

Sources: [products and formats from the DLR](https://hrscteam.dlr.de/public/data/globalcolor.php) team,
[permanent deposit of the authors](https://doi.org/10.17169/refubium-40624),
[ESA presentation of construction](https://www.esa.int/ESA_Multimedia/Images/2023/05/Building_a_mosaic_of_Mars).

- **Product contribution:** propose a surface color background next to the MOLA relief;
make visible the major regional differences without confusing them with
altitude differences.
- **Documented formats and coverage:** GIS-ready GeoTIFF at **2 km/pixel**;
equirectangular world view, orthographic faces, RGB composite and channels
separated nadir, red, green, blue and infrared. Credit: ESA/DLR/FU Berlin.
- **Limitations:** assembly of high altitude observations, not a photograph
simultaneous nor a mineralogical map. The color does not measure slope or
composition directly. Maintain the colorimetric processing and
conditions of reuse of the selected product.
- **Preparation envisaged:** starting from the equirectangular composite, check its
georeferencing then produce tiles and a small offline view. None
WMTS endpoint nor browser access is validated here.

## 2. USGS: global geological map SIM 3292 (2014) — priority 1

Sources: [publication and distributions USGS](https://pubs.usgs.gov/sim/3292/),
[official map in PDF](https://pubs.usgs.gov/sim/3292/pdf/sim3292_map.pdf),
[authors' note on file at the Smithsonian](https://repository.si.edu/server/api/core/bitstreams/0938639a-7242-4930-8b3b-5c28683e6921/content),
[map held at the Smithsonian](https://repository.si.edu/server/api/core/bitstreams/9f9936a8-bb2a-4a21-b00b-6977fe03ed4c/content).

- **Product contribution:** at the click, explain geological unit, period and
interpretation; compare volcanic terrains, highlands and deposits.
- **Formats and coverage:** global PDF map at **1:20,000,000** and GIS base
described in the instructions. Plan a conversion of units to simplified GeoJSON
and a legend table; the exact structure of the GIS package remains to be inspected.
- **Limits:** significant cartographic generalization; the contacts are not
no precise boundaries on the scale of an output. The ages are based on
stratigraphy and crater counts, not on a dating of each point.
- **Verified access:** USGS distribution page returns **403 in tool**;
Author documentation found at the scientific co-publisher Smithsonian.
The existence of the card is verified; retrieval of the SIG package is not
not. Do not overlay the Robinson PDF as an equirectangular image.

## 3. Mars Climate Database LMD: global climate context — priority 2

Sources: [currently announced interface v6.2](https://www-mars.lmd.jussieu.fr/mcd_python/),
[scientific description](https://www-mars.lmd.jussieu.fr/mars/info_web/index.html),
[access to the complete database](https://www-mars.lmd.jussieu.fr/mars/access).

- **Product contribution:** compare pressure, temperature and wind modeled according to
region, season (`Ls`) and local time; complete historical MEDA measurements
of Jezero with an explicitly separate climatology.
- **Formats and coverage:** global atmospheric model; complete basis in
**NetCDF**, Fortran access software and examples of interfaces including Python.
Free full download after registration; web interface intended for
moderate use.
- **Limits:** fields from GCM simulations compared to observations,
no live weather forecast or forecast of an outing. Interpolation on the
topography does not resolve gusts and local effects. The interface displays
v6.2, but the documentation page still refers to the v6.1 manuals: freeze and
document the version actually acquired.
- **Preparation planned:** extract some scenarios offline in JSON
(units, altitude, season, time, dust scenario, version). Do not treat
the web form as a stable public API.

## 4. NASA GISS Mars24: solar time and season everywhere — priority 1

Sources: [control equations and examples, update 2025](https://www.giss.nasa.gov/tools/mars24/help/algorithm.html),
[temporal conventions and mission particularities](https://www.giss.nasa.gov/tools/mars24/help/notes.html).

- **Product contribution:** display mean/true local solar time and longitude
solar `Ls` for any selected point; give a common temporal context
regional sheets and MCD scenarios.
- **Format and cover:** HTML documentation of numerical algorithms, valid
for Martian longitudes; no raster or remote service required.
Recommendation: pure TypeScript implementation, compared to NASA examples.
- **Limits:** distinguish between UTC, astronomical time scales, LMST and LTST;
maintain leap seconds. Conventional hours of rovers
may differ from local solar time. These equations do not provide
shadows of the relief nor local visibility of the horizon. No numerical results
was not validated during this research.

## 5. MGS / TES: regional thermal inertia — priority 2

Sources: [products of the TES/ASU](https://tes.mars.asu.edu/products/) team,
[ASU file and downloads Christensen](https://www.mars.asu.edu/data/tes_ti/),
[PDS archive Putzig–Mellon and masks](https://pds-geosciences.wustl.edu/missions/mgs/tes-timap.html).

- **Product contribution:** compare the thermophysical properties of large
regions; add a separate scientific layer to an infrared image.
- **Formats and coverage:** Christensen: **8 pixels/degree**, approximately 7.5 km
at the equator, values ​​between **60°S and 60°N**, digital VICAR and colorized PNG.
The PNG global canvas does not mean that the poles are measured.
ASU also describes Putzig 2005 at 20 pixels/degree, between 80°S and 80°N, in binary
and JPEG. The Putzig–Mellon PDS archive provides detached labels and masks of
interpolated pixels: do not mix these versions.
- **Limits:** inertia derived from historical orbital observations and a
thermal model; neither current temperature nor unambiguous particle size.
For a value per click, read the numerical data, units and masks,
never the color of the PNG. No extrapolation to absent areas.

## Recommended order and criteria before integration

Start with **HRSC + geology + Mars24**: visual orientation, explanation
scientific and global temporal context. Then add **TES**, then **MCD**,
which requires more choice of scenarios and preparation.

For each future acquisition: freeze version, credit, rights, units,
fingerprint, footprint and validity mask; check planetocentric latitude,
sense of longitudes, cut at 180° and projection against the Mars reference frame of
README. Prepare lightweight static derivatives and keep “no data” out
blanket. Separately test downloading, georeferencing and possible access
CORS/Range before any promise of remote access. None of these resources
is enough to activate detailed planning outside Jezero.
