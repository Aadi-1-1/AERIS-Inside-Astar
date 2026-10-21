import { describe, expect, it } from "vitest";
import { findPath, parseMap } from "../algorithm";
import type { PlaybackState } from "./types";
import { cellKey, deriveVisualState } from "./visualState";

function problem(rows: string[]) {
  const { grid, start, goal } = parseMap(rows);
  return { grid, start: start!, goal: goal! };
}

const result = findPath(problem(["S...", ".##.", "...G"]));
const at = (stepIndex: number, r = result): PlaybackState => ({
  result: r,
  stepIndex,
  status: stepIndex === r.trace.length ? (r.status === "found" ? "complete" : "no-path") : "paused",
  speed: 1,
});

describe("deriveVisualState", () => {
  it("is empty before a search exists or before the first step", () => {
    const idle = deriveVisualState({ result: null, stepIndex: 0, status: "idle", speed: 1 });
    expect(idle).toMatchObject({ current: null, frontier: [], closed: [], parentLinks: [], path: null, totalSteps: 0 });
    const zero = deriveVisualState(at(0));
    expect(zero).toMatchObject({ current: null, frontier: [], path: null, totalSteps: result.trace.length });
  });

  it("frontier, explored and current match the trace step exactly", () => {
    for (let k = 1; k <= result.trace.length; k++) {
      const step = result.trace[k - 1]!;
      const visual = deriveVisualState(at(k));
      expect(visual.stepNumber).toBe(k);
      expect(visual.current).toBe(step.expanded);
      expect(visual.frontier).toBe(step.frontier);
      expect(visual.closed).toBe(step.closed);
      expect(visual.cellRoles.get(cellKey(step.expanded.coord))).toBe(k === result.trace.length ? "path" : "current");
      for (const n of step.frontier) expect(visual.cellRoles.get(cellKey(n.coord))).toBe("frontier");
      const roles = [...visual.cellRoles.values()];
      if (k < result.trace.length) {
        expect(roles.filter((r) => r === "closed")).toHaveLength(step.closed.length - 1);
        expect(roles.filter((r) => r === "frontier")).toHaveLength(step.frontier.length);
      }
    }
  });

  it("parent links come from the recorded parents of closed and frontier nodes", () => {
    const k = 3;
    const step = result.trace[k - 1]!;
    const visual = deriveVisualState(at(k));
    const recorded = [...result.trace.slice(0, k).map((s) => s.expanded), ...step.frontier]
      .filter((n) => n.parent)
      .map((n) => ({ from: n.parent, to: n.coord }));
    expect(visual.parentLinks).toEqual(recorded);
    // Every node except the start has exactly one incoming link.
    expect(visual.parentLinks).toHaveLength(step.closed.length + step.frontier.length - 1);
  });

  it("shows the returned path only once playback reaches the final step", () => {
    const last = result.trace.length;
    expect(deriveVisualState(at(last - 1)).path).toBeNull();
    const done = deriveVisualState(at(last));
    expect(done.path).toBe(result.path);
    expect(done.cost).toBe(result.cost);
    for (const c of result.path) expect(done.cellRoles.get(cellKey(c))).toBe("path");
  });

  it("never shows a path for a no-path result", () => {
    const blocked = findPath(problem(["S#.", "##.", "..G"]));
    const visual = deriveVisualState(at(blocked.trace.length, blocked));
    expect(visual.path).toBeNull();
    expect(visual.cost).toBeNull();
    expect([...visual.cellRoles.values()]).not.toContain("path");
  });

  it("does not mutate the trace", () => {
    const snapshot = structuredClone(result.trace);
    for (let k = 0; k <= result.trace.length; k++) deriveVisualState(at(k));
    expect(result.trace).toEqual(snapshot);
  });
});
