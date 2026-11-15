import { describe, expect, it } from 'vitest';
import {
  cellBlock,
  findPath,
  routeCost,
  routeScenarios,
  slopeCostFactor,
  straightenRoute,
  type GridCell,
  type GridPoint,
  type RouteScenario,
  type SlopeGrid,
} from './index';

const CELL = 20;
const scenario: RouteScenario = { id: 'balanced', maxSlopeDegrees: 20, slopeWeight: 2 };
const X = 90; // steeper than any scenario allows
const N = NaN; // no measurement

/** Rows of slopes in degrees, north to south. */
function grid(rows: readonly (readonly number[])[]): SlopeGrid {
  return { width: rows[0]!.length, height: rows.length, cellWidthMetres: CELL, cellHeightMetres: CELL, slopeDegrees: Float32Array.from(rows.flat()) };
}
const cell = (row: number, column: number): GridCell => ({ row, column });
const found = (result: ReturnType<typeof findPath>) => {
  if (result.status !== 'found') throw new Error(`Expected a path, got ${result.status}.`);
  return result;
};

describe('scenario cost', () => {
  it('counts a flat metre as one metre and a metre at the limit as 1 + weight', () => {
    expect(slopeCostFactor(0, scenario)).toBe(1);
    expect(slopeCostFactor(10, scenario)).toBe(2);
    expect(slopeCostFactor(20, scenario)).toBe(3);
  });

  it('closes a cell beyond the limit or without measurement instead of pricing it', () => {
    expect(slopeCostFactor(20.1, scenario)).toBeNull();
    expect(slopeCostFactor(NaN, scenario)).toBeNull();
    expect(slopeCostFactor(null, scenario)).toBeNull();
  });

  it('orders the scenarios from the strictest slope limit to the loosest', () => {
    const limits = routeScenarios.map((candidate) => candidate.maxSlopeDegrees);
    expect(limits).toEqual([...limits].sort((a, b) => a - b));
  });
});

describe('findPath', () => {
  it('crosses flat terrain in a straight line, at the ground distance', () => {
    const flat = grid([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    const straight = found(findPath(flat, scenario, cell(1, 0), cell(1, 3)));
    expect(straight.cells).toEqual([cell(1, 0), cell(1, 1), cell(1, 2), cell(1, 3)]);
    expect(straight.costMetres).toBeCloseTo(3 * CELL);

    const diagonal = found(findPath(flat, scenario, cell(0, 0), cell(3, 3)));
    expect(diagonal.cells).toHaveLength(4);
    expect(diagonal.costMetres).toBeCloseTo(3 * CELL * Math.SQRT2);
  });

  it('stays where it is when start and goal share a cell', () => {
    expect(findPath(grid([[0]]), scenario, cell(0, 0), cell(0, 0))).toEqual({ status: 'found', cells: [cell(0, 0)], costMetres: 0 });
  });

  it('goes around a slope it may cross when the detour is cheaper', () => {
    const ridge = grid([
      [0, 0, 0],
      [0, 20, 0],
      [0, 0, 0],
    ]);
    const path = found(findPath(ridge, scenario, cell(1, 0), cell(1, 2)));
    // Straight over the ridge: 2 × 20 m × (1 + 3) / 2 = 80 m. Around it on flat ground: 2 × 20 m × √2 ≈ 56.6 m.
    expect(path.cells).not.toContainEqual(cell(1, 1));
    expect(path.costMetres).toBeCloseTo(2 * CELL * Math.SQRT2);
  });

  it('climbs a slope when no flat detour exists, and charges for it', () => {
    const path = found(findPath(grid([[0, 10, 0]]), scenario, cell(0, 0), cell(0, 2)));
    expect(path.costMetres).toBeCloseTo(CELL * 1.5 + CELL * 1.5);
  });

  it('never crosses an obstacle: too steep, NoData, or the edge of the grid', () => {
    const wall = grid([
      [0, X, 0],
      [0, N, 0],
      [0, 0, 0],
    ]);
    const path = found(findPath(wall, scenario, cell(0, 0), cell(0, 2)));
    expect(path.cells).toEqual([cell(0, 0), cell(1, 0), cell(2, 0), cell(2, 1), cell(2, 2), cell(1, 2), cell(0, 2)]);
  });

  it('does not cut the corner of an obstacle on a diagonal', () => {
    const corner = grid([
      [0, X],
      [0, 0],
    ]);
    // The diagonal (1,0) → (0,1) is not at stake here; (0,0) → (1,1) squeezes past the closed cell.
    expect(found(findPath(corner, scenario, cell(0, 0), cell(1, 1))).cells).toEqual([cell(0, 0), cell(1, 0), cell(1, 1)]);
  });

  it('finds no path between two cells that only touch by a corner', () => {
    const pinched = grid([
      [0, X],
      [X, 0],
    ]);
    expect(findPath(pinched, scenario, cell(0, 0), cell(1, 1))).toEqual({ status: 'no-path' });
  });

  it('threads a one-cell passage through a wall', () => {
    const gate = grid([
      [0, X, 0],
      [0, 0, 0],
      [0, X, 0],
    ]);
    expect(found(findPath(gate, scenario, cell(0, 0), cell(0, 2))).cells).toEqual([
      cell(0, 0), cell(1, 0), cell(1, 1), cell(1, 2), cell(0, 2),
    ]);
  });

  it('reports a disconnected region instead of a route', () => {
    const island = grid([
      [0, X, 0],
      [0, X, 0],
      [0, X, 0],
    ]);
    expect(findPath(island, scenario, cell(0, 0), cell(2, 2))).toEqual({ status: 'no-path' });
  });

  it('names why a start or a goal cannot be used', () => {
    const terrain = grid([[0, X, N]]);
    expect(findPath(terrain, scenario, cell(0, 1), cell(0, 0))).toEqual({ status: 'invalid-start', reason: 'too-steep' });
    expect(findPath(terrain, scenario, cell(0, 2), cell(0, 0))).toEqual({ status: 'invalid-start', reason: 'no-data' });
    expect(findPath(terrain, scenario, cell(0, 0), cell(0, 3))).toEqual({ status: 'invalid-goal', reason: 'out-of-coverage' });
    expect(findPath(terrain, scenario, cell(-1, 0), cell(0, 0))).toEqual({ status: 'invalid-start', reason: 'out-of-coverage' });
    expect(cellBlock(terrain, scenario, cell(0, 0))).toBeNull();
  });

  it('opens a passage to a bolder scenario that a cautious one refuses', () => {
    const pass = grid([[0, 18, 0]]);
    expect(findPath(pass, { id: 'cautious', maxSlopeDegrees: 15, slopeWeight: 4 }, cell(0, 0), cell(0, 2)).status).toBe('no-path');
    expect(findPath(pass, scenario, cell(0, 0), cell(0, 2)).status).toBe('found');
  });

  it('returns the cheapest path, checked against an exhaustive search on a rough grid', () => {
    // Deterministic pseudo-random slopes, about a quarter of them closed.
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const size = 12;
    // The start cell is kept open so the walk has somewhere to begin.
    const rough = grid(Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, column) => (row + column > 0 && random() < 0.25 ? X : random() * 20))));
    const open = (row: number, column: number) =>
      row >= 0 && row < size && column >= 0 && column < size && slopeCostFactor(rough.slopeDegrees[row * size + column]!, scenario) !== null;
    // Bellman-Ford with the same moves: slow, but with no heuristic to get wrong.
    const best = Array.from({ length: size * size }, () => Infinity);
    best[0] = 0;
    for (let pass = 0; pass < size * size; pass += 1) {
      for (let index = 0; index < size * size; index += 1) {
        const row = Math.floor(index / size);
        const column = index % size;
        if (!open(row, column) || best[index] === Infinity) continue;
        for (const rowStep of [-1, 0, 1]) for (const columnStep of [-1, 0, 1]) {
          const nextRow = row + rowStep;
          const nextColumn = column + columnStep;
          if ((!rowStep && !columnStep) || !open(nextRow, nextColumn)) continue;
          if (rowStep && columnStep && (!open(row, nextColumn) || !open(nextRow, column))) continue;
          const factors = slopeCostFactor(rough.slopeDegrees[index]!, scenario)! + slopeCostFactor(rough.slopeDegrees[nextRow * size + nextColumn]!, scenario)!;
          const cost = best[index]! + CELL * (rowStep && columnStep ? Math.SQRT2 : 1) * factors / 2;
          if (cost < best[nextRow * size + nextColumn]!) best[nextRow * size + nextColumn] = cost;
        }
      }
    }
    const reachable = best.flatMap((cost, index) => (index > 0 && cost < Infinity ? [index] : []));
    expect(reachable.length).toBeGreaterThan(20);
    for (const index of reachable) {
      const result = found(findPath(rough, scenario, cell(0, 0), cell(Math.floor(index / size), index % size)));
      expect(result.costMetres).toBeCloseTo(best[index]!, 6);
    }
  });
});

describe('findPath on cells that are not square on the ground', () => {
  it('measures each direction with its own cell size', () => {
    const narrow: SlopeGrid = { width: 3, height: 3, cellWidthMetres: 3, cellHeightMetres: 4, slopeDegrees: new Float32Array(9) };
    expect(found(findPath(narrow, scenario, cell(0, 0), cell(0, 2))).costMetres).toBeCloseTo(6);
    expect(found(findPath(narrow, scenario, cell(0, 0), cell(2, 0))).costMetres).toBeCloseTo(8);
    expect(found(findPath(narrow, scenario, cell(0, 0), cell(2, 2))).costMetres).toBeCloseTo(10);
    expect(found(findPath(narrow, scenario, cell(0, 0), cell(1, 2))).costMetres).toBeCloseTo(5 + 3);
  });
});

const centre = (row: number, column: number): GridPoint => ({ x: column + 0.5, y: row + 0.5 });

describe('routeCost', () => {
  it('equals the ground distance on flat terrain, in any direction', () => {
    const flat = grid([[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
    expect(routeCost(flat, scenario, [{ x: 0.2, y: 0.3 }, { x: 2.9, y: 2.1 }])).toEqual({
      costMetres: expect.closeTo(CELL * Math.hypot(2.7, 1.8), 9),
      blockedMetres: 0,
    });
  });

  it('charges each cell for the length walked inside it', () => {
    // 10 m on flat ground, 20 m at factor 2, 10 m on flat ground.
    expect(routeCost(grid([[0, 10, 0]]), scenario, [centre(0, 0), centre(0, 2)]).costMetres).toBeCloseTo(10 + 40 + 10);
  });

  it('agrees with the search on the path the search returns', () => {
    const terrain = grid([
      [0, 12, 3],
      [5, X, 8],
      [2, 6, 0],
    ]);
    const path = found(findPath(terrain, scenario, cell(0, 0), cell(2, 2)));
    const measured = routeCost(terrain, scenario, path.cells.map(({ row, column }) => centre(row, column)));
    expect(measured.costMetres).toBeCloseTo(path.costMetres, 4);
    expect(measured.blockedMetres).toBe(0);
  });

  it('reports the metres on closed cells and outside the grid instead of pricing them', () => {
    const cost = routeCost(grid([[0, X, N, 0]]), scenario, [centre(0, 0), { x: 5.5, y: 0.5 }]);
    expect(cost.blockedMetres).toBeCloseTo(2 * CELL + 1.5 * CELL);
    expect(cost.costMetres).toBeCloseTo(0.5 * CELL + CELL);
  });
});

describe('straightenRoute', () => {
  const walk = (terrain: SlopeGrid, from: GridCell, to: GridCell) =>
    found(findPath(terrain, scenario, from, to)).cells.map(({ row, column }) => centre(row, column));

  it('turns a staircase across open ground into one straight stretch', () => {
    const flat = grid(Array.from({ length: 4 }, () => Array.from({ length: 8 }, () => 0)));
    const staircase = walk(flat, cell(0, 0), cell(3, 7));
    const straight = straightenRoute(flat, scenario, staircase);
    expect(straight).toEqual([centre(0, 0), centre(3, 7)]);
    expect(routeCost(flat, scenario, straight).costMetres).toBeLessThan(routeCost(flat, scenario, staircase).costMetres);
  });

  it('keeps the detour around an obstacle', () => {
    const wall = grid([
      [0, X, 0],
      [0, X, 0],
      [0, 0, 0],
    ]);
    const straight = straightenRoute(wall, scenario, walk(wall, cell(0, 0), cell(0, 2)));
    expect(straight.length).toBeGreaterThan(2);
    expect(routeCost(wall, scenario, straight).blockedMetres).toBe(0);
  });

  it('does not straighten through the corner of a closed cell', () => {
    const corner = grid([
      [0, X, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);
    // Away from the closed cell, the middle point goes.
    expect(straightenRoute(corner, scenario, [centre(1, 0), centre(1, 1), centre(1, 2)])).toEqual([centre(1, 0), centre(1, 2)]);
    // (0,0) → (1,1) and (0,0) → (2,2) pass through the corner of the closed cell: the walk keeps going around it.
    expect(straightenRoute(corner, scenario, [centre(0, 0), centre(1, 0), centre(1, 1), centre(2, 2)])).toEqual([
      centre(0, 0), centre(1, 0), centre(2, 2),
    ]);
  });

  it('keeps a flat detour that is cheaper than the straight climb', () => {
    const ridge = grid([
      [0, 0, 0],
      [0, 20, 0],
      [0, 0, 0],
    ]);
    const detour = walk(ridge, cell(1, 0), cell(1, 2));
    const straight = straightenRoute(ridge, scenario, detour);
    expect(routeCost(ridge, scenario, straight).costMetres).toBeLessThanOrEqual(routeCost(ridge, scenario, detour).costMetres + 1e-9);
    expect(routeCost(ridge, scenario, straight).costMetres).toBeLessThan(routeCost(ridge, scenario, [centre(1, 0), centre(1, 2)]).costMetres);
  });
});
