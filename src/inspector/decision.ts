import type { NodeSnapshot, SearchResult } from "../algorithm";

/** Which rule of the open-set ordering (f, then h, then discovery order) ranked the chosen node first. */
export type DecidingRule =
  | "only-node" // the frontier held a single node
  | "lower-f"
  | "lower-f-precision" // f differs only beyond display precision (floating-point level)
  | "equal-f-lower-h"
  | "equal-f-h-earlier-discovery";

export interface ExpansionDecision {
  readonly step: number;
  readonly totalSteps: number;
  readonly node: NodeSnapshot;
  /** Frontier size immediately before this node was removed. */
  readonly frontierSizeBefore: number;
  /** The node that ranked second in that frontier, if any. */
  readonly runnerUp: NodeSnapshot | null;
  readonly rule: DecidingRule;
}

const DISPLAY_TOLERANCE = 1e-9;

/**
 * Explains expansion `stepIndex` using only the recorded frontier before it: the trace's
 * frontier snapshots are sorted in the engine's exact priority order, so the chosen node is
 * that frontier's head and the runner-up is its second entry. The rule reported is the first
 * comparison that separates the two, mirroring the engine's comparator.
 */
export function explainExpansion(result: SearchResult, stepIndex: number): ExpansionDecision | null {
  const step = result.trace[stepIndex - 1];
  if (!step) return null;
  // Before step 1 the open set holds only the start node.
  const before = stepIndex === 1 ? [step.expanded] : result.trace[stepIndex - 2]!.frontier;
  const node = step.expanded;
  const runnerUp = before[1] ?? null;
  return {
    step: stepIndex,
    totalSteps: result.trace.length,
    node,
    frontierSizeBefore: before.length,
    runnerUp,
    rule: decidingRule(node, runnerUp),
  };
}

function decidingRule(node: NodeSnapshot, runnerUp: NodeSnapshot | null): DecidingRule {
  if (!runnerUp) return "only-node";
  if (node.f !== runnerUp.f) {
    return Math.abs(node.f - runnerUp.f) > DISPLAY_TOLERANCE ? "lower-f" : "lower-f-precision";
  }
  if (node.h !== runnerUp.h) return "equal-f-lower-h";
  return "equal-f-h-earlier-discovery";
}
