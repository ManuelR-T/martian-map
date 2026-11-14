"""Derivations on elevation grids: aggregation, slope and shaded relief.

Grids are row-major with the first row at the north edge. NaN marks NoData and
propagates: a derived cell is NaN as soon as one of its inputs is NaN, never 0.
"""

import math

import numpy as np

# Conventional cartographic light: from the north-west, 45 degrees above the horizon.
LIGHT_AZIMUTH_DEG = 315.0
LIGHT_ALTITUDE_DEG = 45.0


def block_mean(values: np.ndarray, factor: int) -> np.ndarray:
    """Mean of each factor x factor block. A block holding any NaN stays NaN."""
    rows, cols = values.shape
    if rows % factor or cols % factor:
        raise ValueError("grid size must be a multiple of the aggregation factor")
    blocks = values.reshape(rows // factor, factor, cols // factor, factor)
    return blocks.mean(axis=(1, 3), dtype=np.float64)


def ground_cell_size(origin_y: float, pixel_m: float, rows: int, radius_m: float) -> tuple[np.ndarray, float]:
    """Ground size of a cell, east-west per row and north-south, in metres.

    The grid is equirectangular with standard parallel 0: a pixel spans pixel_m on
    the ground north-south, but only pixel_m * cos(latitude) east-west.
    """
    centre_y = origin_y - (np.arange(rows) + 0.5) * pixel_m
    return pixel_m * np.cos(centre_y / radius_m), pixel_m


def gradients(padded: np.ndarray, east_m: np.ndarray, north_m: float) -> tuple[np.ndarray, np.ndarray]:
    """Rise per metre towards the east and towards the north (Horn's 3x3 method).

    padded carries one extra cell on each side, so the result is two cells smaller.
    Every cell of the 3x3 neighbourhood must be valid, including the centre.
    """
    nw, n, ne = padded[:-2, :-2], padded[:-2, 1:-1], padded[:-2, 2:]
    w, centre, e = padded[1:-1, :-2], padded[1:-1, 1:-1], padded[1:-1, 2:]
    sw, s, se = padded[2:, :-2], padded[2:, 1:-1], padded[2:, 2:]
    to_east = ((ne + 2 * e + se) - (nw + 2 * w + sw)) / (8 * east_m[:, None])
    to_north = ((nw + 2 * n + ne) - (sw + 2 * s + se)) / (8 * north_m)
    hole = np.isnan(centre)
    return np.where(hole, np.nan, to_east), np.where(hole, np.nan, to_north)


def slope_degrees(to_east: np.ndarray, to_north: np.ndarray) -> np.ndarray:
    return np.degrees(np.arctan(np.hypot(to_east, to_north)))


def hillshade(to_east: np.ndarray, to_north: np.ndarray) -> np.ndarray:
    """Illumination from 0 (facing away from the light) to 1, without vertical exaggeration."""
    azimuth, altitude = math.radians(LIGHT_AZIMUTH_DEG), math.radians(LIGHT_ALTITUDE_DEG)
    light = (math.sin(azimuth) * math.cos(altitude), math.cos(azimuth) * math.cos(altitude), math.sin(altitude))
    # Surface normal is (-to_east, -to_north, 1), normalised.
    shade = (-to_east * light[0] - to_north * light[1] + light[2]) / np.sqrt(to_east**2 + to_north**2 + 1)
    return np.clip(shade, 0.0, 1.0)
