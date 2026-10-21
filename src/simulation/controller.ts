import { findPath, type SearchProblem, type SearchResult } from "../algorithm";
import { moveGoal, moveStart, setBlocked } from "./config";
import { initialPlayback, needsSearch, playbackReducer } from "./playback";
import type { SimulationAction, SimulationConfig, SimulationState } from "./types";

export function initialSimulation(config: SimulationConfig): SimulationState {
  return { config, playback: initialPlayback() };
}

/**
 * Runs A* *before* dispatch, outside any reducer React may replay. If the action is a Start
 * or Step that needs a result, returns it with the finished search attached; otherwise
 * returns the action unchanged and never calls `search`.
 */
export function prepareAction(
  state: SimulationState,
  action: SimulationAction,
  search: (problem: SearchProblem) => SearchResult = findPath,
): SimulationAction {
  if ((action.type === "start" || action.type === "step") && !action.search && needsSearch(state.playback)) {
    return { type: action.type, search: { config: state.config, result: search(state.config) } };
  }
  return action;
}

/**
 * Pure: combines map editing with playback and never runs A*. Any effective edit to
 * obstacles, start or goal discards the search result and returns playback to idle; edits
 * are ignored while playing. A search computed for a different config is stale and ignored.
 */
export function simulationReducer(state: SimulationState, action: SimulationAction): SimulationState {
  switch (action.type) {
    case "setBlocked":
    case "moveStart":
    case "moveGoal": {
      if (state.playback.status === "playing") return state;
      const config =
        action.type === "setBlocked"
          ? setBlocked(state.config, action.coord, action.blocked)
          : action.type === "moveStart"
            ? moveStart(state.config, action.coord)
            : moveGoal(state.config, action.coord);
      if (config === state.config) return state;
      return { config, playback: initialPlayback(state.playback.speed) };
    }
    case "start":
    case "step": {
      const result = action.search?.config === state.config ? action.search.result : undefined;
      return withPlayback(state, playbackReducer(state.playback, { type: action.type, result }));
    }
    default:
      return withPlayback(state, playbackReducer(state.playback, action));
  }
}

function withPlayback(state: SimulationState, playback: SimulationState["playback"]): SimulationState {
  return playback === state.playback ? state : { ...state, playback };
}
