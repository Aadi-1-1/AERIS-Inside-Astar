import type { ReactNode } from "react";
import type { Coordinate, NodeSnapshot, SearchResult } from "../algorithm";
import { explainExpansion, type DecidingRule, type ExpansionDecision } from "../inspector/decision";
import { formatCoord, formatCost, formatExact } from "../inspector/format";
import { nodeStateAt, parentMove, type NodeEvent, type NodeHistoryIndex, type NodeStatus } from "../inspector/nodeHistory";
import { reconstructionChain, type StepMotion } from "../simulation/motion";
import type { PlaybackStatus, VisualState } from "../simulation/types";

interface Props {
  result: SearchResult | null;
  history: NodeHistoryIndex | null;
  stepIndex: number;
  status: PlaybackStatus;
  visual: VisualState;
  motion: StepMotion;
  selected: Coordinate | null;
  onBackToLive: () => void;
}

type Mode = "live" | "inspect" | "summary";

/** Right-hand panel: INSPECT when a node is selected, else SUMMARY when finished, else LIVE. */
export function DecisionPanel({ result, history, stepIndex, status, visual, motion, selected, onBackToLive }: Props) {
  let body;
  let mode: Mode | null = "live";
  if (!result || !history) {
    mode = null;
    body = <IdleView />;
  } else if (selected) {
    mode = "inspect";
    body = <InspectView result={result} history={history} stepIndex={stepIndex} coord={selected} visual={visual} onBackToLive={onBackToLive} />;
  } else if (status === "complete" || status === "no-path") {
    mode = "summary";
    body = <SummaryView result={result} />;
  } else if (stepIndex === 0) {
    body = (
      <>
        <h2 className="panel-title">Ready to expand</h2>
        <p className="lede">The open set holds only the start node. The first expansion is about to happen.</p>
      </>
    );
  } else {
    body = <LiveView result={result} history={history} stepIndex={stepIndex} motion={motion} />;
  }
  return (
    <aside className="decision-panel" aria-label="Decision inspector">
      <ModeIndicator mode={mode} />
      {/* Keyed by mode so a mode change gets a short fade-in; values inside update in place. */}
      <div className="panel-body" key={mode ?? "idle"}>
        {body}
      </div>
    </aside>
  );
}

function ModeIndicator({ mode }: { mode: Mode | null }) {
  const modes: [Mode, string][] = [
    ["live", "Live"],
    ["inspect", "Inspect"],
    ["summary", "Summary"],
  ];
  return (
    <div className="mode-indicator">
      <span className="sr-only">Panel mode: {mode ?? "idle"}</span>
      {modes.map(([m, label]) => (
        <span key={m} className={m === mode ? "mode active" : "mode"} aria-hidden="true">
          {label}
        </span>
      ))}
    </div>
  );
}

function IdleView() {
  return (
    <>
      <h2 className="panel-title">How A* decides</h2>
      <p className="lede">A* gives every cell it finds a score, then always explores the most promising one next.</p>
      <ul className="idle-notes">
        <li>
          <strong className="mono">g</strong> distance travelled from S
        </li>
        <li>
          <strong className="mono">h</strong> estimate of the distance left to G, as if there were no walls
        </li>
        <li>
          <strong className="mono">f = g + h</strong> the score: lowest goes first
        </li>
      </ul>
      <p className="muted small">
        Cells found but not yet explored form the <strong>frontier</strong>. Each step, A* <em>expands</em> the frontier cell
        with the lowest f: it checks that cell's neighbours and scores them. Every cell remembers its <strong>parent</strong>,
        the cell it was reached from, so the route can be traced back.
      </p>
      <p className="muted small">Press Step to watch one decision, or Start to watch them all. Then click any searched cell to inspect it.</p>
    </>
  );
}

function ruleText(d: ExpansionDecision): string {
  const texts: Record<DecidingRule, string> = {
    "only-node": "It was the only cell in the frontier.",
    "lower-f": "It had the lowest f in the frontier.",
    "lower-f-precision": "Its exact f is lower than the runner-up's, though both show the same rounded value.",
    "equal-f-lower-h": "Its f exactly tied the runner-up's, so the lower h (closer to G) won.",
    "equal-f-lower-h-precision":
      "Its f exactly tied the runner-up's. Its exact h is lower, though both show the same rounded value.",
    "equal-f-h-earlier-discovery": "Its f and h exactly tied the runner-up's, so the cell found first won.",
  };
  return texts[d.rule];
}

/** For the `-precision` rules, shows where the exact values differ. */
function exactNote(d: ExpansionDecision): string | null {
  if (!d.runnerUp) return null;
  const key = d.rule === "lower-f-precision" ? "f" : d.rule === "equal-f-lower-h-precision" ? "h" : null;
  if (!key) return null;
  const a = d.node[key];
  const b = d.runnerUp[key];
  if (Math.abs(a - b) < 1e-9) return "The difference is under 10⁻⁹: floating-point rounding. A* compares exact values.";
  return `Exact ${key}: ${formatExact(a)} vs ${formatExact(b)}.`;
}

function LiveView({
  result,
  history,
  stepIndex,
  motion,
}: {
  result: SearchResult;
  history: NodeHistoryIndex;
  stepIndex: number;
  motion: StepMotion;
}) {
  const decision = explainExpansion(result, stepIndex)!;
  const { node, runnerUp } = decision;
  const note = exactNote(decision);
  return (
    <>
      <p className="eyebrow">
        Expansion {decision.step} of {decision.totalSteps}
      </p>
      <h2 className="panel-title">
        Expanding <span className="mono coord">{formatCoord(node.coord)}</span>
      </h2>
      <CostEquation node={node} />
      <ParentLine history={history} node={node} />

      <Section title="Why this node?">
        <p className="ordering mono">lowest f → lowest h → earliest discovery</p>
        <p>{ruleText(decision)}</p>
        {note && <p className="muted small">{note}</p>}
        {runnerUp && (
          <p className="runner-up">
            <span className="muted">Runner-up</span> <span className="mono">{formatCoord(runnerUp.coord)}</span>
            <span className="mono muted">
              {" "}
              f {formatCost(runnerUp.f)} · h {formatCost(runnerUp.h)}
            </span>
          </p>
        )}
      </Section>

      <Section title="Neighbours this step">
        <NeighbourCounts motion={motion} />
        {motion.improved.map((m) => (
          <div className="event-card" key={`${m.coord.x},${m.coord.y}`}>
            <p className="event-title">
              Cheaper path to <span className="mono">{formatCoord(m.coord)}</span>
            </p>
            <p className="mono small">
              parent {formatCoord(m.oldParent)} → {formatCoord(m.newParent)}
              <br />g {formatCost(m.oldG)} → {formatCost(m.newG)}
            </p>
          </div>
        ))}
      </Section>
    </>
  );
}

function NeighbourCounts({ motion }: { motion: StepMotion }) {
  const c = motion.counts;
  const items: [string, number][] = [
    ["discovered", c.discovered],
    ["cheaper path", c.improved],
    ["no cheaper path", c.unchanged],
    ["already explored", c["already-closed"]],
    ["blocked", c.blocked + c["corner-blocked"]],
  ];
  const shown = items.filter(([, n]) => n > 0);
  if (shown.length === 0) return <p className="muted small">This is the goal, so the search stops here.</p>;
  return (
    <ul className="chips">
      {shown.map(([label, n]) => (
        <li key={label} className={label === "cheaper path" ? "chip chip-accent" : "chip"}>
          <span className="mono">{n}</span> {label}
        </li>
      ))}
    </ul>
  );
}

const STATUS_TEXT: Record<NodeStatus, [string, string]> = {
  undiscovered: ["Undiscovered", "Not yet seen by the search."],
  frontier: ["Frontier", "Found, waiting to be expanded."],
  current: ["Current", "Being expanded at this step."],
  explored: ["Explored", "Already expanded."],
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
  const [statusLabel, statusDetail] = STATUS_TEXT[state.status];
  return (
    <>
      <div className="panel-header">
        <p className="eyebrow">
          Step {stepIndex} of {result.trace.length}
        </p>
        <button className="btn btn-small btn-quiet" onClick={onBackToLive}>
          ← Back to Live
        </button>
      </div>
      <h2 className="panel-title">
        Node <span className="mono coord">{formatCoord(coord)}</span>
      </h2>
      <p className="status-line">
        <span className={`status-badge status-${state.status}`}>{statusLabel}</span>
        {onPath && <span className="status-badge status-route">On final route</span>}
      </p>
      <p className="muted small">{statusDetail}</p>
      {state.node ? (
        <>
          <Section title="Cost">
            <CostEquation node={state.node} />
          </Section>
          <Section title="Parent">
            <ParentLine history={history} node={state.node} bare />
          </Section>
          {improvements.length > 0 && (
            <Section title="Cheaper paths found">
              {improvements.map((e) => e.kind === "improved" && <Improvement key={e.step} event={e} />)}
            </Section>
          )}
          <Section title="History up to this step">
            <ol className="timeline">
              {state.events.map((e) => (
                <li key={`${e.kind}-${e.step}`} className={`timeline-${e.kind}`}>
                  {describeEvent(e)}
                </li>
              ))}
            </ol>
          </Section>
        </>
      ) : (
        <p>This node has not been discovered at this point in the search.</p>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

/** g + h = f, laid out so the three values and the identity read at a glance. */
function CostEquation({ node }: { node: NodeSnapshot }) {
  return (
    <div className="equation" role="group" aria-label={`g ${formatCost(node.g)} plus h ${formatCost(node.h)} equals f ${formatCost(node.f)}`}>
      <Term label="g" hint="travelled from S" value={node.g} />
      <span className="op" aria-hidden="true">+</span>
      <Term label="h" hint="estimate to G" value={node.h} />
      <span className="op" aria-hidden="true">=</span>
      <Term label="f" hint="score, lowest first" value={node.f} emphasis />
    </div>
  );
}

function Term({ label, hint, value, emphasis }: { label: string; hint: string; value: number; emphasis?: boolean }) {
  return (
    <div className={emphasis ? "term term-f" : "term"}>
      <span className="term-label mono">{label}(n)</span>
      <span className="term-value mono">{formatCost(value)}</span>
      <span className="term-hint">{hint}</span>
    </div>
  );
}

function ParentLine({ history, node, bare }: { history: NodeHistoryIndex; node: NodeSnapshot; bare?: boolean }) {
  const move = parentMove(history, node);
  if (!move) return <p className="muted small">No parent: this is the start node, g = 0.</p>;
  return (
    <div className="parent-calc">
      <p className="parent-label">
        {!bare && <span className="muted">Parent </span>}
        <span className="mono">{formatCoord(move.parent)}</span>
      </p>
      <p className="formula mono">
        <span className="muted">parent g + {move.diagonal ? "diagonal √2" : "orthogonal 1"} = g</span>
        <br />
        {formatCost(move.parentG)} + {formatCost(move.moveCost)} = {formatCost(node.g)}
      </p>
    </div>
  );
}

function Improvement({ event }: { event: Extract<NodeEvent, { kind: "improved" }> }) {
  return (
    <div className="event-card">
      <p className="event-title">Step {event.step}</p>
      <table className="change-table mono">
        <thead>
          <tr>
            <th scope="col" />
            <th scope="col">before</th>
            <th scope="col">after</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">parent</th>
            <td>{formatCoord(event.oldParent)}</td>
            <td>{formatCoord(event.newParent)}</td>
          </tr>
          <tr>
            <th scope="row">g</th>
            <td>{formatCost(event.oldG)}</td>
            <td>{formatCost(event.newG)}</td>
          </tr>
          <tr>
            <th scope="row">f</th>
            <td>{formatCost(event.oldF)}</td>
            <td>{formatCost(event.newF)}</td>
          </tr>
        </tbody>
      </table>
    </div>
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
  const found = result.status === "found";
  const rows: [string, string | number][] = [
    ["Final cost", result.cost !== null ? formatCost(result.cost) : "–"],
    ["Path nodes", found ? result.path.length : "–"],
    ["Expanded nodes", stats.expandedNodes],
    ["Discovered nodes", stats.discoveredNodes],
    ["Max frontier size", stats.maxFrontierSize],
  ];
  return (
    <>
      <p className={`outcome ${found ? "outcome-found" : "outcome-none"}`}>
        <span className="status-dot" aria-hidden="true" />
        {found ? "Route found" : "No valid route found"}
      </p>
      <h2 className="panel-title">{found ? "Search complete" : "Search exhausted"}</h2>
      <p className="lede">
        {found
          ? "A* stopped as soon as it expanded G. The route was then rebuilt by following parent links from G back to S."
          : "The frontier ran out before reaching G: every reachable cell was explored, so no route exists."}
      </p>
      <dl className="summary-list">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className="mono">{value}</dd>
          </div>
        ))}
      </dl>
      {found && (
        <details className="chain">
          <summary>Parent chain (goal → start)</summary>
          <p className="mono small">{reconstructionChain(result.path).map(formatCoord).join(" → ")}</p>
        </details>
      )}
      <p className="muted small">With the Inspect tool, click any explored or frontier cell to see its values and history.</p>
    </>
  );
}
