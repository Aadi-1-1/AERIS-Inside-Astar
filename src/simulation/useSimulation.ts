import { useCallback, useEffect, useMemo, useReducer } from "react";
import { buildNodeHistory } from "../inspector/nodeHistory";
import { createDefaultConfig } from "./config";
import { initialSimulation, prepareAction, simulationReducer } from "./controller";
import { stepDelayMs } from "./playback";
import type { SimulationAction } from "./types";
import { deriveVisualState } from "./visualState";

/** React binding for the simulation controller: state, dispatch, derived views and the playback timer. */
export function useSimulation() {
  const [state, rawDispatch] = useReducer(simulationReducer, undefined, () => initialSimulation(createDefaultConfig()));
  const { status, stepIndex, speed } = state.playback;

  // A* runs here, in the event handler, exactly once per Start/Step that needs it. The reducer
  // only receives the finished result, so StrictMode replaying it cannot rerun the search.
  const dispatch = useCallback((action: SimulationAction) => rawDispatch(prepareAction(state, action)), [state]);

  useEffect(() => {
    if (status !== "playing") return;
    const timer = window.setTimeout(() => rawDispatch({ type: "tick" }), stepDelayMs(speed));
    return () => window.clearTimeout(timer);
  }, [status, stepIndex, speed]);

  const visual = useMemo(() => deriveVisualState(state.playback), [state.playback]);
  // Per-node history is indexed once per search result, not rescanned on every render.
  const { result } = state.playback;
  const history = useMemo(() => (result ? buildNodeHistory(result) : null), [result]);

  return { state, dispatch, visual, history };
}
