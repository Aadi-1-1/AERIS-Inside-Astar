import type { Coordinate, SearchResult } from "../algorithm";
import type { ParentLink, VisualState } from "./types";
import { cellKey } from "./visualState";

/**
 * Motion is a presentation layer over the recorded trace. Everything here only selects
 * records the engine already wrote for the displayed SearchStep; nothing is inferred,
 * interpolated or invented, and the SearchResult is never modified.
 */

/** A recorded `improved` neighbour evaluation, as the animation layer needs it. */
export interface ImprovementMotion {
  readonly coord: Coordinate;
  readonly oldParent: Coordinate | null;
  readonly newParent: Coordinate;
  readonly oldG: number;
  readonly newG: number;
}

/** What happened during the displayed SearchStep, read from its neighbour evaluations. */
export interface StepMotion {
  /** The displayed step number (0 = nothing expanded). Used to restart one-shot animations. */
  readonly step: number;
  /** The node expanded at this step, and the parent it was expanded with. */
  readonly current: Coordinate | null;
  readonly currentParent: Coordinate | null;
  /** Neighbours recorded as `discovered` in this step. */
  readonly discovered: readonly Coordinate[];
  /** Neighbours recorded as `improved` in this step. */
  readonly improved: readonly ImprovementMotion[];
  /** Cells this step's evaluations rejected: `blocked` neighbours and the cells that blocked a diagonal. */
  readonly probedObstacles: readonly Coordinate[];
  /** Counts of every recorded evaluation kind, for the Live panel. */
  readonly counts: Readonly<Record<"discovered" | "improved" | "unchanged" | "blocked" | "corner-blocked" | "already-closed", number>>;
}

const NO_MOTION: StepMotion = {
  step: 0,
  current: null,
  currentParent: null,
  discovered: [],
  improved: [],
  probedObstacles: [],
  counts: { discovered: 0, improved: 0, unchanged: 0, blocked: 0, "corner-blocked": 0, "already-closed": 0 },
};

export function deriveStepMotion(result: SearchResult | null, stepIndex: number): StepMotion {
  const step = result?.trace[stepIndex - 1];
  if (!step) return { ...NO_MOTION, step: stepIndex };

  const discovered: Coordinate[] = [];
  const improved: ImprovementMotion[] = [];
  const probed = new Map<string, Coordinate>();
  const counts = { ...NO_MOTION.counts };
  for (const n of step.neighbors) {
    counts[n.kind]++;
    if (n.kind === "discovered") discovered.push(n.coord);
    else if (n.kind === "improved") {
      improved.push({ coord: n.coord, oldParent: n.oldParent, newParent: n.newParent, oldG: n.oldG, newG: n.newG });
    } else if (n.kind === "blocked") probed.set(cellKey(n.coord), n.coord);
    else if (n.kind === "corner-blocked") for (const c of n.blockingCells) probed.set(cellKey(c), c);
  }
  return {
    step: stepIndex,
    current: step.expanded.coord,
    currentParent: step.expanded.parent,
    discovered,
    improved,
    probedObstacles: [...probed.values()],
    counts,
  };
}

/**
 * Visual weight of one parent → child link.
 * - `current`: the link into the node being expanded now.
 * - `fresh`: a link this step created (to a neighbour just discovered or improved from the current node).
 * - `frontier`: the link into an open node, i.e. a growing tip of the search tree.
 * - `explored`: the link into a closed node.
 * - `route` / `settled`: after the search ends, links on SearchResult.path versus everything else.
 */
export type LinkTier = "current" | "fresh" | "frontier" | "explored" | "route" | "settled";

export interface TieredLink extends ParentLink {
  readonly tier: LinkTier;
  /** True when this link exists because of a recorded `improved` event in the displayed step. */
  readonly improved: boolean;
}

/** Ranks the recorded parent links for display. Links are kept, never added or re-parented. */
export function tierParentLinks(visual: VisualState, motion: StepMotion): TieredLink[] {
  const settled = visual.totalSteps > 0 && visual.stepNumber === visual.totalSteps;
  const routeEdges = new Set<string>();
  const path = visual.path ?? [];
  for (let i = 1; i < path.length; i++) routeEdges.add(`${cellKey(path[i - 1]!)}>${cellKey(path[i]!)}`);
  const fresh = new Set(motion.discovered.map(cellKey));
  const improved = new Set(motion.improved.map((m) => cellKey(m.coord)));
  for (const k of improved) fresh.add(k);
  const open = new Set(visual.frontier.map((n) => cellKey(n.coord)));
  const currentKey = visual.current ? cellKey(visual.current.coord) : null;

  return visual.parentLinks.map((link) => {
    const to = cellKey(link.to);
    let tier: LinkTier;
    if (settled) tier = routeEdges.has(`${cellKey(link.from)}>${to}`) ? "route" : "settled";
    else if (to === currentKey) tier = "current";
    else if (fresh.has(to)) tier = "fresh";
    else if (open.has(to)) tier = "frontier";
    else tier = "explored";
    return { ...link, tier, improved: !settled && improved.has(to) };
  });
}

/** Stages of the completion sequence after the final expansion of a successful search. */
export type CompletionStage = "none" | "goal-reached" | "reconstructing" | "route";

export interface CompletionTimeline {
  readonly goalReachedMs: number;
  /** Total time to walk the parent chain from goal back to start. */
  readonly reconstructMs: number;
  /** Delay between successive nodes of the chain. */
  readonly perNodeMs: number;
  /** Time to draw the final route from start to goal. */
  readonly routeDrawMs: number;
}

export function completionTimeline(pathLength: number): CompletionTimeline {
  const segments = Math.max(pathLength - 1, 1);
  const reconstructMs = Math.min(Math.max(segments * 55, 600), 1600);
  return { goalReachedMs: 550, reconstructMs, perNodeMs: reconstructMs / segments, routeDrawMs: 750 };
}

/** The stage shown when a path first appears: reduced motion skips straight to the final route. */
export function initialCompletionStage(path: readonly Coordinate[] | null, reducedMotion: boolean): CompletionStage {
  if (!path) return "none";
  return reducedMotion ? "route" : "goal-reached";
}

/**
 * The order in which path reconstruction visits nodes: goal → parent → … → start.
 * It is SearchResult.path reversed, which is exactly the stored parent chain.
 */
export function reconstructionChain(path: readonly Coordinate[]): Coordinate[] {
  return [...path].reverse();
}
