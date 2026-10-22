import { createGrid, type Coordinate } from "../algorithm";
import { DEFAULT_COLUMNS, DEFAULT_ROWS } from "../simulation/config";
import type { SimulationConfig } from "../simulation/types";

/**
 * Fixed 32×20 maps used for the Phase 8 QA audit: the same sizes and rules as the simulation.
 * They are verification fixtures, not UI presets.
 */
export interface QaScenario {
  readonly name: string;
  readonly description: string;
  readonly config: SimulationConfig;
}

const W = DEFAULT_COLUMNS;
const H = DEFAULT_ROWS;

function build(blocked: Coordinate[], start: Coordinate, goal: Coordinate): SimulationConfig {
  const free = (c: Coordinate) => !(c.x === start.x && c.y === start.y) && !(c.x === goal.x && c.y === goal.y);
  return { grid: createGrid(W, H, blocked.filter(free)), start, goal };
}

function openTerrain(): SimulationConfig {
  return build([], { x: 3, y: 14 }, { x: 28, y: 5 });
}

/** A three-cell-thick ridge across the whole map, crossable only through a pass near the top. */
function mountainPass(): SimulationConfig {
  const blocked: Coordinate[] = [];
  for (let x = 14; x <= 16; x++) for (let y = 0; y < H; y++) if (y !== 2 && y !== 3) blocked.push({ x, y });
  return build(blocked, { x: 4, y: 15 }, { x: 27, y: 15 });
}

/** Deterministic pseudo-random obstacles at about 30% density (fixed LCG seed). */
function denseObstacles(): SimulationConfig {
  let seed = 20261022;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    return seed / 2 ** 31;
  };
  const blocked: Coordinate[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (rand() < 0.3) blocked.push({ x, y });
  return build(blocked, { x: 1, y: 1 }, { x: 30, y: 18 });
}

/** The goal sits inside a closed ring of obstacles: start and goal are valid but unconnected. */
function noRoute(): SimulationConfig {
  const blocked: Coordinate[] = [];
  const goal = { x: 25, y: 10 };
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) === 2) blocked.push({ x: goal.x + dx, y: goal.y + dy });
    }
  }
  return build(blocked, { x: 4, y: 10 }, goal);
}

export const QA_SCENARIOS: readonly QaScenario[] = [
  { name: "Open Terrain", description: "No obstacles; a near-direct route.", config: openTerrain() },
  { name: "Mountain Pass", description: "A full-height ridge with one pass; requires a detour.", config: mountainPass() },
  { name: "Dense Obstacles", description: "About 30% random obstacles; wide exploration.", config: denseObstacles() },
  { name: "No Route", description: "Goal enclosed by obstacles; the frontier empties.", config: noRoute() },
];
