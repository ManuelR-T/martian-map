"""Grid arithmetic shared by prepare and check. Degrees are planetocentric, east-positive."""

import math

TILE_SIZE = 256

Extent = dict[str, float]  # keys: west, south, east, north


def tile_span_degrees(zoom: int) -> float:
    """Size of one tile edge. The Trek grid is 2x1 tiles at zoom 0, origin -180/+90."""
    return 180.0 / 2**zoom


def tile_range(extent: Extent, zoom: int) -> tuple[int, int, int, int]:
    """Inclusive (col_min, col_max, row_min, row_max) of the tiles covering extent."""
    span = tile_span_degrees(zoom)
    col_min = math.floor((extent["west"] + 180.0) / span)
    col_max = math.ceil((extent["east"] + 180.0) / span) - 1
    row_min = math.floor((90.0 - extent["north"]) / span)
    row_max = math.ceil((90.0 - extent["south"]) / span) - 1
    return col_min, col_max, row_min, row_max


def tile_extent(zoom: int, col: int, row: int) -> Extent:
    span = tile_span_degrees(zoom)
    return {
        "west": col * span - 180.0,
        "east": (col + 1) * span - 180.0,
        "north": 90.0 - row * span,
        "south": 90.0 - (row + 1) * span,
    }


def metres_per_pixel(zoom: int, radius_m: float) -> float:
    return tile_span_degrees(zoom) / TILE_SIZE * math.radians(1.0) * radius_m


def union(a: Extent, b: Extent) -> Extent:
    return {
        "west": min(a["west"], b["west"]),
        "south": min(a["south"], b["south"]),
        "east": max(a["east"], b["east"]),
        "north": max(a["north"], b["north"]),
    }


def contains(outer: Extent, inner: Extent, tolerance: float = 1e-9) -> bool:
    return (
        outer["west"] <= inner["west"] + tolerance
        and outer["south"] <= inner["south"] + tolerance
        and outer["east"] >= inner["east"] - tolerance
        and outer["north"] >= inner["north"] - tolerance
    )


def contains_point(extent: Extent, longitude: float, latitude: float) -> bool:
    return contains(extent, {"west": longitude, "east": longitude, "south": latitude, "north": latitude})


def extent_error(extent: Extent) -> str | None:
    """Reason why extent is not a valid lon/lat box, or None."""
    if not all(math.isfinite(extent.get(k, math.nan)) for k in ("west", "south", "east", "north")):
        return "missing or non-finite bound"
    if not (-180.0 <= extent["west"] < extent["east"] <= 180.0):
        return "longitude bounds must satisfy -180 <= west < east <= 180"
    if not (-90.0 <= extent["south"] < extent["north"] <= 90.0):
        return "latitude bounds must satisfy -90 <= south < north <= 90"
    return None


def dem_window(
    origin_xy: tuple[float, float],
    pixel_m: float,
    shape: tuple[int, int],
    extent: Extent,
    radius_m: float,
) -> tuple[int, int, int, int]:
    """Smallest pixel window (row0, row1, col0, col1; end exclusive) covering extent.

    Equirectangular grid with standard parallel 0 and central meridian 0, so
    x = R * lon and y = R * lat in radians. origin_xy is the upper-left pixel corner.
    """
    x0, y0 = origin_xy
    to_x = lambda lon: radius_m * math.radians(lon)  # noqa: E731
    to_y = lambda lat: radius_m * math.radians(lat)  # noqa: E731
    col0 = math.floor((to_x(extent["west"]) - x0) / pixel_m)
    col1 = math.ceil((to_x(extent["east"]) - x0) / pixel_m)
    row0 = math.floor((y0 - to_y(extent["north"])) / pixel_m)
    row1 = math.ceil((y0 - to_y(extent["south"])) / pixel_m)
    rows, cols = shape
    if col0 < 0 or row0 < 0 or col1 > cols or row1 > rows:
        raise ValueError("extent is not fully inside the raster")
    return row0, row1, col0, col1


def window_extent(
    origin_xy: tuple[float, float],
    pixel_m: float,
    window: tuple[int, int, int, int],
    radius_m: float,
) -> Extent:
    x0, y0 = origin_xy
    row0, row1, col0, col1 = window
    to_deg = lambda metres: math.degrees(metres / radius_m)  # noqa: E731
    return {
        "west": to_deg(x0 + col0 * pixel_m),
        "east": to_deg(x0 + col1 * pixel_m),
        "north": to_deg(y0 - row0 * pixel_m),
        "south": to_deg(y0 - row1 * pixel_m),
    }


def project(longitude: float, latitude: float, radius_m: float) -> tuple[float, float]:
    """Equirectangular metres with standard parallel 0 and central meridian 0."""
    return radius_m * math.radians(longitude), radius_m * math.radians(latitude)


def cell_at(
    origin_xy: tuple[float, float],
    pixel_m: float,
    shape: tuple[int, int],
    longitude: float,
    latitude: float,
    radius_m: float,
) -> tuple[int, int] | None:
    """(row, col) of the cell containing the point, or None outside the grid.

    origin_xy is the north-west corner of the grid; rows grow southwards.
    """
    x, y = project(longitude, latitude, radius_m)
    col = math.floor((x - origin_xy[0]) / pixel_m)
    row = math.floor((origin_xy[1] - y) / pixel_m)
    rows, cols = shape
    return (row, col) if 0 <= row < rows and 0 <= col < cols else None
