import { useRef, useState } from "react";
import type { Coordinate } from "./algorithm";
import { DecisionPanel } from "./components/DecisionPanel";
import { Legend } from "./components/Legend";
import { PlaybackControls } from "./components/PlaybackControls";
import { SimulationGrid } from "./components/SimulationGrid";
import { SimulationStats } from "./components/SimulationStats";
import { ToolSelector } from "./components/ToolSelector";
import { nodeStateAt } from "./inspector/nodeHistory";
import type { PlaybackAction, Tool } from "./simulation/types";
import { useSimulation } from "./simulation/useSimulation";

export default function App() {
  const { state, dispatch, visual, history } = useSimulation();
  const { playback, config, selected } = state;
  const [tool, setTool] = useState<Tool>("obstacle");
  // During an obstacle drag every cell is painted to the value chosen by the first cell.
  const paintValue = useRef(true);
  const editingLocked = playback.status === "playing";
  const selectedState = selected && history ? nodeStateAt(history, selected, playback.stepIndex) : null;

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
  const handlePlayback = (action: PlaybackAction) => {
    if ((action.type === "start" || action.type === "step") && playback.status === "idle") setTool("inspect");
    if (action.type === "reset" && tool === "inspect") setTool("obstacle");
    dispatch(action);
  };

  return (
    <main className="app">
      <h1>AERIS — Inside A*</h1>
      <div className="workspace">
        <section className="simulation-area">
          <ToolSelector
            tool={tool}
            editingLocked={editingLocked}
            inspectAvailable={playback.result !== null}
            onChange={setTool}
          />
          <SimulationGrid
            config={config}
            visual={visual}
            selected={selectedState?.node ? selected : null}
            selectedParent={selectedState?.node?.parent ?? null}
            cursor={tool === "inspect" ? "pointer" : editingLocked ? "default" : "crosshair"}
            onCellPointer={handleCellPointer}
          />
          <Legend />
        </section>
        <DecisionPanel
          result={playback.result}
          history={history}
          stepIndex={playback.stepIndex}
          status={playback.status}
          visual={visual}
          selected={selected}
          onBackToLive={() => dispatch({ type: "clearSelection" })}
        />
      </div>
      <footer className="bottom-bar">
        <PlaybackControls status={playback.status} speed={playback.speed} dispatch={handlePlayback} />
        <SimulationStats status={playback.status} visual={visual} result={playback.result} />
      </footer>
    </main>
  );
}
