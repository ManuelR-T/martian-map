import {
  findPath,
  polylineDistances,
  routeCost,
  straightenRoute,
  type CellBlock,
  type MarsCoordinate,
  type RouteCost,
  type RouteScenario,
  type SlopeGrid,
} from '@marps/mission-core';
import { coordinateAt, gridPointAt, type TerrainGrid } from './terrain';

export type RouteProposal =
  | {
      readonly status: 'found';
      /** Vertices between each pair of consecutive stops; the stops themselves are not repeated. */
      readonly legs: readonly (readonly MarsCoordinate[])[];
    }
  /** `leg` is the index of the first leg that failed: stop `leg` to stop `leg + 1`. */
  | { readonly status: 'invalid-start' | 'invalid-goal'; readonly leg: number; readonly reason: CellBlock }
  | { readonly status: 'no-path'; readonly leg: number };

export interface RouteMeasure extends RouteCost {
  /** Ground distance, from the same calculation as the mission budget. */
  readonly metres: number;
}

function slopeGrid(grid: TerrainGrid): SlopeGrid {
  if (grid.dataset.kind !== 'slope') throw new Error(`Dataset ${grid.dataset.id} is not a slope grid.`);
  const { raster } = grid;
  const centre = coordinateAt(raster, { x: raster.width / 2, y: raster.height / 2 });
  return {
    width: raster.width,
    height: raster.height,
    // The grid is square in degrees: on the ground its cells narrow with the cosine of the latitude.
    cellWidthMetres: raster.pixelSizeMetres * Math.cos((centre.latitude * Math.PI) / 180),
    cellHeightMetres: raster.pixelSizeMetres,
    slopeDegrees: grid.values,
  };
}

/**
 * Experimental route through the stops, in order, on the cells of a slope grid. The search
 * is confined to the grid: NoData and anything outside it are closed, never assumed flat.
 * One failing leg fails the proposal, so a partial route is never shown as a whole one.
 */
export function proposeRoute(grid: TerrainGrid, stops: readonly MarsCoordinate[], scenario: RouteScenario): RouteProposal {
  const cells = slopeGrid(grid);
  const points = stops.map((stop) => gridPointAt(grid.raster, stop));
  const legs: MarsCoordinate[][] = [];
  for (let leg = 0; leg < points.length - 1; leg += 1) {
    const from = points[leg]!;
    const to = points[leg + 1]!;
    // A stop outside the grid floors to a cell the search reports as out of coverage.
    const result = findPath(cells, scenario, { row: Math.floor(from.y), column: Math.floor(from.x) }, { row: Math.floor(to.y), column: Math.floor(to.x) });
    if (result.status === 'no-path') return { status: 'no-path', leg };
    if (result.status !== 'found') return { status: result.status, leg, reason: result.reason };
    // The stops replace the centres of their own cells, so the leg ends exactly on them.
    const centres = result.cells.slice(1, -1).map((cell) => ({ x: cell.column + 0.5, y: cell.row + 0.5 }));
    const route = straightenRoute(cells, scenario, [from, ...centres, to]);
    legs.push(route.slice(1, -1).map((point) => coordinateAt(grid.raster, point)));
  }
  return { status: 'found', legs };
}

/** Distance and scenario cost of any route, drawn or proposed, read on the same slope grid. */
export function measureRoute(grid: TerrainGrid, route: readonly MarsCoordinate[], scenario: RouteScenario): RouteMeasure {
  return {
    metres: polylineDistances(route).total.metres,
    ...routeCost(slopeGrid(grid), scenario, route.map((coordinate) => gridPointAt(grid.raster, coordinate))),
  };
}
