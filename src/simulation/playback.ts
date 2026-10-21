import type { SearchResult } from "../algorithm";
import type { PlaybackAction, PlaybackState, PlaybackStatus, Speed } from "./types";

/** Delay between automatic expansions at 1x speed. */
export const BASE_STEP_MS = 450;

export function stepDelayMs(speed: Speed): number {
  return BASE_STEP_MS / speed;
}

export function initialPlayback(speed: Speed = 1): PlaybackState {
  return { result: null, stepIndex: 0, status: "idle", speed };
}

export function isFinished(status: PlaybackStatus): boolean {
  return status === "complete" || status === "no-path";
}

/** Shows one more SearchStep; enters the terminal status after the last one. */
function advance(state: PlaybackState, result: SearchResult): PlaybackState {
  const stepIndex = Math.min(state.stepIndex + 1, result.trace.length);
  if (stepIndex < result.trace.length) return { ...state, result, stepIndex };
  return { ...state, result, stepIndex, status: result.status === "found" ? "complete" : "no-path" };
}

/** True when Start or Step must be given a freshly computed SearchResult. */
export function needsSearch(state: PlaybackState): boolean {
  return state.result === null;
}

/**
 * Pure playback transitions; never runs A*. Start or Step from idle uses the result carried
 * by the action (and is a no-op without one); every other action replays the stored trace.
 */
export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case "start":
      if (state.status === "idle") {
        return action.result ? { ...state, result: action.result, stepIndex: 0, status: "playing" } : state;
      }
      if (state.status === "paused") return { ...state, status: "playing" };
      return state;
    case "pause":
      return state.status === "playing" ? { ...state, status: "paused" } : state;
    case "step": {
      if (isFinished(state.status)) return state;
      const result = state.result ?? action.result;
      return result ? advance({ ...state, status: "paused" }, result) : state;
    }
    case "tick":
      return state.status === "playing" && state.result ? advance(state, state.result) : state;
    case "reset":
      return initialPlayback(state.speed);
    case "setSpeed":
      return { ...state, speed: action.speed };
  }
}
