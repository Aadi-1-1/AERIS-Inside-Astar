import { useEffect, useMemo, useRef, useState } from "react";
import type { Coordinate } from "./algorithm";
import { DecisionPanel } from "./components/DecisionPanel";
import { Legend } from "./components/Legend";
import { PlaybackControls } from "./components/PlaybackControls";
import { SearchStatus } from "./components/SearchStatus";
import { SimulationGrid } from "./components/SimulationGrid";
import { SimulationStats } from "./components/SimulationStats";
import { ToolSelector } from "./components/ToolSelector";
import { nodeStateAt } from "./inspector/nodeHistory";
import { deriveStepMotion, tierParentLinks } from "./simulation/motion";
import type { PlaybackAction, Tool } from "./simulation/types";
import { useCompletionStage, usePrefersReducedMotion } from "./simulation/useMotion";
import { useSimulation } from "./simulation/useSimulation";

interface Props {
  /** False while another page is shown; a running search is paused rather than left playing unseen. */
  active?: boolean;
}

export default function App({ active = true }: Props) {
  const { state, dispatch, visual, history } = useSimulation();
  const { playback, config, selected } = state;
  const [tool, setTool] = useState<Tool>("obstacle");
  // During an obstacle drag every cell is painted to the value chosen by the first cell.
  const paintValue = useRef(true);
  const editingLocked = playback.status === "playing";
  const selectedState = selected && history ? nodeStateAt(history, selected, playback.stepIndex) : null;

  // Animation inputs are read from the displayed SearchStep; A* is never rerun for visuals.
  const motion = useMemo(() => deriveStepMotion(playback.result, playback.stepIndex), [playback.result, playback.stepIndex]);
  const links = useMemo(() => tierParentLinks(visual, motion), [visual, motion]);
  const reducedMotion = usePrefersReducedMotion();
  const stage = useCompletionStage(visual.path, reducedMotion);

  const handleCellPointer = (coord: Coordinate, phase: "down" | "drag") => {
    if (tool === "inspect") {
      if (phase !== "down" || !history) return;
      // Clicking a node discovered at the displayed step inspects it; anything else returns to Live.
      const discovered = nodeStateAt(history, coord, playback.stepIndex).status !== "undiscovered";
      dispatch(discovered ? { type: "select", coord } : { type: "clearSelection" });
      return;
    }
    if (editingLocked) return;
    if (tool === "obstacle") {
      if (phase === "down") paintValue.current = !config.grid.blocked[coord.y]![coord.x];
      dispatch({ type: "setBlocked", coord, blocked: paintValue.current });
    } else if (phase === "down") {
      dispatch({ type: tool === "start" ? "moveStart" : "moveGoal", coord });
    }
  };

  // Loading a search switches to Inspect so clicks cannot accidentally edit (and discard) it;
  // Reset returns to editing.
  const playing = playback.status === "playing";
  useEffect(() => {
    if (!active && playing) dispatch({ type: "pause" });
  }, [active, playing, dispatch]);

  const handlePlayback = (action: PlaybackAction) => {
    if ((action.type === "start" || action.type === "step") && playback.status === "idle") setTool("inspect");
    if (action.type === "reset" && tool === "inspect") setTool("obstacle");
    dispatch(action);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1 className="sr-only">A* simulation</h1>
          <p className="subtitle">
            Watch A* search a grid one expansion at a time. Every frame is replayed from the engine's recorded trace.
          </p>
        </div>
      </header>

      <main className="workspace">
        <section className="simulation" aria-label="Simulation">
          <div className="sim-toolbar">
            <ToolSelector
              tool={tool}
              editingLocked={editingLocked}
              inspectAvailable={playback.result !== null}
              onChange={setTool}
            />
            <SearchStatus status={playback.status} stage={stage} result={playback.result} />
          </div>

          <div className="grid-frame">
            <SimulationGrid
              config={config}
              visual={visual}
              motion={motion}
              links={links}
              status={playback.status}
              stage={stage}
              selected={selectedState?.node ? selected : null}
              selectedParent={selectedState?.node?.parent ?? null}
              cursor={tool === "inspect" ? "pointer" : editingLocked ? "default" : "crosshair"}
              onCellPointer={handleCellPointer}
            />
            {playback.status === "no-path" && (
              <div className="grid-banner" aria-hidden="true">
                <strong>No valid route found</strong>
                <span>The frontier emptied after {visual.totalSteps} expansions without reaching the goal.</span>
              </div>
            )}
          </div>

          <PlaybackControls
            status={playback.status}
            speed={playback.speed}
            stepNumber={visual.stepNumber}
            totalSteps={visual.totalSteps}
            dispatch={handlePlayback}
          />

          <div className="sim-footer">
            <SimulationStats status={playback.status} visual={visual} result={playback.result} />
            <Legend />
          </div>
        </section>

        <DecisionPanel
          result={playback.result}
          history={history}
          stepIndex={playback.stepIndex}
          status={playback.status}
          visual={visual}
          motion={motion}
          selected={selected}
          onBackToLive={() => dispatch({ type: "clearSelection" })}
        />
      </main>
    </div>
  );
}
