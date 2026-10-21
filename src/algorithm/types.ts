/**
 * Core data model for the AERIS A* engine.
 *
 * Coordinates use screen-style axes: x grows to the right, y grows downward.
 * Grids are indexed as `blocked[y][x]`.
 */

export interface Coordinate {
  readonly x: number;
  readonly y: number;
}

export interface Grid {
  readonly width: number;
  readonly height: number;
  /** `blocked[y][x] === true` means the cell cannot be entered. */
  readonly blocked: ReadonlyArray<ReadonlyArray<boolean>>;
}

export interface SearchProblem {
  readonly grid: Grid;
  readonly start: Coordinate;
  readonly goal: Coordinate;
}

/** Immutable view of a discovered node's A* bookkeeping at a moment in time. */
export interface NodeSnapshot {
  readonly coord: Coordinate;
  /** Lowest known cost from start to this node. */
  readonly g: number;
  /** Octile-distance estimate from this node to the goal. */
  readonly h: number;
  /** g + h. */
  readonly f: number;
  /** Current best parent; `null` only for the start node. */
  readonly parent: Coordinate | null;
  /** 0 for the start node, then 1, 2, 3... in the order nodes were first discovered. */
  readonly discoveryOrder: number;
}

/**
 * What happened to one neighbour while a node was being expanded.
 * Neighbours outside the grid are not recorded.
 */
export type NeighborEvaluation =
  | {
      /** First time this node was seen; it was added to the open set. */
      readonly kind: "discovered";
      readonly coord: Coordinate;
      readonly stepCost: number;
      readonly node: NodeSnapshot;
    }
  | {
      /** A cheaper route was found; g, f and parent were replaced. */
      readonly kind: "improved";
      readonly coord: Coordinate;
      readonly stepCost: number;
      readonly oldG: number;
      readonly newG: number;
      readonly oldF: number;
      readonly newF: number;
      readonly oldParent: Coordinate | null;
      readonly newParent: Coordinate;
      readonly node: NodeSnapshot;
    }
  | {
      /** Already in the open set and the new route is not cheaper; nothing changed. */
      readonly kind: "unchanged";
      readonly coord: Coordinate;
      readonly stepCost: number;
      readonly candidateG: number;
      readonly node: NodeSnapshot;
    }
  | {
      /** The neighbour cell itself is an obstacle. */
      readonly kind: "blocked";
      readonly coord: Coordinate;
    }
  | {
      /** Diagonal move rejected because at least one adjacent orthogonal cell is blocked. */
      readonly kind: "corner-blocked";
      readonly coord: Coordinate;
      readonly blockingCells: readonly Coordinate[];
    }
  | {
      /** The neighbour has already been expanded. */
      readonly kind: "already-closed";
      readonly coord: Coordinate;
    };

export type NeighborEvaluationKind = NeighborEvaluation["kind"];

/** One record per expanded node, in expansion order. */
export interface SearchStep {
  /** 1-based expansion number. */
  readonly step: number;
  /** The node removed from the open set and expanded, as it was when selected. */
  readonly expanded: NodeSnapshot;
  /** True when the expanded node is the goal; the search stops after this step. */
  readonly isGoal: boolean;
  /** Neighbour outcomes in fixed direction order (N, NE, E, SE, S, SW, W, NW). Empty for the goal step. */
  readonly neighbors: readonly NeighborEvaluation[];
  /** Open set after this expansion, sorted by priority (next to be expanded first). */
  readonly frontier: readonly NodeSnapshot[];
  /** Closed set after this expansion, in expansion order. */
  readonly closed: readonly Coordinate[];
}

export interface SearchStats {
  readonly expandedNodes: number;
  readonly discoveredNodes: number;
  readonly maxFrontierSize: number;
  readonly steps: number;
}

export type SearchResult =
  | {
      readonly status: "found";
      readonly path: Coordinate[];
      readonly cost: number;
      readonly trace: SearchStep[];
      readonly stats: SearchStats;
    }
  | {
      readonly status: "no-path";
      readonly path: [];
      readonly cost: null;
      readonly trace: SearchStep[];
      readonly stats: SearchStats;
    };

/** Thrown for malformed grids, out-of-bounds coordinates, or blocked start/goal. */
export class InvalidSearchInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSearchInputError";
  }
}
