import type { ElevationSampler } from '@marps/mission-core';
import type { TerrainGrid } from './terrain';

/**
 * Elevation along a route, interpolated between the four surrounding cell centres so
 * the slope between two close points does not jump from cell to cell. Interpolation
 * only runs between measured cells: one `NaN` neighbour makes the point a gap.
 * Placement follows `cellAt`: equirectangular metres from the grid origin.
 */
export function elevationSampler(grid: TerrainGrid): ElevationSampler {
  const { raster, values } = grid;
  const metresPerDegree = (raster.projection.radiusMetres * Math.PI) / 180;
  return ({ longitude, latitude }) => {
    const x = (longitude * metresPerDegree - raster.origin.x) / raster.pixelSizeMetres;
    const y = (raster.origin.y - latitude * metresPerDegree) / raster.pixelSizeMetres;
    // Same bounds as `cellAt`: the east and south edges are outside.
    if (x < 0 || y < 0 || x >= raster.width || y >= raster.height) {
      return { elevationMetres: null, status: 'out-of-coverage' };
    }
    // Position in cell-centre units, clamped so the outer half-cells keep the edge value.
    const column = Math.min(Math.max(x - 0.5, 0), raster.width - 1);
    const row = Math.min(Math.max(y - 0.5, 0), raster.height - 1);
    const c0 = Math.floor(column);
    const r0 = Math.floor(row);
    const c1 = Math.min(c0 + 1, raster.width - 1);
    const r1 = Math.min(r0 + 1, raster.height - 1);
    const fc = column - c0;
    const fr = row - r0;
    const corners = [
      { value: values[r0 * raster.width + c0], weight: (1 - fc) * (1 - fr) },
      { value: values[r0 * raster.width + c1], weight: fc * (1 - fr) },
      { value: values[r1 * raster.width + c0], weight: (1 - fc) * fr },
      { value: values[r1 * raster.width + c1], weight: fc * fr },
    ].filter((corner) => corner.weight > 0);
    // Only cells that contribute count: a hole next door does not erase a measured point.
    if (corners.some((corner) => corner.value === undefined || Number.isNaN(corner.value))) {
      return { elevationMetres: null, status: 'no-data' };
    }
    const elevationMetres = corners.reduce((sum, corner) => sum + (corner.value ?? 0) * corner.weight, 0);
    return { elevationMetres, status: 'measured' };
  };
}
