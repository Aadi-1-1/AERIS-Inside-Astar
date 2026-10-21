import type { PlaybackStatus, VisualState } from "../simulation/types";

const STATUS_LABELS: Record<PlaybackStatus, string> = {
  idle: "Idle — ready to search",
  playing: "Searching…",
  paused: "Paused",
  complete: "Route found",
  "no-path": "No route",
};

interface Props {
  status: PlaybackStatus;
  visual: VisualState;
}

export function SimulationStats({ status, visual }: Props) {
  return (
    <section className="stats" aria-live="polite">
      <p>
        <strong>Status:</strong> {STATUS_LABELS[status]}
      </p>
      {status === "no-path" && <p className="no-path">No valid route found.</p>}
      <dl>
        <dt>Step</dt>
        <dd>
          {visual.stepNumber} / {visual.totalSteps || "–"}
        </dd>
        <dt>Frontier size</dt>
        <dd>{visual.frontier.length}</dd>
        <dt>Explored</dt>
        <dd>{visual.closed.length}</dd>
        <dt>Path cost</dt>
        <dd>{visual.cost !== null ? visual.cost.toFixed(3) : "–"}</dd>
        <dt>Path nodes</dt>
        <dd>{visual.path ? visual.path.length : "–"}</dd>
      </dl>
    </section>
  );
}
