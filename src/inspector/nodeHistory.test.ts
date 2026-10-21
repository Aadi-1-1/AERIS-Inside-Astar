import { describe, expect, it } from "vitest";
import { findPath, parseMap, type Coordinate, type NodeSnapshot } from "../algorithm";
import { deriveVisualState } from "../simulation/visualState";
import { buildNodeHistory, nodeKey, nodeStateAt, parentMove } from "./nodeHistory";

function problem(rows: string[]) {
  const { grid, start, goal } = parseMap(rows);
  return { grid, start: start!, goal: goal! };
}

// Same map as the engine's "better parent" test: (1,3) is discovered via (2,2) with g = 2√2
// and later improved via (1,2) to g = 2.
const IMPROVE_MAP = ["...#...", ".S.#...", "...#.G.", "......."];
const result = findPath(problem(IMPROVE_MAP));
const index = buildNodeHistory(result);
const improvedEvaluations = result.trace.flatMap((s) =>
  s.neighbors.flatMap((n) => (n.kind === "improved" ? [{ step: s.step, n }] : [])),
);

describe("buildNodeHistory", () => {
  it("records exactly the trace's discover / improve / expand events, in order", () => {
    const discovered = result.trace.flatMap((s) => s.neighbors).filter((n) => n.kind === "discovered").length;
    const total = [...index.values()].reduce((sum, events) => sum + events.length, 0);
    expect(total).toBe(1 + discovered + improvedEvaluations.length + result.trace.length); // 1 = start
    for (const events of index.values()) {
      for (let i = 1; i < events.length; i++) expect(events[i]!.step).toBeGreaterThanOrEqual(events[i - 1]!.step);
      expect(events[0]!.kind).toBe("discovered");
    }
  });

  it("never fabricates improvements", () => {
    const improvedKeys = new Set(improvedEvaluations.map(({ n }) => nodeKey(n.coord)));
    for (const [key, events] of index) {
      const count = events.filter((e) => e.kind === "improved").length;
      if (!improvedKeys.has(key)) expect(count).toBe(0);
    }
    expect([...index.values()].flat().filter((e) => e.kind === "improved")).toHaveLength(improvedEvaluations.length);
  });

  it("does not mutate the trace", () => {
    const fresh = findPath(problem(IMPROVE_MAP));
    const before = structuredClone(fresh.trace);
    buildNodeHistory(fresh);
    expect(fresh.trace).toEqual(before);
  });
});

describe("nodeStateAt: temporal correctness", () => {
  it("matches the trace's frontier and closed snapshots at every step", () => {
    const allKeys = [...index.keys()];
    for (let k = 1; k <= result.trace.length; k++) {
      const step = result.trace[k - 1]!;
      const seen = new Set<string>();
      for (const f of step.frontier) {
        const state = nodeStateAt(index, f.coord, k);
        expect(state.status).toBe("frontier");
        expect(state.node).toEqual(f);
        seen.add(nodeKey(f.coord));
      }
      result.trace.slice(0, k).forEach((s) => {
        const state = nodeStateAt(index, s.expanded.coord, k);
        expect(state.status).toBe(s.step === k ? "current" : "explored");
        expect(state.node).toEqual(s.expanded);
        seen.add(nodeKey(s.expanded.coord));
      });
      for (const key of allKeys.filter((key) => !seen.has(key))) {
        const [x, y] = key.split(",").map(Number);
        expect(nodeStateAt(index, { x: x!, y: y! }, k).status).toBe("undiscovered");
      }
    }
  });

  it("agrees with the grid's cell roles (frontier / current / explored / undiscovered)", () => {
    const toRole = { frontier: "frontier", current: "current", explored: "closed", undiscovered: undefined } as const;
    for (let k = 1; k < result.trace.length; k++) {
      const visual = deriveVisualState({ result, stepIndex: k, status: "paused", speed: 1 });
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 7; x++) {
          const state = nodeStateAt(index, { x, y }, k);
          expect(visual.cellRoles.get(`${x},${y}`)).toBe(toRole[state.status]);
        }
      }
    }
  });

  it("shows pre-improvement values before the improvement and new values after it", () => {
    const { step, n } = improvedEvaluations[0]!;
    expect(n.coord).toEqual({ x: 1, y: 3 });
    const before = nodeStateAt(index, n.coord, step - 1);
    const after = nodeStateAt(index, n.coord, step);
    expect(before.node!.g).toBeCloseTo(2 * Math.SQRT2, 12);
    expect(before.node!.parent).toEqual({ x: 2, y: 2 });
    expect(after.node!.g).toBeCloseTo(2, 12);
    expect(after.node!.parent).toEqual({ x: 1, y: 2 });
    expect(after.node!.f).toBeLessThan(before.node!.f);
    expect(before.events.some((e) => e.kind === "improved")).toBe(false);
  });

  it("reports the improvement exactly as the trace recorded it", () => {
    const { step, n } = improvedEvaluations[0]!;
    const event = nodeStateAt(index, n.coord, step).events.find((e) => e.kind === "improved");
    expect(event).toEqual({
      kind: "improved",
      step,
      oldG: n.oldG,
      newG: n.newG,
      oldF: n.oldF,
      newF: n.newF,
      oldParent: n.oldParent,
      newParent: n.newParent,
      node: n.node,
    });
  });

  it("treats blocked and never-reached cells as undiscovered", () => {
    expect(nodeStateAt(index, { x: 3, y: 0 }, result.trace.length).status).toBe("undiscovered"); // wall
    expect(nodeStateAt(index, result.trace[0]!.expanded.coord, 0).status).toBe("frontier"); // start before step 1
  });
});

describe("parentMove", () => {
  const snapshot = (coord: Coordinate, parent: Coordinate | null, g: number): NodeSnapshot => ({
    coord,
    parent,
    g,
    h: 0,
    f: g,
    discoveryOrder: 1,
  });

  it("uses cost 1 for orthogonal and sqrt(2) for diagonal moves", () => {
    const start = result.trace[0]!.expanded.coord; // (1,1)
    const orth = parentMove(index, snapshot({ x: start.x + 1, y: start.y }, start, 1))!;
    const diag = parentMove(index, snapshot({ x: start.x + 1, y: start.y + 1 }, start, Math.SQRT2))!;
    expect(orth).toMatchObject({ diagonal: false, moveCost: 1, parentG: 0 });
    expect(diag).toMatchObject({ diagonal: true, moveCost: Math.SQRT2, parentG: 0 });
  });

  it("returns null for the start node", () => {
    expect(parentMove(index, result.trace[0]!.expanded)).toBeNull();
  });

  it("parent g + move cost reproduces the recorded g for every node at every step", () => {
    for (let k = 1; k <= result.trace.length; k++) {
      for (const key of index.keys()) {
        const [x, y] = key.split(",").map(Number);
        const state = nodeStateAt(index, { x: x!, y: y! }, k);
        if (!state.node?.parent) continue;
        const move = parentMove(index, state.node)!;
        expect(move.parentG + move.moveCost).toBeCloseTo(state.node.g, 9);
      }
    }
  });
});
