import type { Coordinate } from "../algorithm";
import type { CellRole, ParentLink, PlaybackState, VisualState } from "./types";

export const cellKey = (c: Coordinate) => `${c.x},${c.y}`;

const EMPTY: VisualState = {
  stepNumber: 0,
  totalSteps: 0,
  current: null,
  frontier: [],
  closed: [],
  parentLinks: [],
  path: null,
  cost: null,
  cellRoles: new Map(),
};

/**
 * Reads the algorithm's state after `stepIndex` expansions straight from the trace.
 * Nothing here computes costs, frontier membership, parents or routes; it only selects
 * and re-indexes data the engine already recorded. The trace is never mutated.
 */
export function deriveVisualState(playback: PlaybackState): VisualState {
  const { result, stepIndex } = playback;
  if (!result) return EMPTY;
  const totalSteps = result.trace.length;
  if (stepIndex === 0) return { ...EMPTY, totalSteps };

  const step = result.trace[stepIndex - 1]!;
  const finished = stepIndex === totalSteps;
  const path = finished && result.status === "found" ? result.path : null;

  // Expanded snapshots carry the parent each closed node was expanded with (fixed once closed);
  // frontier snapshots carry each open node's current best parent.
  const parentLinks: ParentLink[] = [];
  for (const node of [...result.trace.slice(0, stepIndex).map((s) => s.expanded), ...step.frontier]) {
    if (node.parent) parentLinks.push({ from: node.parent, to: node.coord });
  }

  const cellRoles = new Map<string, CellRole>();
  for (const c of step.closed) cellRoles.set(cellKey(c), "closed");
  for (const n of step.frontier) cellRoles.set(cellKey(n.coord), "frontier");
  cellRoles.set(cellKey(step.expanded.coord), "current");
  for (const c of path ?? []) cellRoles.set(cellKey(c), "path");

  return {
    stepNumber: stepIndex,
    totalSteps,
    current: step.expanded,
    frontier: step.frontier,
    closed: step.closed,
    parentLinks,
    path,
    cost: path ? result.cost : null,
    cellRoles,
  };
}
