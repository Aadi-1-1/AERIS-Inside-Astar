import { describe, expect, it, vi } from "vitest";
import { findPath } from "../algorithm";
import { createDefaultConfig, moveGoal, moveStart, setBlocked } from "./config";
import { createSimulationReducer, initialSimulation } from "./controller";
import { initialPlayback } from "./playback";
import type { SimulationAction, SimulationState } from "./types";

function setup() {
  const search = vi.fn(findPath);
  const reducer = createSimulationReducer(search);
  const apply = (state: SimulationState, ...actions: SimulationAction[]) => actions.reduce(reducer, state);
  return { search, apply, initial: initialSimulation(createDefaultConfig()) };
}

describe("simulation controller: invalidation", () => {
  const edits: [string, SimulationAction][] = [
    ["toggling an obstacle", { type: "setBlocked", coord: { x: 5, y: 5 }, blocked: true }],
    ["moving the start", { type: "moveStart", coord: { x: 2, y: 2 } }],
    ["moving the goal", { type: "moveGoal", coord: { x: 30, y: 2 } }],
  ];

  for (const [name, edit] of edits) {
    it(`${name} discards the result and returns to idle`, () => {
      const { apply, initial } = setup();
      const paused = apply(initial, { type: "setSpeed", speed: 2 }, { type: "step" }, { type: "step" });
      expect(paused.playback.result).not.toBeNull();
      const edited = apply(paused, edit);
      expect(edited.config).not.toBe(paused.config);
      expect(edited.playback).toEqual(initialPlayback(2));
    });
  }

  it("ignores edits while playing", () => {
    const { apply, initial } = setup();
    const playing = apply(initial, { type: "start" });
    expect(apply(playing, edits[0]![1])).toBe(playing);
  });

  it("a no-op edit keeps the existing result", () => {
    const { apply, initial } = setup();
    const paused = apply(initial, { type: "step" });
    // (11, 0) is already a wall in the default map.
    expect(apply(paused, { type: "setBlocked", coord: { x: 11, y: 0 }, blocked: true })).toBe(paused);
  });

  it("the next Start searches the edited map", () => {
    const { apply, initial, search } = setup();
    const edited = apply(initial, { type: "step" }, { type: "moveGoal", coord: { x: 30, y: 2 } }, { type: "start" });
    expect(search).toHaveBeenCalledTimes(2);
    expect(search.mock.calls[1]![0]).toBe(edited.config);
    expect(edited.playback.result).toEqual(findPath(edited.config));
  });

  it("playback actions run the engine at most once per search", () => {
    const { apply, initial, search } = setup();
    apply(
      initial,
      { type: "start" },
      { type: "tick" },
      { type: "pause" },
      { type: "step" },
      { type: "setSpeed", speed: 4 },
      { type: "start" },
      { type: "tick" },
    );
    expect(search).toHaveBeenCalledTimes(1);
  });
});

describe("config edit rules", () => {
  const config = createDefaultConfig();

  it("never blocks the start or goal", () => {
    expect(setBlocked(config, config.start, true)).toBe(config);
    expect(setBlocked(config, config.goal, true)).toBe(config);
  });

  it("toggles traversable cells without mutating the previous grid", () => {
    const next = setBlocked(config, { x: 0, y: 0 }, true);
    expect(next.grid.blocked[0]![0]).toBe(true);
    expect(config.grid.blocked[0]![0]).toBe(false);
    expect(setBlocked(next, { x: 0, y: 0 }, false).grid.blocked[0]![0]).toBe(false);
  });

  it("keeps start and goal inside the grid, traversable and distinct", () => {
    expect(moveStart(config, { x: -1, y: 0 })).toBe(config);
    expect(moveStart(config, { x: 11, y: 0 })).toBe(config); // wall
    expect(moveStart(config, config.goal)).toBe(config);
    expect(moveGoal(config, config.start)).toBe(config);
    expect(moveGoal(config, { x: 32, y: 0 })).toBe(config);
    expect(moveGoal(config, { x: 1, y: 1 }).goal).toEqual({ x: 1, y: 1 });
  });

  it("default scenario is 32x20 and needs a detour", () => {
    expect(config.grid.width).toBe(32);
    expect(config.grid.height).toBe(20);
    const result = findPath(config);
    expect(result.status).toBe("found");
    // Straight-line (octile) distance is 22 + 11*(sqrt2 - 1) ≈ 26.6; the walls force a longer route.
    expect(result.cost!).toBeGreaterThan(30);
  });
});
