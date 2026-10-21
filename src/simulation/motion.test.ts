import { describe, expect, it } from "vitest";
import { findPath, parseMap, type SearchResult } from "../algorithm";
import { buildNodeHistory, nodeStateAt } from "../inspector/nodeHistory";
import { createDefaultConfig } from "./config";
import {
  completionTimeline,
  deriveStepMotion,
  initialCompletionStage,
  reconstructionChain,
  tierParentLinks,
} from "./motion";
import type { PlaybackState } from "./types";
import { cellKey, deriveVisualState } from "./visualState";

function problem(rows: string[]) {
  const { grid, start, goal } = parseMap(rows);
  return { grid, start: start!, goal: goal! };
}

const at = (result: SearchResult, stepIndex: number): PlaybackState => ({
  result,
  stepIndex,
  status: stepIndex === result.trace.length ? (result.status === "found" ? "complete" : "no-path") : "paused",
  speed: 1,
});

const defaultResult = findPath(createDefaultConfig());

/** Finds a map whose trace records at least one `improved` neighbour. */
function resultWithImprovement(): SearchResult {
  // A detour that reaches a cell first via a costly route, then finds a cheaper one.
  const candidates = [
    ["S....", ".###.", "...#.", "..#..", "....G"],
    ["......", ".####.", "S...#G", ".##...", "......"],
    ["S.........", "########..", "..........", "..........", ".........G"],
  ];
  for (const rows of candidates) {
    const r = findPath(problem(rows));
    if (r.trace.some((s) => s.neighbors.some((n) => n.kind === "improved"))) return r;
  }
  // The default map is large enough to contain improvements as well.
  return defaultResult;
}

describe("deriveStepMotion", () => {
  it("is empty before any expansion and without a result", () => {
    expect(deriveStepMotion(null, 0)).toMatchObject({ current: null, discovered: [], improved: [], probedObstacles: [] });
    expect(deriveStepMotion(defaultResult, 0)).toMatchObject({ current: null, discovered: [], improved: [] });
  });

  it("newly-discovered nodes are exactly the step's recorded `discovered` evaluations", () => {
    for (const step of defaultResult.trace) {
      const motion = deriveStepMotion(defaultResult, step.step);
      const recorded = step.neighbors.filter((n) => n.kind === "discovered").map((n) => n.coord);
      expect(motion.discovered).toEqual(recorded);
      expect(motion.current).toBe(step.expanded.coord);
      expect(motion.currentParent).toBe(step.expanded.parent);
    }
  });

  it("improvement transitions come only from recorded `improved` events, with their old and new parent and g", () => {
    const result = resultWithImprovement();
    let seen = 0;
    for (const step of result.trace) {
      const motion = deriveStepMotion(result, step.step);
      const recorded = step.neighbors.filter((n) => n.kind === "improved");
      expect(motion.improved).toHaveLength(recorded.length);
      motion.improved.forEach((m, i) => {
        const r = recorded[i]!;
        if (r.kind !== "improved") throw new Error("unreachable");
        expect(m).toEqual({ coord: r.coord, oldParent: r.oldParent, newParent: r.newParent, oldG: r.oldG, newG: r.newG });
        // The new parent is the node being expanded; the old one is a different node.
        expect(m.newParent).toEqual(step.expanded.coord);
        expect(m.oldParent).not.toEqual(m.newParent);
        expect(m.newG).toBeLessThan(m.oldG);
      });
      seen += recorded.length;
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("probed obstacles come only from blocked and corner-blocked evaluations", () => {
    const result = findPath(problem(["S.#.", "..#.", "....", "...G"]));
    for (const step of result.trace) {
      const motion = deriveStepMotion(result, step.step);
      const expected = new Set<string>();
      for (const n of step.neighbors) {
        if (n.kind === "blocked") expected.add(cellKey(n.coord));
        if (n.kind === "corner-blocked") n.blockingCells.forEach((c) => expected.add(cellKey(c)));
      }
      expect(new Set(motion.probedObstacles.map(cellKey))).toEqual(expected);
      const total = Object.values(motion.counts).reduce((a, b) => a + b, 0);
      expect(total).toBe(step.neighbors.length);
    }
  });

  it("never mutates the trace", () => {
    const result = findPath(createDefaultConfig());
    const before = JSON.stringify(result);
    for (let k = 0; k <= result.trace.length; k++) {
      const motion = deriveStepMotion(result, k);
      tierParentLinks(deriveVisualState(at(result, k)), motion);
    }
    expect(JSON.stringify(result)).toBe(before);
  });
});

describe("tierParentLinks", () => {
  it("keeps every recorded parent link, unchanged, and adds none", () => {
    for (let k = 1; k <= defaultResult.trace.length; k += 7) {
      const visual = deriveVisualState(at(defaultResult, k));
      const tiered = tierParentLinks(visual, deriveStepMotion(defaultResult, k));
      expect(tiered.map(({ from, to }) => ({ from, to }))).toEqual(visual.parentLinks);
    }
  });

  it("emphasises the current node's link and the links this step created", () => {
    const result = resultWithImprovement();
    for (let k = 2; k < result.trace.length; k++) {
      const visual = deriveVisualState(at(result, k));
      const motion = deriveStepMotion(result, k);
      const tiered = tierParentLinks(visual, motion);
      const freshTargets = new Set([...motion.discovered, ...motion.improved.map((m) => m.coord)].map(cellKey));
      for (const link of tiered) {
        const to = cellKey(link.to);
        if (to === cellKey(visual.current!.coord)) expect(link.tier).toBe("current");
        else if (freshTargets.has(to)) {
          expect(link.tier).toBe("fresh");
          // A link created this step always leaves the node being expanded.
          expect(link.from).toEqual(visual.current!.coord);
        } else expect(["frontier", "explored"]).toContain(link.tier);
        expect(link.improved).toBe(motion.improved.some((m) => cellKey(m.coord) === to));
      }
    }
  });

  it("after completion only SearchResult.path edges are route links", () => {
    if (defaultResult.status !== "found") throw new Error("default map must have a route");
    const k = defaultResult.trace.length;
    const tiered = tierParentLinks(deriveVisualState(at(defaultResult, k)), deriveStepMotion(defaultResult, k));
    const route = tiered.filter((l) => l.tier === "route");
    expect(route).toHaveLength(defaultResult.path.length - 1);
    for (const link of route) {
      const i = defaultResult.path.findIndex((c) => cellKey(c) === cellKey(link.to));
      expect(defaultResult.path[i - 1]).toEqual(link.from);
    }
    expect(tiered.every((l) => l.tier === "route" || l.tier === "settled")).toBe(true);
  });

  it("a no-path search settles without any route link", () => {
    const result = findPath(problem(["S.#..", "..#..", "###..", "....G"]));
    expect(result.status).toBe("no-path");
    const k = result.trace.length;
    const tiered = tierParentLinks(deriveVisualState(at(result, k)), deriveStepMotion(result, k));
    expect(tiered.length).toBeGreaterThan(0);
    expect(tiered.every((l) => l.tier === "settled")).toBe(true);
  });
});

describe("path reconstruction", () => {
  it("walks SearchResult.path backwards, which is the stored parent chain from goal to start", () => {
    if (defaultResult.status !== "found") throw new Error("default map must have a route");
    const chain = reconstructionChain(defaultResult.path);
    expect(chain).toEqual([...defaultResult.path].reverse());
    expect(defaultResult.path).toEqual(reconstructionChain(chain)); // input untouched

    const history = buildNodeHistory(defaultResult);
    const last = defaultResult.trace.length;
    for (let i = 0; i < chain.length - 1; i++) {
      const node = nodeStateAt(history, chain[i]!, last).node!;
      expect(node.parent).toEqual(chain[i + 1]);
    }
    expect(nodeStateAt(history, chain[chain.length - 1]!, last).node!.parent).toBeNull();
  });

  it("the visual path is SearchResult.path itself and appears only at the final step", () => {
    const k = defaultResult.trace.length;
    expect(deriveVisualState(at(defaultResult, k)).path).toBe(defaultResult.path);
    expect(deriveVisualState(at(defaultResult, k - 1)).path).toBeNull();
  });

  it("reduced motion skips the sequence but keeps the route and every search state", () => {
    const k = defaultResult.trace.length;
    const visual = deriveVisualState(at(defaultResult, k));
    expect(initialCompletionStage(visual.path, true)).toBe("route");
    expect(initialCompletionStage(visual.path, false)).toBe("goal-reached");
    expect(initialCompletionStage(null, true)).toBe("none");
    // Motion and link tiers do not depend on the preference at all.
    const motion = deriveStepMotion(defaultResult, k);
    expect(tierParentLinks(visual, motion)).toHaveLength(visual.parentLinks.length);
  });

  it("timeline is bounded and spreads the chain evenly", () => {
    for (const n of [1, 2, 10, 40, 200]) {
      const t = completionTimeline(n);
      expect(t.reconstructMs).toBeGreaterThanOrEqual(600);
      expect(t.reconstructMs).toBeLessThanOrEqual(1600);
      expect(t.perNodeMs * Math.max(n - 1, 1)).toBeCloseTo(t.reconstructMs, 6);
    }
  });
});
