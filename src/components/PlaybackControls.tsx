import { isFinished } from "../simulation/playback";
import { SPEEDS, type PlaybackAction, type PlaybackStatus, type Speed } from "../simulation/types";

interface Props {
  status: PlaybackStatus;
  speed: Speed;
  stepNumber: number;
  totalSteps: number;
  dispatch: (action: PlaybackAction) => void;
}

export function PlaybackControls({ status, speed, stepNumber, totalSteps, dispatch }: Props) {
  const finished = isFinished(status);
  const progress = totalSteps > 0 ? stepNumber / totalSteps : 0;
  return (
    <div className="transport">
      <div className="transport-buttons" role="group" aria-label="Playback">
        <button
          className="btn btn-primary"
          onClick={() => dispatch({ type: "start" })}
          disabled={status === "playing" || finished}
        >
          <Icon d="M5 3.5v9l7.5-4.5z" />
          {status === "paused" ? "Resume" : "Start"}
        </button>
        <button className="btn" onClick={() => dispatch({ type: "pause" })} disabled={status !== "playing"}>
          <Icon d="M5 3.5h2v9H5zM9 3.5h2v9H9z" />
          Pause
        </button>
        <button className="btn" onClick={() => dispatch({ type: "step" })} disabled={finished}>
          <Icon d="M4 3.5v9l6-4.5zM11 3.5h1.75v9H11z" />
          Step
        </button>
        <button className="btn btn-quiet" onClick={() => dispatch({ type: "reset" })} disabled={status === "idle"}>
          <Icon d="M8 3a5 5 0 1 1-4.9 6h1.6A3.5 3.5 0 1 0 8 4.5V6.5L5 3.75 8 1z" />
          Reset
        </button>
      </div>

      <div className="progress" aria-hidden={totalSteps === 0}>
        <span className="progress-label mono">
          {totalSteps > 0 ? (
            <>
              step <strong>{stepNumber}</strong> / {totalSteps}
            </>
          ) : (
            "no search loaded"
          )}
        </span>
        <span className="progress-track">
          <span className="progress-fill" style={{ transform: `scaleX(${progress})` }} />
        </span>
      </div>

      <div className="segmented speed" role="group" aria-label="Playback speed">
        {SPEEDS.map((s) => (
          <button key={s} aria-pressed={s === speed} onClick={() => dispatch({ type: "setSpeed", speed: s })}>
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
