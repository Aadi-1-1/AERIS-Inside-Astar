import { createGrid, type Coordinate, type Grid } from "../algorithm";
import type { SimulationConfig } from "./types";

export const DEFAULT_COLUMNS = 32;
export const DEFAULT_ROWS = 20;

/**
 * Two staggered walls: the first leaves a gap at the bottom, the second a gap at the top,
 * so the route has to weave instead of running straight from start to goal.
 */
export function createDefaultConfig(): SimulationConfig {
  const blocked: Coordinate[] = [];
  for (let y = 0; y <= 14; y++) blocked.push({ x: 11, y });
  for (let y = 5; y < DEFAULT_ROWS; y++) blocked.push({ x: 21, y });
  return {
    grid: createGrid(DEFAULT_COLUMNS, DEFAULT_ROWS, blocked),
    start: { x: 3, y: 4 },
    goal: { x: 28, y: 15 },
  };
}

const same = (a: Coordinate, b: Coordinate) => a.x === b.x && a.y === b.y;

const inBounds = (grid: Grid, c: Coordinate) => c.x >= 0 && c.y >= 0 && c.x < grid.width && c.y < grid.height;

const isBlocked = (grid: Grid, c: Coordinate) => grid.blocked[c.y]![c.x]!;

/**
 * Edit helpers return the same config object when the edit is not allowed or changes
 * nothing, so callers can detect a no-op by identity and avoid invalidating the search.
 */
export function setBlocked(config: SimulationConfig, coord: Coordinate, blocked: boolean): SimulationConfig {
  const { grid } = config;
  if (!inBounds(grid, coord) || same(coord, config.start) || same(coord, config.goal)) return config;
  if (isBlocked(grid, coord) === blocked) return config;
  const cells = grid.blocked.map((row) => row.slice());
  cells[coord.y]![coord.x] = blocked;
  return { ...config, grid: { ...grid, blocked: cells } };
}

/** Moves start onto a traversable, in-bounds cell that is not the goal. */
export function moveStart(config: SimulationConfig, coord: Coordinate): SimulationConfig {
  if (!canHostEndpoint(config, coord) || same(coord, config.start)) return config;
  return { ...config, start: coord };
}

/** Moves goal onto a traversable, in-bounds cell that is not the start. */
export function moveGoal(config: SimulationConfig, coord: Coordinate): SimulationConfig {
  if (!canHostEndpoint(config, coord) || same(coord, config.goal)) return config;
  return { ...config, goal: coord };
}

function canHostEndpoint(config: SimulationConfig, coord: Coordinate): boolean {
  return (
    inBounds(config.grid, coord) &&
    !isBlocked(config.grid, coord) &&
    !same(coord, config.start) &&
    !same(coord, config.goal)
  );
}
