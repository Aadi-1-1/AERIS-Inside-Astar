import type { SearchResult } from "../algorithm";
import { formatCoord, formatCost } from "../inspector/format";
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
  result: SearchResult | null;
}

/** Live counts come from the displayed trace step; final counts from SearchResult.stats. */
export function SimulationStats({ status, visual, result }: Props) {
  const finished = (status === "complete" || status === "no-path") && result;
  return (
    <section className="stats" aria-live="polite">
      <p>
        <strong>Status:</strong> {STATUS_LABELS[status]}
        {status === "no-path" && <span className="no-path"> — No valid route found.</span>}
      </p>
      {finished ? (
        <dl>
          <dt>Steps</dt>
          <dd>{result.stats.steps}</dd>
          <dt>Expanded</dt>
          <dd>{result.stats.expandedNodes}</dd>
          <dt>Discovered</dt>
          <dd>{result.stats.discoveredNodes}</dd>
          <dt>Max frontier</dt>
          <dd>{result.stats.maxFrontierSize}</dd>
          <dt>Path cost</dt>
          <dd>{result.cost !== null ? formatCost(result.cost) : "–"}</dd>
          <dt>Path nodes</dt>
          <dd>{result.status === "found" ? result.path.length : "–"}</dd>
        </dl>
      ) : (
        <dl>
          <dt>Step</dt>
          <dd>
            {visual.stepNumber} / {visual.totalSteps || "–"}
          </dd>
          <dt>Frontier</dt>
          <dd>{visual.frontier.length}</dd>
          <dt>Explored</dt>
          <dd>{visual.closed.length}</dd>
          <dt>Discovered</dt>
          <dd>{visual.discoveredCount}</dd>
          <dt>Current node</dt>
          <dd>{visual.current ? formatCoord(visual.current.coord) : "–"}</dd>
        </dl>
      )}
    </section>
  );
}
