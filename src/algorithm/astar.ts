import {
  DIRECTIONS,
  assertCoordinateInGrid,
  assertValidGrid,
  isBlocked,
  isDiagonal,
  isInBounds,
  moveCost,
  sameCoordinate,
} from "./grid";
import { octileDistance } from "./heuristic";
import { PriorityQueue } from "./priorityQueue";
import {
  InvalidSearchInputError,
  type Coordinate,
  type NeighborEvaluation,
  type NodeSnapshot,
  type SearchProblem,
  type SearchResult,
  type SearchStep,
} from "./types";

/**
 * Costs closer than this are treated as equal. Diagonal costs involve sqrt(2), so two
 * routes of identical true length can differ in the last floating-point bits depending on
 * summation order. Without a tolerance such noise could register as a fake "improvement"
 * or flip a tie-break. Real cost differences on a grid are many orders of magnitude larger.
 */
export const COST_EPSILON = 1e-9;

interface NodeState {
  readonly coord: Coordinate;
  readonly key: number;
  readonly h: number;
  readonly discoveryOrder: number;
  g: number;
  f: number;
  parent: NodeState | null;
}

/** Open-set ordering: lowest f, then lowest h, then earliest discovery. */
function compareNodes(a: NodeState, b: NodeState): number {
  if (Math.abs(a.f - b.f) > COST_EPSILON) return a.f - b.f;
  if (Math.abs(a.h - b.h) > COST_EPSILON) return a.h - b.h;
  return a.discoveryOrder - b.discoveryOrder;
}

function snapshot(node: NodeState): NodeSnapshot {
  return {
    coord: node.coord,
    g: node.g,
    h: node.h,
    f: node.f,
    parent: node.parent?.coord ?? null,
    discoveryOrder: node.discoveryOrder,
  };
}

function validateProblem({ grid, start, goal }: SearchProblem): void {
  assertValidGrid(grid);
  assertCoordinateInGrid(grid, start, "Start");
  assertCoordinateInGrid(grid, goal, "Goal");
  if (isBlocked(grid, start)) {
    throw new InvalidSearchInputError(`Start (${start.x}, ${start.y}) is on a blocked cell.`);
  }
  if (isBlocked(grid, goal)) {
    throw new InvalidSearchInputError(`Goal (${goal.x}, ${goal.y}) is on a blocked cell.`);
  }
}

function reconstructPath(goal: NodeState, nodeCount: number): Coordinate[] {
  const path: Coordinate[] = [];
  let current: NodeState | null = goal;
  while (current) {
    path.push(current.coord);
    if (path.length > nodeCount) {
      throw new Error("Parent chain contains a cycle; this indicates an A* implementation bug.");
    }
    current = current.parent;
  }
  return path.reverse();
}

/**
 * Runs A* on an 8-connected grid (orthogonal cost 1, diagonal cost sqrt(2), no corner
 * cutting) with the octile heuristic, recording one SearchStep per expanded node.
 *
 * @throws InvalidSearchInputError for malformed grids, out-of-bounds or blocked start/goal.
 */
export function findPath(problem: SearchProblem): SearchResult {
  validateProblem(problem);
  const { grid, start, goal } = problem;
  const keyOf = (c: Coordinate) => c.y * grid.width + c.x;

  const nodes = new Map<number, NodeState>();
  const closed = new Set<number>();
  const closedOrder: Coordinate[] = [];
  const open = new PriorityQueue<NodeState, number>(compareNodes, (n) => n.key);
  const trace: SearchStep[] = [];

  const discover = (coord: Coordinate, g: number, parent: NodeState | null): NodeState => {
    const h = octileDistance(coord, goal);
    const node: NodeState = { coord, key: keyOf(coord), h, g, f: g + h, parent, discoveryOrder: nodes.size };
    nodes.set(node.key, node);
    open.push(node);
    return node;
  };

  discover(start, 0, null);
  let maxFrontierSize = open.size;
  let goalNode: NodeState | null = null;

  while (!open.isEmpty()) {
    const current = open.pop()!;
    const expanded = snapshot(current);
    closed.add(current.key);
    closedOrder.push(current.coord);

    const isGoal = sameCoordinate(current.coord, goal);
    const neighbors: NeighborEvaluation[] = isGoal ? [] : evaluateNeighbors(current);
    maxFrontierSize = Math.max(maxFrontierSize, open.size);

    trace.push({
      step: trace.length + 1,
      expanded,
      isGoal,
      neighbors,
      frontier: open.toSortedArray().map(snapshot),
      closed: [...closedOrder],
    });

    if (isGoal) {
      goalNode = current;
      break;
    }
  }

  const stats = {
    expandedNodes: closed.size,
    discoveredNodes: nodes.size,
    maxFrontierSize,
    steps: trace.length,
  };

  if (!goalNode) {
    return { status: "no-path", path: [], cost: null, trace, stats };
  }
  return { status: "found", path: reconstructPath(goalNode, nodes.size), cost: goalNode.g, trace, stats };

  function evaluateNeighbors(current: NodeState): NeighborEvaluation[] {
    const evaluations: NeighborEvaluation[] = [];
    for (const direction of DIRECTIONS) {
      const coord = { x: current.coord.x + direction.dx, y: current.coord.y + direction.dy };
      if (!isInBounds(grid, coord)) continue;

      if (isBlocked(grid, coord)) {
        evaluations.push({ kind: "blocked", coord });
        continue;
      }

      if (isDiagonal(direction)) {
        // Both orthogonal cells sharing the corner must be open: no squeezing past obstacles.
        const blockingCells = [
          { x: current.coord.x + direction.dx, y: current.coord.y },
          { x: current.coord.x, y: current.coord.y + direction.dy },
        ].filter((c) => isBlocked(grid, c));
        if (blockingCells.length > 0) {
          evaluations.push({ kind: "corner-blocked", coord, blockingCells });
          continue;
        }
      }

      const key = keyOf(coord);
      if (closed.has(key)) {
        evaluations.push({ kind: "already-closed", coord });
        continue;
      }

      const stepCost = moveCost(direction);
      const candidateG = current.g + stepCost;
      const existing = nodes.get(key);

      if (!existing) {
        const node = discover(coord, candidateG, current);
        evaluations.push({ kind: "discovered", coord, stepCost, node: snapshot(node) });
      } else if (candidateG < existing.g - COST_EPSILON) {
        const oldG = existing.g;
        const oldF = existing.f;
        const oldParent = existing.parent?.coord ?? null;
        existing.g = candidateG;
        existing.f = candidateG + existing.h;
        existing.parent = current;
        open.update(key);
        evaluations.push({
          kind: "improved",
          coord,
          stepCost,
          oldG,
          newG: existing.g,
          oldF,
          newF: existing.f,
          oldParent,
          newParent: current.coord,
          node: snapshot(existing),
        });
      } else {
        evaluations.push({ kind: "unchanged", coord, stepCost, candidateG, node: snapshot(existing) });
      }
    }
    return evaluations;
  }
}
