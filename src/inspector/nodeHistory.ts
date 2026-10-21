import { DIAGONAL_COST, ORTHOGONAL_COST, type Coordinate, type NodeSnapshot, type SearchResult } from "../algorithm";

export const nodeKey = (c: Coordinate) => `${c.x},${c.y}`;

/**
 * One recorded change to a node, in trace order. `step` is the 1-based SearchStep in which
 * it happened; the start node's discovery is step 0 (it is in the open set before any expansion).
 * `node` is the node's snapshot immediately after the event.
 */
export type NodeEvent =
  | { readonly kind: "discovered"; readonly step: number; readonly node: NodeSnapshot }
  | {
      readonly kind: "improved";
      readonly step: number;
      readonly oldG: number;
      readonly newG: number;
      readonly oldF: number;
      readonly newF: number;
      readonly oldParent: Coordinate | null;
      readonly newParent: Coordinate;
      readonly node: NodeSnapshot;
    }
  | { readonly kind: "expanded"; readonly step: number; readonly node: NodeSnapshot };

/** Chronological events per node key, built once per SearchResult. */
export type NodeHistoryIndex = ReadonlyMap<string, readonly NodeEvent[]>;

/**
 * Scans the trace once and groups its discover / improve / expand records by node.
 * Only events the engine recorded appear; the trace is read, never modified.
 */
export function buildNodeHistory(result: SearchResult): NodeHistoryIndex {
  const index = new Map<string, NodeEvent[]>();
  const push = (coord: Coordinate, event: NodeEvent) => {
    const key = nodeKey(coord);
    const events = index.get(key);
    if (events) events.push(event);
    else index.set(key, [event]);
  };

  const first = result.trace[0];
  if (first) push(first.expanded.coord, { kind: "discovered", step: 0, node: first.expanded });

  for (const s of result.trace) {
    push(s.expanded.coord, { kind: "expanded", step: s.step, node: s.expanded });
    for (const n of s.neighbors) {
      if (n.kind === "discovered") {
        push(n.coord, { kind: "discovered", step: s.step, node: n.node });
      } else if (n.kind === "improved") {
        const { oldG, newG, oldF, newF, oldParent, newParent, node } = n;
        push(n.coord, { kind: "improved", step: s.step, oldG, newG, oldF, newF, oldParent, newParent, node });
      }
    }
  }
  return index;
}

export type NodeStatus = "undiscovered" | "frontier" | "current" | "explored";

export interface NodeStateAtStep {
  readonly coord: Coordinate;
  readonly status: NodeStatus;
  /** The node's values as of the displayed step; null when undiscovered. */
  readonly node: NodeSnapshot | null;
  /** Events that had happened by the displayed step, oldest first. */
  readonly events: readonly NodeEvent[];
}

/**
 * The node as A* knew it after `stepIndex` expansions (0 = before any expansion).
 * Values come from the latest event at or before that step, never from later ones,
 * so a node inspected before an improvement shows its earlier g, f and parent.
 */
export function nodeStateAt(index: NodeHistoryIndex, coord: Coordinate, stepIndex: number): NodeStateAtStep {
  const all = index.get(nodeKey(coord)) ?? [];
  // Events are chronological, so the visible ones are a prefix.
  let count = 0;
  while (count < all.length && all[count]!.step <= stepIndex) count++;
  const events = all.slice(0, count);
  const latest = events[events.length - 1];
  if (!latest) return { coord, status: "undiscovered", node: null, events };

  const expanded = events.find((e) => e.kind === "expanded");
  const status: NodeStatus = !expanded ? "frontier" : expanded.step === stepIndex ? "current" : "explored";
  return { coord, status, node: latest.node, events };
}

export interface ParentMove {
  readonly parent: Coordinate;
  /** The parent's g. A parent is always a closed node, and closed nodes' g never changes. */
  readonly parentG: number;
  readonly diagonal: boolean;
  /** 1 for orthogonal, sqrt(2) for diagonal, from the two recorded coordinates. */
  readonly moveCost: number;
}

/**
 * Explains an already-recorded parent link: parent g (from the parent's expansion record)
 * plus the cost of the single move between the two coordinates.
 */
export function parentMove(index: NodeHistoryIndex, node: NodeSnapshot): ParentMove | null {
  const parent = node.parent;
  if (!parent) return null;
  const parentExpansion = (index.get(nodeKey(parent)) ?? []).find((e) => e.kind === "expanded");
  if (!parentExpansion) return null;
  const diagonal = parent.x !== node.coord.x && parent.y !== node.coord.y;
  return { parent, parentG: parentExpansion.node.g, diagonal, moveCost: diagonal ? DIAGONAL_COST : ORTHOGONAL_COST };
}
