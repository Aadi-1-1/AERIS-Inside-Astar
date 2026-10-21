import type { Coordinate, Grid, NodeSnapshot, SearchResult } from "../algorithm";

/** The map the user edits: everything A* needs as input. */
export interface SimulationConfig {
  readonly grid: Grid;
  readonly start: Coordinate;
  readonly goal: Coordinate;
}

export type EditMode = "obstacle" | "start" | "goal";

export const SPEEDS = [0.5, 1, 2, 4] as const;
export type Speed = (typeof SPEEDS)[number];

export type PlaybackStatus = "idle" | "playing" | "paused" | "complete" | "no-path";

export interface PlaybackState {
  /** Precomputed A* result being replayed; null until the user starts or steps. */
  readonly result: SearchResult | null;
  /** Number of trace steps shown so far (0 = nothing expanded yet). */
  readonly stepIndex: number;
  readonly status: PlaybackStatus;
  readonly speed: Speed;
}

export type PlaybackAction =
  /** `result` is required when starting from idle; it is ignored when resuming. */
  | { readonly type: "start"; readonly result?: SearchResult }
  | { readonly type: "pause" }
  /** `result` is required when stepping from idle; it is ignored otherwise. */
  | { readonly type: "step"; readonly result?: SearchResult }
  | { readonly type: "tick" }
  | { readonly type: "reset" }
  | { readonly type: "setSpeed"; readonly speed: Speed };

export type EditAction =
  | { readonly type: "setBlocked"; readonly coord: Coordinate; readonly blocked: boolean }
  | { readonly type: "moveStart"; readonly coord: Coordinate }
  | { readonly type: "moveGoal"; readonly coord: Coordinate };

/** A finished search together with the exact config it was computed from. */
export interface LoadedSearch {
  readonly config: SimulationConfig;
  readonly result: SearchResult;
}

/**
 * Start/Step carry a search computed *before* dispatch, so reducers never run A*.
 * A search whose config is not the current one is stale and is ignored.
 */
export type SimulationAction =
  | Exclude<PlaybackAction, { type: "start" | "step" }>
  | { readonly type: "start" | "step"; readonly search?: LoadedSearch }
  | EditAction;

export interface SimulationState {
  readonly config: SimulationConfig;
  readonly playback: PlaybackState;
}

/** How the search tree connects: an edge from a node's current parent to the node. */
export interface ParentLink {
  readonly from: Coordinate;
  readonly to: Coordinate;
}

export type CellRole = "frontier" | "closed" | "current" | "path";

/** What the algorithm knew after `stepNumber` expansions, read directly from the trace. */
export interface VisualState {
  readonly stepNumber: number;
  readonly totalSteps: number;
  /** Node expanded at this step. */
  readonly current: NodeSnapshot | null;
  /** Open set after this step, in priority order. */
  readonly frontier: readonly NodeSnapshot[];
  /** Closed set after this step, in expansion order. */
  readonly closed: readonly Coordinate[];
  readonly parentLinks: readonly ParentLink[];
  /** SearchResult.path, only once playback has reached the end of a successful search. */
  readonly path: readonly Coordinate[] | null;
  /** SearchResult.cost, only once playback has reached the end of a successful search. */
  readonly cost: number | null;
  /** Role of each cell keyed by `"x,y"`; precedence path > current > frontier > closed. */
  readonly cellRoles: ReadonlyMap<string, CellRole>;
}
