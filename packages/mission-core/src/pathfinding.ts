export interface GridCell {
  readonly row: number;
  readonly column: number;
}

/**
 * Position on the grid, in cells: `x` grows east from the west edge, `y` grows south from
 * the north edge. The cell at (row, column) covers x in [column, column + 1) and y in
 * [row, row + 1), so its centre is at (column + 0.5, row + 0.5).
 */
export interface GridPoint {
  readonly x: number;
  readonly y: number;
}

/** Slope of each cell in degrees, row by row. `NaN` marks a cell without measurement. */
export interface SlopeGrid {
  readonly width: number;
  readonly height: number;
  /** Ground size of a cell: a grid in degrees is narrower east-west away from the equator. */
  readonly cellWidthMetres: number;
  readonly cellHeightMetres: number;
  readonly slopeDegrees: ArrayLike<number>;
}

/**
 * Hypotheses of one experimental route. A cell steeper than `maxSlopeDegrees` is closed;
 * below it, one metre walked counts as `1 + slopeWeight × slope / maxSlopeDegrees` flat metres.
 */
export interface RouteScenario {
  readonly id: 'cautious' | 'balanced' | 'bold';
  readonly maxSlopeDegrees: number;
  readonly slopeWeight: number;
}

/** Scenario assumptions, not operational limits of a suit or a crew. */
export const routeScenarios = [
  { id: 'cautious', maxSlopeDegrees: 15, slopeWeight: 4 },
  { id: 'balanced', maxSlopeDegrees: 20, slopeWeight: 2 },
  { id: 'bold', maxSlopeDegrees: 25, slopeWeight: 1 },
] as const satisfies readonly RouteScenario[];

/** Why a cell cannot be walked. */
export type CellBlock = 'out-of-coverage' | 'no-data' | 'too-steep';

export type PathResult =
  | {
      readonly status: 'found';
      /** Every cell walked, start and goal included. */
      readonly cells: readonly GridCell[];
      /** Flat-equivalent metres between cell centres. */
      readonly costMetres: number;
    }
  | { readonly status: 'invalid-start' | 'invalid-goal'; readonly reason: CellBlock }
  | { readonly status: 'no-path' };

/** Flat metres one metre costs on this slope; null when the scenario closes the cell. */
export function slopeCostFactor(slopeDegrees: number | null, scenario: RouteScenario): number | null {
  // `!(>= 0)` also rejects NaN: an unknown slope is never walked as if it were flat.
  if (slopeDegrees === null || !(slopeDegrees >= 0) || slopeDegrees > scenario.maxSlopeDegrees) return null;
  return 1 + (scenario.slopeWeight * slopeDegrees) / scenario.maxSlopeDegrees;
}

/** Null when the cell can be walked under the scenario. */
export function cellBlock(grid: SlopeGrid, scenario: RouteScenario, cell: GridCell): CellBlock | null {
  const inside =
    Number.isInteger(cell.row) && Number.isInteger(cell.column) &&
    cell.row >= 0 && cell.row < grid.height && cell.column >= 0 && cell.column < grid.width;
  if (!inside) return 'out-of-coverage';
  const slope = grid.slopeDegrees[cell.row * grid.width + cell.column]!;
  if (!(slope >= 0)) return 'no-data';
  return slope > scenario.maxSlopeDegrees ? 'too-steep' : null;
}

/** Binary min-heap of grid indices. A cell may be queued again with a better priority. */
class Frontier {
  private readonly priorities: number[] = [];
  private readonly nodes: number[] = [];

  get empty() {
    return this.nodes.length === 0;
  }

  push(node: number, priority: number) {
    let index = this.nodes.length;
    this.nodes.push(node);
    this.priorities.push(priority);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.priorities[parent]! <= this.priorities[index]!) break;
      this.swap(index, parent);
      index = parent;
    }
  }

  pop(): number {
    const top = this.nodes[0]!;
    const lastNode = this.nodes.pop()!;
    const lastPriority = this.priorities.pop()!;
    if (this.nodes.length > 0) {
      this.nodes[0] = lastNode;
      this.priorities[0] = lastPriority;
      let index = 0;
      for (;;) {
        const left = 2 * index + 1;
        const right = left + 1;
        let smallest = index;
        if (left < this.nodes.length && this.priorities[left]! < this.priorities[smallest]!) smallest = left;
        if (right < this.nodes.length && this.priorities[right]! < this.priorities[smallest]!) smallest = right;
        if (smallest === index) break;
        this.swap(index, smallest);
        index = smallest;
      }
    }
    return top;
  }

  private swap(a: number, b: number) {
    [this.nodes[a], this.nodes[b]] = [this.nodes[b]!, this.nodes[a]!];
    [this.priorities[a], this.priorities[b]] = [this.priorities[b]!, this.priorities[a]!];
  }
}

const MOVES = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]] as const;

/**
 * Cheapest walk between two cell centres (A*, eight directions). The search never leaves
 * the grid, so it settles each cell at most once. A step costs its length times the mean
 * factor of the two cells, which is exactly what `routeCost` reads along that step. A
 * diagonal is refused when either cell it squeezes between is closed: the route never
 * cuts the corner of an obstacle.
 */
export function findPath(grid: SlopeGrid, scenario: RouteScenario, start: GridCell, goal: GridCell): PathResult {
  const startBlock = cellBlock(grid, scenario, start);
  if (startBlock) return { status: 'invalid-start', reason: startBlock };
  const goalBlock = cellBlock(grid, scenario, goal);
  if (goalBlock) return { status: 'invalid-goal', reason: goalBlock };

  const { width, height, cellWidthMetres, cellHeightMetres } = grid;
  const diagonalMetres = Math.hypot(cellWidthMetres, cellHeightMetres);
  const size = width * height;
  // NaN marks a closed cell.
  const factor = new Float64Array(size);
  for (let index = 0; index < size; index += 1) factor[index] = slopeCostFactor(grid.slopeDegrees[index]!, scenario) ?? NaN;
  const closed = (index: number) => Number.isNaN(factor[index]!);

  const best = new Float64Array(size).fill(Infinity);
  const previous = new Int32Array(size).fill(-1);
  const settled = new Uint8Array(size);
  const startIndex = start.row * width + start.column;
  const goalIndex = goal.row * width + goal.column;
  // Shortest eight-direction walk on flat ground: never above the real cost, so the result is optimal.
  const estimate = (row: number, column: number) => {
    const rows = Math.abs(row - goal.row);
    const columns = Math.abs(column - goal.column);
    const straight = columns > rows ? (columns - rows) * cellWidthMetres : (rows - columns) * cellHeightMetres;
    return Math.min(rows, columns) * diagonalMetres + straight;
  };

  const frontier = new Frontier();
  best[startIndex] = 0;
  frontier.push(startIndex, estimate(start.row, start.column));
  while (!frontier.empty) {
    const node = frontier.pop();
    if (settled[node]) continue;
    settled[node] = 1;
    if (node === goalIndex) {
      const cells: GridCell[] = [];
      for (let index = node; index !== -1; index = previous[index]!) {
        cells.push({ row: Math.floor(index / width), column: index % width });
      }
      return { status: 'found', cells: cells.reverse(), costMetres: best[node]! };
    }
    const row = Math.floor(node / width);
    const column = node % width;
    for (const [rowStep, columnStep] of MOVES) {
      const nextRow = row + rowStep;
      const nextColumn = column + columnStep;
      if (nextRow < 0 || nextRow >= height || nextColumn < 0 || nextColumn >= width) continue;
      const next = nextRow * width + nextColumn;
      if (settled[next] || closed(next)) continue;
      const diagonal = rowStep !== 0 && columnStep !== 0;
      if (diagonal && (closed(row * width + nextColumn) || closed(nextRow * width + column))) continue;
      const stepMetres = diagonal ? diagonalMetres : rowStep === 0 ? cellWidthMetres : cellHeightMetres;
      const cost = best[node]! + stepMetres * (factor[node]! + factor[next]!) / 2;
      if (cost < best[next]!) {
        best[next] = cost;
        previous[next] = node;
        frontier.push(next, cost + estimate(nextRow, nextColumn));
      }
    }
  }
  return { status: 'no-path' };
}

export interface RouteCost {
  /** Flat-equivalent metres of the stretches the scenario allows. */
  readonly costMetres: number;
  /** Ground metres on cells the scenario closes; they carry no cost, so the total is partial. */
  readonly blockedMetres: number;
}

/**
 * Reads one straight stretch cell by cell: each cell is charged for the exact length
 * walked inside it. `clear` is false when the stretch enters a closed cell, leaves the
 * grid, or passes through a corner shared with a closed cell.
 */
function traverse(grid: SlopeGrid, scenario: RouteScenario, from: GridPoint, to: GridPoint) {
  const factorAt = (column: number, row: number) =>
    row >= 0 && row < grid.height && column >= 0 && column < grid.width
      ? slopeCostFactor(grid.slopeDegrees[row * grid.width + column]!, scenario)
      : null;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const metres = Math.hypot(dx * grid.cellWidthMetres, dy * grid.cellHeightMetres);
  // Fractions of the stretch at which it crosses a line between two cells.
  const cuts = [0, 1];
  for (let line = Math.floor(Math.min(from.x, to.x)) + 1; line < Math.max(from.x, to.x); line += 1) cuts.push((line - from.x) / dx);
  for (let line = Math.floor(Math.min(from.y, to.y)) + 1; line < Math.max(from.y, to.y); line += 1) cuts.push((line - from.y) / dy);
  cuts.sort((a, b) => a - b);

  let costMetres = 0;
  let blockedMetres = 0;
  let clear = true;
  for (let index = 1; index < cuts.length; index += 1) {
    const start = cuts[index - 1]!;
    const end = cuts[index]!;
    if (end - start < 1e-9) {
      // Two lines crossed at once: the stretch goes through the corner shared by four cells.
      const column = Math.round(from.x + dx * start);
      const row = Math.round(from.y + dy * start);
      if ([factorAt(column - 1, row - 1), factorAt(column, row - 1), factorAt(column - 1, row), factorAt(column, row)].includes(null)) clear = false;
      continue;
    }
    const middle = (start + end) / 2;
    const factor = factorAt(Math.floor(from.x + dx * middle), Math.floor(from.y + dy * middle));
    if (factor === null) {
      blockedMetres += (end - start) * metres;
      clear = false;
    } else costMetres += (end - start) * metres * factor;
  }
  return { costMetres, blockedMetres, clear };
}

/**
 * Cost of any route under a scenario, drawn or proposed, so the two can be compared.
 * Anything outside the grid counts as closed.
 */
export function routeCost(grid: SlopeGrid, scenario: RouteScenario, route: readonly GridPoint[]): RouteCost {
  let costMetres = 0;
  let blockedMetres = 0;
  route.slice(1).forEach((to, index) => {
    const stretch = traverse(grid, scenario, route[index]!, to);
    costMetres += stretch.costMetres;
    blockedMetres += stretch.blockedMetres;
  });
  return { costMetres, blockedMetres };
}

/**
 * Replaces runs of cell-to-cell steps by straight stretches wherever the straight stretch
 * stays on open cells and costs no more. Removes the staircase of an eight-direction walk,
 * which is up to 8 % longer than a straight line on open ground. The result never costs
 * more than the input, nor more than the straight line between its ends when that line is open.
 */
export function straightenRoute(grid: SlopeGrid, scenario: RouteScenario, route: readonly GridPoint[]): GridPoint[] {
  // Cost of the input from its start to each of its points.
  const travelled = [0];
  route.slice(1).forEach((to, index) => travelled.push(travelled[index]! + traverse(grid, scenario, route[index]!, to).costMetres));

  const straightened = route.slice(0, 1);
  let anchor = 0;
  while (anchor < route.length - 1) {
    // Farthest point first: the longest stretch that qualifies wins.
    let next = route.length - 1;
    for (; next > anchor + 1; next -= 1) {
      const stretch = traverse(grid, scenario, route[anchor]!, route[next]!);
      if (stretch.clear && stretch.costMetres <= travelled[next]! - travelled[anchor]! + 1e-9) break;
    }
    straightened.push(route[next]!);
    anchor = next;
  }
  return straightened;
}
