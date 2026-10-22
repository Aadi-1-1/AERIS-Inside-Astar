import type { SearchResult } from "../algorithm";
import { formatCoord, formatCost } from "../inspector/format";
import type { PlaybackStatus, VisualState } from "../simulation/types";

interface Props {
  status: PlaybackStatus;
  visual: VisualState;
  result: SearchResult | null;
}

/** Live counts come from the displayed trace step; final counts from SearchResult.stats. */
export function SimulationStats({ status, visual, result }: Props) {
  const finished = (status === "complete" || status === "no-path") && result;
  const items: [string, string | number][] = finished
    ? [
        ["Expanded", result.stats.expandedNodes],
        ["Discovered", result.stats.discoveredNodes],
        ["Max frontier", result.stats.maxFrontierSize],
        ["Path cost", result.cost !== null ? formatCost(result.cost) : "–"],
        ["Path nodes", result.status === "found" ? result.path.length : "–"],
      ]
    : [
        ["Frontier", visual.frontier.length],
        ["Explored", visual.closed.length],
        ["Discovered", visual.discoveredCount],
        ["Current", visual.current ? formatCoord(visual.current.coord) : "–"],
      ];
  return (
    <dl className="stats" aria-label={finished ? "Final search statistics" : "Live search statistics"}>
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd className="mono">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
