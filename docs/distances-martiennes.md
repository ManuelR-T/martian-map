# Mission distances

`mission-core` provides `groundDistanceMetres`, `polylineDistances` and
`missionDistances`, without map dependency. The coordinates are
planetocentric in degrees, positive longitude towards the east, within the limits
[-180, 180] and [-90, 90].

The default radius is **3,396,190 m**, the equatorial radius used by the
spherical reference frame of the Jezero map and the relief grids of the manifest.
This is not the average radius of Mars. An explicit radius in meters can be
provided to functions for another spherical reference frame.

Haversine's formula measures the small arc of a great circle between each pair
of consecutive summits, including at the antimeridian. Each segment remains present,
even of zero length. `polylineDistances` does not close the polyline.
`missionDistances` uses mission geometry: camp, steps in order,
then camp. The exploration includes all segments until the last step;
the return is the last direct segment towards the camp. Total includes return
only once. Without a camp or without a stage, the result is `null`.

Each segment and aggregate distance exposes `metres` and `kilometres` (without
rounded), to avoid implicit conversions in the UI and feed the
mission budget. Relief and emergency return use the same calculation.

This is an **estimated horizontal distance**, without altitude correction,
obstacles or practicability. No 3D calculation is added: it would require
a complete profile, a compatible vertical datum and a suitable resolution.

Earth defaults are never used. Documentation
[OpenLayers — ol/sphere](https://openlayers.org/en/latest/apidoc/module-ol_sphere.html)
specifies that its functions take the terrestrial radius by default; the engine
here implements its own calculation with the explicit Martian radius.
