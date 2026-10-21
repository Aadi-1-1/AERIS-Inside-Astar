import { describe, expect, it } from "vitest";
import { createDefaultConfig } from "../simulation/config";
import { findPath, type Coordinate, type NodeSnapshot, type SearchResult, type SearchStep } from "../algorithm";
import { explainExpansion } from "./decision";
import { formatCoord, formatCost } from "./format";

describe("explainExpansion", () => {
  const result = findPath(createDefaultConfig());

  it("describes the recorded expansion at every step, with f ≈ g + h", () => {
    for (let k = 1; k <= result.trace.length; k++) {
      const d = explainExpansion(result, k)!;
      const step = result.trace[k - 1]!;
      expect(d.node).toBe(step.expanded);
      expect(d.node.f).toBeCloseTo(d.node.g + d.node.h, 12);
      expect(d.step).toBe(k);
      expect(d.totalSteps).toBe(result.trace.length);
      if (k > 1) {
        const before = result.trace[k - 2]!.frontier;
        expect(before[0]).toEqual(d.node); // the chosen node headed the frontier
        expect(d.runnerUp).toBe(before[1] ?? null);
        expect(d.frontierSizeBefore).toBe(before.length);
      }
    }
  });

  it("step 1 expands the start, the only frontier node", () => {
    const d = explainExpansion(result, 1)!;
    expect(d).toMatchObject({ rule: "only-node", runnerUp: null, frontierSizeBefore: 1 });
    expect(d.node.g).toBe(0);
  });

  it("returns null outside the trace", () => {
    expect(explainExpansion(result, 0)).toBeNull();
    expect(explainExpansion(result, result.trace.length + 1)).toBeNull();
  });

  describe("deciding rule follows the engine's ordering (f, then h, then discovery)", () => {
    const node = (x: number, g: number, h: number, discoveryOrder: number): NodeSnapshot => ({
      coord: { x, y: 0 } as Coordinate,
      g,
      h,
      f: g + h,
      parent: null,
      discoveryOrder,
    });
    // Two-step synthetic trace: step 1's frontier is [chosen, runnerUp]; step 2 expands `chosen`.
    const ruleFor = (chosen: NodeSnapshot, runnerUp: NodeSnapshot) => {
      const step = (n: number, expanded: NodeSnapshot, frontier: NodeSnapshot[]): SearchStep => ({
        step: n,
        expanded,
        isGoal: false,
        neighbors: [],
        frontier,
        closed: [],
      });
      const trace = [step(1, node(9, 0, 5, 0), [chosen, runnerUp]), step(2, chosen, [runnerUp])];
      const fake = { status: "no-path", path: [], cost: null, trace, stats: {} } as unknown as SearchResult;
      return explainExpansion(fake, 2)!.rule;
    };

    it("lower f", () => expect(ruleFor(node(1, 2, 3, 1), node(2, 2, 4, 2))).toBe("lower-f"));
    it("f lower only at floating-point level", () =>
      expect(ruleFor(node(1, 2, 3, 1), node(2, 2 + 1e-15, 3, 2))).toBe("lower-f-precision"));
    it("f lower by more than float noise but equal after display rounding", () =>
      expect(ruleFor(node(1, 2, 3, 1), node(2, 2.0001, 3, 2))).toBe("lower-f-precision"));
    it("f lower by float noise that straddles a rounding boundary is shown as lower", () =>
      expect(ruleFor(node(1, 1.0004999999, 0, 1), node(2, 1.0005000001, 0, 2))).toBe("lower-f"));
    it("equal f, lower h", () => expect(ruleFor(node(1, 3, 2, 1), node(2, 2, 3, 2))).toBe("equal-f-lower-h"));
    it("equal f, h lower only beyond display precision", () => {
      const chosen: NodeSnapshot = { ...node(1, 0, 0, 1), g: 3.0002, h: 2, f: 5.0002 };
      const runnerUp: NodeSnapshot = { ...node(2, 0, 0, 2), g: 3, h: 2.0002, f: 5.0002 };
      expect(ruleFor(chosen, runnerUp)).toBe("equal-f-lower-h-precision");
    });
    it("equal f and h, earlier discovery", () =>
      expect(ruleFor(node(1, 2, 3, 1), node(2, 2, 3, 2))).toBe("equal-f-h-earlier-discovery"));
  });
});

describe("display formatting", () => {
  it("rounds for display only", () => {
    expect(formatCost(1)).toBe("1");
    expect(formatCost(0)).toBe("0");
    expect(formatCost(Math.SQRT2)).toBe("1.414");
    expect(formatCost(8.414213562373096)).toBe("8.414");
    expect(formatCost(19.65685424949238)).toBe("19.657");
    expect(formatCost(7.000000000000001)).toBe("7");
    expect(formatCoord({ x: 12, y: 7 })).toBe("(12, 7)");
    expect(formatCoord(null)).toBe("none");
  });
});
