import { findPath, type SearchProblem, type SearchResult } from "../algorithm";
import { moveGoal, moveStart, setBlocked } from "./config";
import { initialPlayback, playbackReducer } from "./playback";
import type { SimulationAction, SimulationConfig, SimulationState } from "./types";

export function initialSimulation(config: SimulationConfig): SimulationState {
  return { config, playback: initialPlayback() };
}

/**
 * Combines map editing with playback. Any effective edit to obstacles, start or goal
 * discards the search result and returns playback to idle; edits are ignored while playing.
 * `search` is injectable so tests can count engine invocations.
 */
export function createSimulationReducer(search: (problem: SearchProblem) => SearchResult = findPath) {
  return function simulationReducer(state: SimulationState, action: SimulationAction): SimulationState {
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
      default: {
        const playback = playbackReducer(state.playback, action, () => search(state.config));
        return playback === state.playback ? state : { ...state, playback };
      }
    }
  };
}

export const simulationReducer = createSimulationReducer();
