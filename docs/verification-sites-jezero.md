# Verification of the sites and the course of Perseverance

Verification from November 14, 2026, by public downloads without account or key and JSON decoding. **Yes: coordinates, rover track and three nearby scientific sites are recoverable.** This is enough for the Marps demonstration; this data does not validate any human route. Imaging and DEM remain outside of this verification.

## Access actually inspected

The [requested NASA page](https://science.nasa.gov/mission/mars-2020-perseverance/location-map/) responds HTTP 200, `text/html`. Its iframe points to <https://mars.nasa.gov/map/>, which redirects to <https://mars.nasa.gov/maps/location/?mission=M20&site=NOW> (200, HTML).

The [JavaScript of application](https://mars.nasa.gov/build/static/js/main.8434bd16.chunk.js) responds 200, `application/javascript`. It reveals the endpoint [configuration M20](https://mars.nasa.gov/maps/location/api/configure/get?mission=M20): 200, `application/json; charset=utf-8`, 7640 bytes. The URLs below are for its layers, not guessed paths.

| Layer and exact URL | GET response and decoded content |
| --- | --- |
| [Rover Waypoints](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json) | 200, `application/json`, 603,126 bytes; GeoJSON `FeatureCollection`, 708 `Point`, floors 13 to 2022 |
| [Rover Drive Path](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json) | 200, `application/json`, 1,723,218 bytes; 559 `LineString` |
| [Sampling Locations](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_SAMPLE_v3.json) | 200, `application/json`, 11,389 bytes; 22 `Point`, including the three sites below |
| [Sample Depot Zone](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_TF_Sample_Depot.json) | 200, `application/json`, 1453 bytes; a `Polygon`, not a named one-off stop |

The positions include `sol`, `RMC`, `site`, `drive`, `lon`, `lat`, `elev_geoid`, `dist_total_m` and sometimes `images`. The segments bear `sol`, `fromRMC`, `toRMC`, `length` and their vertices. The samples directly associate `outcrop_name`, `sample_name`, `sample_location`, `rock_type` and coordinates: no geolocation from a photograph is necessary.

An additional GET of samples with `Origin: http://localhost:3000` returns 200 and `Access-Control-Allow-Origin: *` (without Origin, this header was missing). CORS checked only on this resource; no application browser tested. For the hackathon, serving a fixed local copy reduces dependency on the remote service.

## Three sourced scientific judgments

Coordinates copied from `M20_SAMPLE_v3.json`, in the order **longitude, latitude**, in degrees on Mars. These are the sampling points published by the map, not calculated outcrop centers or human positions.

| Site | Longitude | Latitude | Scientific description and source |
| --- | --- | --- | --- |
| Skinner Ridge | 77.40617493 | 18.45893136 | Stratified sedimentary rocks of the delta, studied after abrasion; Swift Run and Skyland samples. [JPL, 09/15/2022](https://www.jpl.nasa.gov/news/nasas-perseverance-rover-investigates-geologically-rich-mars-terrain/) and [NASA catalog](https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/). |
| Wildcat Ridge | 77.40588851 | 18.45863707 | Rock interpreted as a deposit of mud and fine sand in a lake environment. JPL reports organic signals spatially associated with sulfates; this does not demonstrate a biological origin. Hazeltop and Bearwallow samples. [JPL, 09/15/2022](https://www.jpl.nasa.gov/news/nasas-perseverance-rover-investigates-geologically-rich-mars-terrain/). |
| Amalik | 77.40144029 | 18.45072631 | Fine sedimentary rock containing clays, interesting for its potential for preserving biosignatures; Shuyak and Mageik samples. [JPL, transcript dated 02/08/2023](https://www.jpl.nasa.gov/videos/meet-the-mars-samples-shuyak-and-mageik-samples-14-and-15/). |

The three points fit within a diameter of approximately **555 m**, calculated here by haversine from their coordinates with the radius of 3,396,190 m provided by the NASA configuration. It's a geometric proximity, not a passable path length.

## Small sample kept

In `data/research/`, three snippets totaling 5,572 bytes:

- [perseverance-sites-extra.json](../data/research/perseverance-sites-extrait.json): the three objects of which `outcrop_name` is worth Skinner Ridge, Wildcat Ridge or Amalik, extracted from `M20_SAMPLE_v3.json`.
- [perseverance-waypoints-extract.json](../data/research/perseverance-waypoints-extrait.json): three positions `RMC` 26_1004, 26_1154 and 26_1222, extracted from `M20_waypoints.json`.
- [perseverance-traverse-extrapt.json](../data/research/perseverance-traverse-extrait.json): segment of ground 501, from 26_1004 to 26_1154, with its 20 vertices, extracted from `M20_traverse.json`.

`Feature` objects are copied verbatim from the uploaded responses, without rewriting their fields or numbers. Only the `features` list is reduced; other collection metadata is preserved. JSON decoding and equality with verified source objects. The segment provided is not a route connecting the three sites; rover positions are distinct from sampling points.

Minimal reproduction of access, without authentication:

```sh
curl --fail --location -H 'Origin: http://localhost:3000' \
  'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_SAMPLE_v3.json'
```

## Limitations and remaining work for the MVP

- **Reference:** the route declares `urn:ogc:def:crs:OGC:1.3:CRS84`, but the configuration uses a Martian radius. Do not apply default land distances from a map library. The third position coordinate corresponds to `elev_geoid`; the vertical datum of the samples is not documented in their file. Align with the DEM before calculating relief and slopes.
- **Curation:** the three name/contact details associations are explicit. What remains is the writing of the files, the observation durations chosen by the team and the connection of the stops to the route graph. Do not automatically merge a sample with the closest waypoint. The `images` links of the waypoints are kept raw, without access testing or association with these three sites.
- **Metadata:** certain values ​​require a check before extension to the entire catalog: Turquoise Bay and Hans Amundsen Memorial Workspace have the same `lon/lat` despite different `easting/northing`; Gallants has a date and soil `TBD`. Do not silently patch the raw file. Also distinguish between collection and sealing: for Mageik, the JSON gives sol 579 while the NASA catalog explicitly indicates “Sol Sealed: 619”.
- **Features this data supports:** departure/stop selection, display of the historical trace, sourced scientific files, estimation of duration and return margin under explicit assumptions of speed and stopping time. The inspected data does not provide a validated pedestrian network, human speed, scientific duration, or guarantee of safe return. The relief depends on the DEM verification of the parent.

JPL scientific sources read via the web tool; Direct Python/curl tests on these two JPL pages fail locally on the TLS certificate check (`self signed certificate in certificate chain`), without disabling this check. The NASA catalog was also downloaded directly (200, HTML). The above NASA JSON downloads were successful with TLS verification active. No completeness or sustainability of endpoints is guaranteed by this spot check. No commits made.
