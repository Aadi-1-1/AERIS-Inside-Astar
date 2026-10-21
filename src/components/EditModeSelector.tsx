import type { EditMode } from "../simulation/types";

const MODES: { value: EditMode; label: string }[] = [
  { value: "obstacle", label: "Obstacle" },
  { value: "start", label: "Start" },
  { value: "goal", label: "Goal" },
];

interface Props {
  mode: EditMode;
  disabled: boolean;
  onChange: (mode: EditMode) => void;
}

export function EditModeSelector({ mode, disabled, onChange }: Props) {
  return (
    <fieldset className="edit-mode" disabled={disabled}>
      <legend>Edit mode</legend>
      {MODES.map((m) => (
        <label key={m.value}>
          <input
            type="radio"
            name="edit-mode"
            value={m.value}
            checked={mode === m.value}
            onChange={() => onChange(m.value)}
          />
          {m.label}
        </label>
      ))}
      {disabled && <span className="hint">Pause or reset to edit the map.</span>}
    </fieldset>
  );
}
