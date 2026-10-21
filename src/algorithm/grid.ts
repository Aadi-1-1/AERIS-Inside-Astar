import { InvalidSearchInputError, type Coordinate, type Grid } from "./types";

export const ORTHOGONAL_COST = 1;
export const DIAGONAL_COST = Math.SQRT2;

export interface Direction {
  readonly name: "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
  readonly dx: number;
  readonly dy: number;
}

/** Fixed, clockwise neighbour order starting from north (y decreases upward). */
export const DIRECTIONS: readonly Direction[] = [
  { name: "N", dx: 0, dy: -1 },
  { name: "NE", dx: 1, dy: -1 },
  { name: "E", dx: 1, dy: 0 },
  { name: "SE", dx: 1, dy: 1 },
  { name: "S", dx: 0, dy: 1 },
  { name: "SW", dx: -1, dy: 1 },
  { name: "W", dx: -1, dy: 0 },
  { name: "NW", dx: -1, dy: -1 },
];

export function isDiagonal(direction: Direction): boolean {
  return direction.dx !== 0 && direction.dy !== 0;
}

export function moveCost(direction: Direction): number {
  return isDiagonal(direction) ? DIAGONAL_COST : ORTHOGONAL_COST;
}

export function isInBounds(grid: Grid, coord: Coordinate): boolean {
  return coord.x >= 0 && coord.y >= 0 && coord.x < grid.width && coord.y < grid.height;
}

/** Assumes `coord` is in bounds. */
export function isBlocked(grid: Grid, coord: Coordinate): boolean {
  return grid.blocked[coord.y]![coord.x]!;
}

export function sameCoordinate(a: Coordinate, b: Coordinate): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Builds a grid of the given size with the listed cells blocked. */
export function createGrid(width: number, height: number, blockedCells: readonly Coordinate[] = []): Grid {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new InvalidSearchInputError(`Grid dimensions must be positive integers, got ${width}x${height}.`);
  }
  const blocked = Array.from({ length: height }, () => Array<boolean>(width).fill(false));
  for (const cell of blockedCells) {
    assertCoordinateInGrid({ width, height, blocked }, cell, "Blocked cell");
    blocked[cell.y]![cell.x] = true;
  }
  return { width, height, blocked };
}

export interface ParsedMap {
  readonly grid: Grid;
  readonly start: Coordinate | null;
  readonly goal: Coordinate | null;
}

/**
 * Parses an ASCII map. `#` or `X` = blocked, `S` = start, `G` = goal,
 * anything else (typically `.`) = traversable. Whitespace between cells is ignored,
 * so `"S X"` and `"SX"` are equivalent.
 */
export function parseMap(rows: readonly string[]): ParsedMap {
  const cells = rows.map((row) => row.replace(/\s+/g, "").split(""));
  const width = cells[0]?.length ?? 0;
  if (cells.some((row) => row.length !== width)) {
    throw new InvalidSearchInputError("Map rows must all have the same width.");
  }
  const blockedCells: Coordinate[] = [];
  let start: Coordinate | null = null;
  let goal: Coordinate | null = null;
  cells.forEach((row, y) =>
    row.forEach((ch, x) => {
      if (ch === "#" || ch === "X") blockedCells.push({ x, y });
      else if (ch === "S") start = { x, y };
      else if (ch === "G") goal = { x, y };
    }),
  );
  return { grid: createGrid(width, cells.length, blockedCells), start, goal };
}

export function assertValidGrid(grid: Grid): void {
  const { width, height, blocked } = grid;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new InvalidSearchInputError(`Grid dimensions must be positive integers, got ${width}x${height}.`);
  }
  if (blocked.length !== height || blocked.some((row) => row.length !== width)) {
    throw new InvalidSearchInputError(`Grid cell array does not match declared size ${width}x${height}.`);
  }
}

export function assertCoordinateInGrid(grid: Grid, coord: Coordinate, label: string): void {
  if (!Number.isInteger(coord.x) || !Number.isInteger(coord.y)) {
    throw new InvalidSearchInputError(`${label} (${coord.x}, ${coord.y}) must have integer coordinates.`);
  }
  if (!isInBounds(grid, coord)) {
    throw new InvalidSearchInputError(
      `${label} (${coord.x}, ${coord.y}) is outside the ${grid.width}x${grid.height} grid.`,
    );
  }
}
