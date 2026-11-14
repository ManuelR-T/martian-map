import math
from io import BytesIO

import numpy as np
import pytest
from PIL import Image

from marps_data import prepare, terrain

SENTINEL = -3.4028226550889045e38


def plane(rows, cols, east_rise, north_rise, cell_m=10.0):
    """Elevations of a tilted plane, first row at the north edge."""
    row, col = np.mgrid[0:rows, 0:cols]
    return (col * east_rise - row * north_rise) * cell_m


def slope_of(padded, cell_m=10.0):
    east_m = np.full(padded.shape[0] - 2, cell_m)
    return terrain.slope_degrees(*terrain.gradients(padded, east_m, cell_m))


def test_block_mean_averages_each_block_and_keeps_holes():
    values = np.array([[1.0, 3.0, 0.0, 0.0], [5.0, 7.0, 0.0, np.nan]])
    result = terrain.block_mean(values, 2)
    assert result[0, 0] == 4.0
    assert np.isnan(result[0, 1])


def test_block_mean_refuses_a_partial_block():
    with pytest.raises(ValueError):
        terrain.block_mean(np.zeros((3, 4)), 2)


def test_slope_of_a_plane_is_its_angle_in_every_direction():
    assert slope_of(plane(5, 5, 1.0, 0.0)) == pytest.approx(45.0)
    assert slope_of(plane(5, 5, 0.0, -1.0)) == pytest.approx(45.0)
    assert slope_of(plane(5, 5, 0.0, 0.0)) == pytest.approx(0.0)
    assert slope_of(plane(5, 5, 0.3, 0.4)) == pytest.approx(math.degrees(math.atan(0.5)))


def test_east_west_cells_shrink_with_latitude():
    radius = 3_396_190.0
    y_at_60_degrees = radius * math.radians(60.0)
    east_m, north_m = terrain.ground_cell_size(y_at_60_degrees + 10.0, 20.0, 1, radius)
    assert north_m == 20.0
    assert east_m[0] == pytest.approx(10.0, abs=1e-3)


def test_slope_is_unknown_next_to_a_hole_and_never_zero():
    padded = plane(5, 5, 1.0, 0.0)
    padded[2, 2] = np.nan
    result = slope_of(padded)
    assert np.isnan(result).all()  # every 3x3 window of this small grid touches the hole

    lone_centre = plane(3, 3, 0.0, 0.0)
    lone_centre[1, 1] = np.nan
    assert np.isnan(slope_of(lone_centre)).all()


def test_hillshade_lights_slopes_facing_north_west():
    flat = terrain.hillshade(np.zeros((1, 1)), np.zeros((1, 1)))
    facing_light = terrain.hillshade(np.array([[0.5]]), np.array([[-0.5]]))  # falls to the north-west
    facing_away = terrain.hillshade(np.array([[-0.5]]), np.array([[0.5]]))
    assert flat[0, 0] == pytest.approx(math.sin(math.radians(45.0)))
    assert facing_light[0, 0] > flat[0, 0] > facing_away[0, 0]


def test_window_leaving_the_raster_is_padded_with_holes():
    rows = np.array([[1.0, 2.0, SENTINEL], [4.0, 5.0, 6.0]], dtype=np.float32)
    block = prepare.padded_block(rows, 0, (-1, 2, -1, 3), SENTINEL)
    assert block.shape == (3, 4)
    assert np.isnan(block[0]).all() and np.isnan(block[:, 0]).all()
    assert block[1, 1] == 1.0 and block[2, 3] == 6.0
    assert np.isnan(block[1, 3])  # the source sentinel


def test_unknown_relief_is_transparent_in_the_shaded_image():
    image = Image.open(BytesIO(prepare.shade_png(np.array([[0.0, 1.0, np.nan]]))))
    assert image.mode == "LA"
    assert [image.getpixel((x, 0)) for x in range(3)] == [(0, 255), (255, 255), (0, 0)]
