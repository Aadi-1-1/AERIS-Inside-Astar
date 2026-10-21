import type { Tool } from "../simulation/types";

const TOOLS: { value: Tool; label: string }[] = [
  { value: "inspect", label: "Inspect" },
  { value: "obstacle", label: "Obstacle" },
  { value: "start", label: "Start" },
  { value: "goal", label: "Goal" },
];

interface Props {
  tool: Tool;
  /** Edit tools are locked while playback is running. */
  editingLocked: boolean;
  /** Inspect needs a loaded search. */
  inspectAvailable: boolean;
  onChange: (tool: Tool) => void;
}

/** One active tool at a time: Inspect never edits the map, and the edit tools never inspect. */
export function ToolSelector({ tool, editingLocked, inspectAvailable, onChange }: Props) {
  return (
    <fieldset className="tool-selector">
      <legend>Grid tool</legend>
      {TOOLS.map((t) => (
        <label key={t.value}>
          <input
            type="radio"
            name="grid-tool"
            value={t.value}
            checked={tool === t.value}
            disabled={t.value === "inspect" ? !inspectAvailable : editingLocked}
            onChange={() => onChange(t.value)}
          />
          {t.label}
        </label>
      ))}
      {editingLocked && <span className="hint">Pause or reset to edit the map.</span>}
    </fieldset>
  );
}
