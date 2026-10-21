import { useEffect, useMemo, useReducer } from "react";
import { createDefaultConfig } from "./config";
import { initialSimulation, simulationReducer } from "./controller";
import { stepDelayMs } from "./playback";
import { deriveVisualState } from "./visualState";

/** React binding for the simulation controller: state, dispatch, derived view and the playback timer. */
export function useSimulation() {
  const [state, dispatch] = useReducer(simulationReducer, undefined, () => initialSimulation(createDefaultConfig()));
  const { status, stepIndex, speed } = state.playback;

  useEffect(() => {
    if (status !== "playing") return;
    const timer = window.setTimeout(() => dispatch({ type: "tick" }), stepDelayMs(speed));
    return () => window.clearTimeout(timer);
  }, [status, stepIndex, speed]);

  const visual = useMemo(() => deriveVisualState(state.playback), [state.playback]);

  return { state, dispatch, visual };
}
