import type { Coordinate, NodeSnapshot, SearchResult } from "../algorithm";
import { explainExpansion, type DecidingRule } from "../inspector/decision";
import { formatCoord, formatCost } from "../inspector/format";
import { nodeStateAt, parentMove, type NodeEvent, type NodeHistoryIndex, type NodeStatus } from "../inspector/nodeHistory";
import type { PlaybackStatus, VisualState } from "../simulation/types";

interface Props {
  result: SearchResult | null;
  history: NodeHistoryIndex | null;
  stepIndex: number;
  status: PlaybackStatus;
  visual: VisualState;
  selected: Coordinate | null;
  onBackToLive: () => void;
}

/** Right-hand panel: INSPECT when a node is selected, else SUMMARY when finished, else LIVE. */
export function DecisionPanel({ result, history, stepIndex, status, visual, selected, onBackToLive }: Props) {
  let body;
  if (!result || !history) {
    body = <IdleView />;
  } else if (selected) {
    body = <InspectView result={result} history={history} stepIndex={stepIndex} coord={selected} visual={visual} onBackToLive={onBackToLive} />;
  } else if (status === "complete" || status === "no-path") {
    body = <SummaryView result={result} />;
  } else if (stepIndex === 0) {
    body = <p>The open set holds only the start node. The first expansion is about to happen.</p>;
  } else {
    body = <LiveView result={result} history={history} stepIndex={stepIndex} />;
  }
  return <aside className="decision-panel">{body}</aside>;
}

function IdleView() {
  return (
    <>
      <h2>Decision panel</h2>
      <p>Press Start or Step to run A*. This panel then explains each expansion using the recorded search trace.</p>
      <p>While a search is loaded, pick the Inspect tool and click a coloured cell to see that node.</p>
    </>
  );
}

const RULE_TEXT: Record<DecidingRule, string> = {
  "only-node": "It was the only node in the frontier.",
  "lower-f": "It had the lowest f in the frontier.",
  "lower-f-precision":
    "Its f equals the runner-up's to display precision; the exact floating-point f is marginally lower, and the ordering compares exact values.",
  "equal-f-lower-h": "Its f tied with the runner-up, so the lower h decided.",
  "equal-f-h-earlier-discovery": "Its f and h tied with the runner-up, so the earlier-discovered node went first.",
};

function LiveView({ result, history, stepIndex }: { result: SearchResult; history: NodeHistoryIndex; stepIndex: number }) {
  const decision = explainExpansion(result, stepIndex)!;
  const { node, runnerUp } = decision;
  return (
    <>
      <p className="panel-mode">LIVE</p>
      <h2>Current expansion</h2>
      <p className="node-coord">{formatCoord(node.coord)}</p>
      <Values node={node} />
      <ParentLine history={history} node={node} />

      <h3>Why this node?</h3>
      <p>
        A* removed this node from the frontier because it ranked first under this implementation's priority order:
      </p>
      <p className="ordering">lowest f → lowest h → earliest discovery</p>
      <p>{RULE_TEXT[decision.rule]}</p>
      {runnerUp && (
        <p>
          Runner-up: {formatCoord(runnerUp.coord)} with f = {formatCost(runnerUp.f)}, h = {formatCost(runnerUp.h)}.
        </p>
      )}
      <p>
        Expansion {decision.step} of {decision.totalSteps}. The frontier held {decision.frontierSizeBefore}{" "}
        {decision.frontierSizeBefore === 1 ? "node" : "nodes"} before this expansion.
      </p>
    </>
  );
}

const STATUS_TEXT: Record<NodeStatus, string> = {
  undiscovered: "Undiscovered",
  frontier: "Frontier (open, waiting to be expanded)",
  current: "Current (being expanded at this step)",
  explored: "Explored (closed)",
};

function InspectView({
  result,
  history,
  stepIndex,
  coord,
  visual,
  onBackToLive,
}: {
  result: SearchResult;
  history: NodeHistoryIndex;
  stepIndex: number;
  coord: Coordinate;
  visual: VisualState;
  onBackToLive: () => void;
}) {
  const state = nodeStateAt(history, coord, stepIndex);
  const onPath = visual.path?.some((c) => c.x === coord.x && c.y === coord.y) ?? false;
  const improvements = state.events.filter((e) => e.kind === "improved");
  return (
    <>
      <div className="panel-header">
        <p className="panel-mode">INSPECT · step {stepIndex} of {result.trace.length}</p>
        <button onClick={onBackToLive}>Back to Live</button>
      </div>
      <h2>Node {formatCoord(coord)}</h2>
      <p>
        <strong>Status:</strong> {STATUS_TEXT[state.status]}
        {onPath && " · on the final path"}
      </p>
      {state.node ? (
        <>
          <Values node={state.node} />
          <ParentLine history={history} node={state.node} />
          {improvements.map((e) => e.kind === "improved" && <Improvement key={e.step} event={e} />)}
          <h3>History up to this step</h3>
          <ol className="history">
            {state.events.map((e) => (
              <li key={`${e.kind}-${e.step}`}>{describeEvent(e)}</li>
            ))}
          </ol>
        </>
      ) : (
        <p>This node has not been discovered at this point in the search.</p>
      )}
    </>
  );
}

function Values({ node }: { node: NodeSnapshot }) {
  return (
    <>
      <dl className="values">
        <dt>g(n)</dt>
        <dd>{formatCost(node.g)}</dd>
        <dt>h(n)</dt>
        <dd>{formatCost(node.h)}</dd>
        <dt>f(n)</dt>
        <dd>{formatCost(node.f)}</dd>
      </dl>
      <p className="formula">
        f = g + h → {formatCost(node.f)} = {formatCost(node.g)} + {formatCost(node.h)}
      </p>
    </>
  );
}

function ParentLine({ history, node }: { history: NodeHistoryIndex; node: NodeSnapshot }) {
  const move = parentMove(history, node);
  if (!move) return <p><strong>Parent:</strong> none (this is the start node, g = 0)</p>;
  return (
    <>
      <p>
        <strong>Parent:</strong> {formatCoord(move.parent)}
      </p>
      <p className="formula">
        parent g + {move.diagonal ? "diagonal move (√2)" : "orthogonal move (1)"} = node g
        <br />
        {formatCost(move.parentG)} + {formatCost(move.moveCost)} = {formatCost(node.g)}
      </p>
    </>
  );
}

function Improvement({ event }: { event: Extract<NodeEvent, { kind: "improved" }> }) {
  return (
    <section className="improvement">
      <h3>Cheaper path found (step {event.step})</h3>
      <dl>
        <dt>Previous parent</dt>
        <dd>{formatCoord(event.oldParent)}</dd>
        <dt>New parent</dt>
        <dd>{formatCoord(event.newParent)}</dd>
        <dt>Previous g</dt>
        <dd>{formatCost(event.oldG)}</dd>
        <dt>New g</dt>
        <dd>{formatCost(event.newG)}</dd>
        <dt>Previous f</dt>
        <dd>{formatCost(event.oldF)}</dd>
        <dt>New f</dt>
        <dd>{formatCost(event.newF)}</dd>
      </dl>
    </section>
  );
}

function describeEvent(e: NodeEvent): string {
  switch (e.kind) {
    case "discovered":
      return e.step === 0
        ? "Start node: placed in the frontier with g = 0."
        : `Step ${e.step}: discovered from ${formatCoord(e.node.parent)}, g = ${formatCost(e.node.g)}.`;
    case "improved":
      return `Step ${e.step}: cheaper path via ${formatCoord(e.newParent)}, g ${formatCost(e.oldG)} → ${formatCost(e.newG)}.`;
    case "expanded":
      return `Step ${e.step}: expanded (moved to the closed set).`;
  }
}

function SummaryView({ result }: { result: SearchResult }) {
  const { stats } = result;
  return (
    <>
      <p className="panel-mode">SUMMARY</p>
      <h2>{result.status === "found" ? "Route found" : "No route"}</h2>
      {result.status === "no-path" && <p className="no-path">No valid route found.</p>}
      <dl className="values">
        <dt>Final cost</dt>
        <dd>{result.cost !== null ? formatCost(result.cost) : "–"}</dd>
        <dt>Path nodes</dt>
        <dd>{result.status === "found" ? result.path.length : "–"}</dd>
        <dt>Expanded nodes</dt>
        <dd>{stats.expandedNodes}</dd>
        <dt>Discovered nodes</dt>
        <dd>{stats.discoveredNodes}</dd>
        <dt>Max frontier size</dt>
        <dd>{stats.maxFrontierSize}</dd>
        <dt>Search steps</dt>
        <dd>{stats.steps}</dd>
      </dl>
      <p>Select the Inspect tool and click any coloured cell to inspect it.</p>
    </>
  );
}
