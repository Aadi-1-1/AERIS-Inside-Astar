import type { SearchResult } from "../algorithm";
import { formatCost } from "../inspector/format";
import type { CompletionStage } from "../simulation/motion";
import type { PlaybackStatus } from "../simulation/types";

interface Props {
  status: PlaybackStatus;
  stage: CompletionStage;
  result: SearchResult | null;
}

/** One-line search state. The completion wording follows the reconstruction stage, never the search. */
export function SearchStatus({ status, stage, result }: Props) {
  let tone = "neutral";
  let text: string;
  switch (status) {
    case "idle":
      text = "Ready — edit the map or press Start";
      break;
    case "playing":
      tone = "active";
      text = "Searching";
      break;
    case "paused":
      tone = "paused";
      text = "Paused";
      break;
    case "no-path":
      tone = "warning";
      text = "No valid route found";
      break;
    case "complete":
      tone = "success";
      text =
        stage === "route" && result?.cost != null
          ? `Route found · cost ${formatCost(result.cost)}`
          : stage === "reconstructing"
            ? "Goal reached · rebuilding route from parents"
            : "Goal reached";
      break;
  }
  return (
    <p className={`search-status tone-${tone}`} role="status">
      <span className="status-dot" aria-hidden="true" />
      {text}
    </p>
  );
}
