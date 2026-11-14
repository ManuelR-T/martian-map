import pytest

from marps_data import geo

SKINNER = (77.40617493, 18.45893136)
AMALIK = (77.40144029, 18.45072631)
# Geotransform of the CTX DEM, from data/research/marswalk-data-verification.json.
DEM_ORIGIN = (4573663.250853, 1109693.140188)
DEM_SHAPE = (1512, 1596)
RADIUS = 3_396_190.0


def point(lon_lat):
    lon, lat = lon_lat
    return {"west": lon, "east": lon, "south": lat, "north": lat}


def test_tile_range_matches_the_tiles_verified_for_the_stops():
    assert geo.tile_range(point(SKINNER), 12) == (5857, 5857, 1627, 1627)
    assert geo.tile_range(point(AMALIK), 12) == (5857, 5857, 1628, 1628)


def test_tile_extent_contains_the_point_it_was_derived_from():
    col, _, row, _ = geo.tile_range(point(SKINNER), 16)
    assert geo.contains_point(geo.tile_extent(16, col, row), *SKINNER)


def test_finest_zoom_is_about_sixty_centimetres_per_pixel():
    assert geo.metres_per_pixel(16, RADIUS) == pytest.approx(0.636, abs=0.001)


def test_dem_window_reproduces_the_cells_verified_in_research():
    row0, row1, col0, col1 = geo.dem_window(DEM_ORIGIN, 20.0, DEM_SHAPE, point(SKINNER), RADIUS)
    assert (col0, row0) == (728, 777)
    assert (col1 - col0, row1 - row0) == (1, 1)


def test_dem_window_extent_covers_the_requested_extent():
    wanted = {"west": 77.395, "south": 18.445, "east": 77.412, "north": 18.465}
    window = geo.dem_window(DEM_ORIGIN, 20.0, DEM_SHAPE, wanted, RADIUS)
    assert geo.contains(geo.window_extent(DEM_ORIGIN, 20.0, window, RADIUS), wanted)


def test_dem_window_rejects_an_extent_outside_the_raster():
    with pytest.raises(ValueError):
        geo.dem_window(DEM_ORIGIN, 20.0, DEM_SHAPE, {"west": 10, "east": 11, "south": 0, "north": 1}, RADIUS)


@pytest.mark.parametrize(
    "extent",
    [
        {"west": 5, "east": 5, "south": 0, "north": 1},
        {"west": 0, "east": 1, "south": 0, "north": 91},
        {"west": -181, "east": 0, "south": 0, "north": 1},
        {"west": 0, "east": 1, "south": 0},
    ],
)
def test_extent_error_rejects_invalid_boxes(extent):
    assert geo.extent_error(extent) is not None


def test_cell_at_agrees_with_the_window_of_the_same_point():
    row0, _, col0, _ = geo.dem_window(DEM_ORIGIN, 20.0, DEM_SHAPE, point(SKINNER), RADIUS)
    assert geo.cell_at(DEM_ORIGIN, 20.0, DEM_SHAPE, *SKINNER, RADIUS) == (row0, col0)


def test_cell_at_is_none_outside_the_grid():
    assert geo.cell_at(DEM_ORIGIN, 20.0, DEM_SHAPE, 10.0, 0.0, RADIUS) is None
