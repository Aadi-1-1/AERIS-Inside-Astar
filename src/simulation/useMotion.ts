import { useEffect, useState } from "react";
import type { Coordinate } from "../algorithm";
import { completionTimeline, initialCompletionStage, type CompletionStage } from "./motion";

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

/** Tracks the user's reduced-motion preference. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia(REDUCED_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(REDUCED_QUERY);
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * Plays goal-reached → reconstructing → route once per found path. The path itself is
 * SearchResult.path (via VisualState); this hook only decides how much of the sequence is shown.
 */
export function useCompletionStage(path: readonly Coordinate[] | null, reducedMotion: boolean): CompletionStage {
  const [progress, setProgress] = useState<{ path: readonly Coordinate[] | null; stage: CompletionStage }>({
    path: null,
    stage: "none",
  });

  useEffect(() => {
    const first = initialCompletionStage(path, reducedMotion);
    setProgress({ path, stage: first });
    if (!path || first === "route") return;
    const t = completionTimeline(path.length);
    const timers = [
      window.setTimeout(() => setProgress({ path, stage: "reconstructing" }), t.goalReachedMs),
      window.setTimeout(() => setProgress({ path, stage: "route" }), t.goalReachedMs + t.reconstructMs),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [path, reducedMotion]);

  // Until the effect catches up with a new path, show that path's first stage (never a stale one).
  return progress.path === path ? progress.stage : initialCompletionStage(path, reducedMotion);
}
