import type { NodeSnapshot, SearchResult } from "../algorithm";

/** Which rule of the open-set ordering (f, then h, then discovery order) ranked the chosen node first. */
export type DecidingRule =
  | "only-node" // the frontier held a single node
  | "lower-f"
  | "lower-f-precision" // exact f is lower, but both f values round to the same displayed value
  | "equal-f-lower-h"
  | "equal-f-lower-h-precision" // f exactly equal; exact h is lower, but both h values display the same
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

/**
 * Explains expansion `stepIndex` using only the recorded frontier before it: the trace's
 * frontier snapshots are sorted in the engine's exact priority order, so the chosen node is
 * that frontier's head and the runner-up is its second entry. The rule reported is the first
 * comparison that separates the two, mirroring the engine's comparator.
 *
 * Which comparison decided is always taken from the exact values. Display rounding only picks
 * the `-precision` wording, so the panel never calls two values "tied" when they are not, nor
 * claims one is lower while showing the same rounded number for both.
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
  if (node.f !== runnerUp.f) return sameOnDisplay(node.f, runnerUp.f) ? "lower-f-precision" : "lower-f";
  if (node.h !== runnerUp.h) return sameOnDisplay(node.h, runnerUp.h) ? "equal-f-lower-h-precision" : "equal-f-lower-h";
  return "equal-f-h-earlier-discovery";
}

/** True when both values round to the same 3-decimal number, the precision the panel displays. */
const sameOnDisplay = (a: number, b: number) => a.toFixed(3) === b.toFixed(3);
