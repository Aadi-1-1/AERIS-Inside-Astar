import { describe, expect, it, vi } from "vitest";
import { findPath, parseMap, type SearchResult } from "../algorithm";
import { initialPlayback, playbackReducer, stepDelayMs } from "./playback";
import type { PlaybackAction, PlaybackState } from "./types";

function problem(rows: string[]) {
  const { grid, start, goal } = parseMap(rows);
  return { grid, start: start!, goal: goal! };
}

const found = findPath(problem(["S..", ".#.", "..G"]));
const noPath = findPath(problem(["S#.", "##.", "..G"]));

function run(actions: PlaybackAction[], result: SearchResult = found, state: PlaybackState = initialPlayback()) {
  const search = vi.fn(() => result);
  const final = actions.reduce((s, a) => playbackReducer(s, a, search), state);
  return { state: final, search };
}

describe("playback controller", () => {
  it("starts idle with no result and step zero", () => {
    expect(initialPlayback()).toEqual({ result: null, stepIndex: 0, status: "idle", speed: 1 });
  });

  it("Start runs the search once and begins playing from step zero", () => {
    const { state, search } = run([{ type: "start" }]);
    expect(search).toHaveBeenCalledTimes(1);
    expect(state).toMatchObject({ status: "playing", stepIndex: 0, result: found });
  });

  it("Step advances exactly one expansion and pauses", () => {
    const { state, search } = run([{ type: "step" }]);
    expect(search).toHaveBeenCalledTimes(1);
    expect(state).toMatchObject({ status: "paused", stepIndex: 1 });
    const { state: next, search: again } = run([{ type: "step" }], found, state);
    expect(again).not.toHaveBeenCalled();
    expect(next.stepIndex).toBe(2);
  });

  it("ticks advance only while playing", () => {
    const { state: playing } = run([{ type: "start" }, { type: "tick" }, { type: "tick" }]);
    expect(playing.stepIndex).toBe(2);
    const { state: paused } = run([{ type: "pause" }, { type: "tick" }, { type: "tick" }], found, playing);
    expect(paused).toMatchObject({ status: "paused", stepIndex: 2 });
    expect(paused.result).toBe(playing.result);
  });

  it("Start after Pause resumes without rerunning the search", () => {
    const { state, search } = run([{ type: "start" }, { type: "tick" }, { type: "pause" }, { type: "start" }, { type: "tick" }]);
    expect(search).toHaveBeenCalledTimes(1);
    expect(state).toMatchObject({ status: "playing", stepIndex: 2 });
  });

  it("enters complete after the last trace step and stops advancing", () => {
    const ticks = Array.from({ length: found.trace.length + 3 }, () => ({ type: "tick" }) as const);
    const { state } = run([{ type: "start" }, ...ticks]);
    expect(state).toMatchObject({ status: "complete", stepIndex: found.trace.length });
    expect(run([{ type: "step" }, { type: "start" }], found, state).state).toBe(state);
  });

  it("enters no-path when an unsuccessful trace finishes", () => {
    expect(noPath.status).toBe("no-path");
    const steps = Array.from({ length: noPath.trace.length }, () => ({ type: "step" }) as const);
    const { state } = run(steps, noPath);
    expect(state).toMatchObject({ status: "no-path", stepIndex: noPath.trace.length });
  });

  it("Reset returns to step zero with no result, keeping speed", () => {
    const { state } = run([{ type: "setSpeed", speed: 4 }, { type: "start" }, { type: "tick" }, { type: "reset" }]);
    expect(state).toEqual(initialPlayback(4));
  });

  it("changing speed never reruns the search or moves playback", () => {
    const { state: before } = run([{ type: "start" }, { type: "tick" }]);
    const { state, search } = run([{ type: "setSpeed", speed: 2 }], found, before);
    expect(search).not.toHaveBeenCalled();
    expect(state).toEqual({ ...before, speed: 2 });
    expect(stepDelayMs(2)).toBe(stepDelayMs(1) / 2);
  });
});
