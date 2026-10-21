import { isFinished } from "../simulation/playback";
import { SPEEDS, type PlaybackAction, type PlaybackStatus, type Speed } from "../simulation/types";

interface Props {
  status: PlaybackStatus;
  speed: Speed;
  dispatch: (action: PlaybackAction) => void;
}

export function PlaybackControls({ status, speed, dispatch }: Props) {
  const finished = isFinished(status);
  return (
    <div className="controls">
      <div className="button-row">
        <button onClick={() => dispatch({ type: "start" })} disabled={status === "playing" || finished}>
          {status === "paused" ? "Resume" : "Start"}
        </button>
        <button onClick={() => dispatch({ type: "pause" })} disabled={status !== "playing"}>
          Pause
        </button>
        <button onClick={() => dispatch({ type: "step" })} disabled={finished}>
          Step
        </button>
        <button onClick={() => dispatch({ type: "reset" })} disabled={status === "idle"}>
          Reset
        </button>
      </div>
      <div className="button-row" role="group" aria-label="Speed">
        <span>Speed:</span>
        {SPEEDS.map((s) => (
          <button key={s} aria-pressed={s === speed} onClick={() => dispatch({ type: "setSpeed", speed: s })}>
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
