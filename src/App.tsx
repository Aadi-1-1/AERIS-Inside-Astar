import { useRef, useState } from "react";
import type { Coordinate } from "./algorithm";
import { EditModeSelector } from "./components/EditModeSelector";
import { Legend } from "./components/Legend";
import { PlaybackControls } from "./components/PlaybackControls";
import { SimulationGrid } from "./components/SimulationGrid";
import { SimulationStats } from "./components/SimulationStats";
import type { EditMode } from "./simulation/types";
import { useSimulation } from "./simulation/useSimulation";

export default function App() {
  const { state, dispatch, visual } = useSimulation();
  const [editMode, setEditMode] = useState<EditMode>("obstacle");
  // During an obstacle drag every cell is painted to the value chosen by the first cell.
  const paintValue = useRef(true);
  const editable = state.playback.status !== "playing";

  const handleCellPointer = (coord: Coordinate, phase: "down" | "drag") => {
    if (editMode === "obstacle") {
      if (phase === "down") paintValue.current = !state.config.grid.blocked[coord.y]![coord.x];
      dispatch({ type: "setBlocked", coord, blocked: paintValue.current });
    } else if (phase === "down") {
      dispatch({ type: editMode === "start" ? "moveStart" : "moveGoal", coord });
    }
  };

  return (
    <main className="app">
      <h1>AERIS — Inside A*</h1>
      <EditModeSelector mode={editMode} disabled={!editable} onChange={setEditMode} />
      <SimulationGrid config={state.config} visual={visual} editable={editable} onCellPointer={handleCellPointer} />
      <Legend />
      <PlaybackControls status={state.playback.status} speed={state.playback.speed} dispatch={dispatch} />
      <SimulationStats status={state.playback.status} visual={visual} />
    </main>
  );
}
