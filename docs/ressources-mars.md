# Mars resources for a prototype in 48 hours

Verified: November 14, 2026. Primary sources only. No `AGENTS.md`/`CLAUDE.md` found in checkout nor `AGENTS.md` in its parents; Initial README: `# martian-map`. This note focuses on the data, without interpreting the challenge brief.

**Recommended choice for this team of SWE students: a 2D map of a small area, three scientific sheets and a route with a time budget for outward journey, observations and return.** Trek + nomenclature constitute the technical base best verified here; official names do not replace the selection of local scientific targets. Prepare local files for the demo; keep CTX/HiRISE as targeted enrichments. SWIM is a complementary resource, to be used only if the region and scientific objective are appropriate.

## Six priority resources

### 1. NASA Mars Trek — immediately usable cartographic background

[Portal](https://trek.nasa.gov/mars/) · [WMTS Documentation](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars) · [Colorized MOLA Capabilities](https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml) · [JPEG tile tested](https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/0/0/0.jpg).

- **Format/use:** WMTS REST, JPEG images for this layer; colorized relief background derived from MOLA at 463 m/pixel. Responsive URL: `…/default/default028mm/{z}/{y}/{x}.jpg`.
- **Access tested:** GET the XML and the tile → HTTP 200; valid JPEG signature; `Access-Control-Allow-Origin: *` on both answers with `Origin: http://localhost:5173`. No key required for these requests.
- **Limits:** world grid of 2 × 1 tiles at level 0, origin −180°, +90°; this is not the usual Web Mercator grid. Explicitly configure projection and matrix from XML. This JPEG provides a representation, not digital elevations. The portal responds in HTML, but its full interactive operation has not been tested.

### 2. MOLA / USGS — numerical elevations and regional relief

[USGS](https://astrogeology.usgs.gov/search/map/mars_mgs_mola_dem_463m) file · [Direct GeoTIFF announced](https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif).

- **Format/use:** Worldwide DEM GeoTIFF, approximately 2 GB depending on the file; 128 pixels/degree, or 463 m/pixel at the equator. Preprocess a small region into simplified elevations and shading with a GIS tool; serve only these derivatives in the application.
- **Scientific limits:** altitude referenced to the areoid; announced total vertical uncertainty of at least ±3 m. Interpolation between traces, with gaps reaching 12 km at the equator; sparse fleece blanket. A slope calculated here describes the regional relief and does not validate the practicability of a route.
- **Access:** the partial GET of GeoTIFF returned **403 from this environment**. The sheet documents the product, but the download is not validated. Do not make the MVP dependent on this file: fall back on the Trek background, without invented altitude value.

### 3. SWIM — buried ice indices, with depth and uncertainty

[PSI project and products](https://swim.psi.edu/) · [Authors' article, 2025](https://doi.org/10.3847/PSJ/ad9b24) · [Initial publication and formats](https://www.nature.com/articles/s41550-020-01290-z) · [NASA/JPL map and legend](https://www.jpl.nasa.gov/images/pia26045-swim-map-shows-subsurface-water-ice-on-mars/) · [Presentation JPEG](https://d2pn8kiwq2w21t.cloudfront.net/original_images/PIA26045.jpg).

- **Format/use:** GIS GeoTIFF products and consultation images documented by the authors. Paper 2025 describes maps at 20 pixels/degree, approximately 3 km/pixel at the equator, for intervals 0–1 m, 1–5 m, and >5 m. Use an identified version to explain the evidence favorable to ice on a region sheet.
- **Limits:** the consistency index with the presence of ice is neither a calibrated probability, nor a quantity of extractable water, nor an exact depth. The sources and areas covered differ; maps hide altitudes ≥1 km. Do not confuse absence of data with absence of ice.
- **Access:** PSI returns 403 via direct request and fails via web read; no GeoTIFF SWIM downloaded. The JPL page and its JPEG are accessible via the web tool. Its link to `ammos.nasa.gov/marswatermaps/` returns 404. **Foldback 48 hours:** illustrated and sourced sheet; the communication JPEG is not validated as a georeferenced raster, therefore no automatic quantitative superposition.

### 4. CTX / Murray Lab — visual context at 5 m/pixel

[Caltech source and documentation](https://murray-lab.caltech.edu/CTX/) · [Tile Directory V01](https://murray-lab.caltech.edu/CTX/V01/tiles/) · [Formats described by the USGS](https://astrogeology.usgs.gov/search/map/mars-mro-ctx-global-mosaic-murray-lab-v1).

- **Format/use:** V01 mosaic in GeoTIFF in ZIP archives in 4° × 4° sectors, with connection information. Sampling at 5 m/pixel, 99.5% coverage between 88°S and 88°N. Choose a single sector to illustrate craters, dunes or valleys.
- **Limits:** images from different dates; possible connections and holes. Caltech announces absolute position errors less than 200 m: 5 m/pixel does not mean localization at 5 m. No digital relief deduced directly from luminance.
- **Access:** primary documentation found in the web index; Caltech direct HTTPS access failing certificate validation in this environment. Untested archive and streaming service; no promises of API, CORS or immediate integration. Requested credit: NASA/JPL/MSSS/The Murray Lab.

### 5. HiRISE — one or two detailed observations

[Team catalog](https://www.uahirise.org/catalog/) · [Observation example ESP_018747_2065](https://www.uahirise.org/ESP_018747_2065) · [Direct JPEG tested](https://hirise-pds.lpl.arizona.edu/PDS/EXTRAS/RDR/ESP/ORB_018700_018799/ESP_018747_2065/ESP_018747_2065_RED.browse.jpg).

- **Format/use:** JPEG for consultation; Scientific JPEG2000 and PDS labels accessible from the file. For this example: original image at 30.6 cm/pixel, reprojected at 25 cm/pixel; resolved objects of approximately 92 cm according to the team. Use a local vignette and a link to the observation, chosen in the project region.
- **Limits:** coverage by targeted observations; Reduced JPEG does not retain scientific resolution. Read scale, date and projection of each product. The image alone does not provide a slope measurement.
- **Access tested:** file and JPEG HTTP 200; Verified 2.35 MB JPEG. The server returns `Access-Control-Allow-Origin: https://pds-imaging.jpl.nasa.gov`, not the local origin: do not count on a `fetch` or a canvas read from our application. Download in advance and serve locally. JP2 not downloaded.

### 6. IAU / USGS nomenclature — search and clickable locations

[Catalogue and conventions](https://planetarynames.wr.usgs.gov/GIS_Downloads) · [Shapefile ZIP Mars](https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/MARS_nomenclature_center_pts.zip) · [KMZ Mars](https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/MARS_nomenclature_center_pts.kmz).

- **Format/use:** central points of the named formations; archives generated every night. Convert a selection into small local JSON for search, markers and records; retain username, official name and contact details.
- **Access tested:** full HTTP 200 download; 5.42 MB ZIP containing `.shp/.shx/.dbf/.prj`, 2.62 MB KMZ containing KML and metadata. No CORS header received for local origin: out-of-browser preparation recommended.
- **Limits:** central positions, no contours or safe landing places. The page specifies eastern longitude and planetocentric latitude; check the projection files and harmonize 0–360° / −180–180° with the other layers.

## Minimum strategy 48 hours — implementation proposal

1. **H0–H4:** fix a small sector, check the superposition of a known location and the Trek background. Prepare a local emergency fund and three sourced scientific targets. If setting up the tiles takes too long, use a local equirectangular image with markers.
2. **H4–H16:** 2D map, selection of stages, sheets with source, scale, date and limits. A click must explain what the data really supports.
3. **H16–H28:** prepared or drawn route, distances and time budget including observations and return. Show adjustable speed and duration assumptions; use a projection and distances adapted to Mars. Integrate CTX or a digital DEM only if an extract has actually been retrieved and verified.
4. **H28–H40:** connect the steps to a scientific question and add some contextualized ground or orbital images. Demonstrate how adding a step changes the return margin. A possible path calculation according to the slope remains conditional on a usable local DEM. Avoid an opaque “survival” score or safe ride guarantee.
5. **H40–H48:** test local files, coordinates, “unknown” states and links; prepare a short demo. Do not spend the sprint on a global CTX mosaic, client-side JP2 decoding, or global 3D.

**Scope of checks:** HTTP requests and format/header inspection, without browser session. The CORS headers observed are a concrete indication for the URLs tested, not a validation of the application or other layers. The errors reported are those of this environment; they do not demonstrate universal unavailability.
