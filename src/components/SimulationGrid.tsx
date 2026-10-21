import { memo, useMemo, useRef, type CSSProperties, type PointerEvent } from "react";
import type { Coordinate } from "../algorithm";
import { completionTimeline, reconstructionChain, type CompletionStage, type StepMotion, type TieredLink } from "../simulation/motion";
import type { PlaybackStatus, SimulationConfig, VisualState } from "../simulation/types";
import { cellKey } from "../simulation/visualState";

interface Props {
  config: SimulationConfig;
  visual: VisualState;
  /** Records of the displayed SearchStep that drive one-shot animations. */
  motion: StepMotion;
  links: readonly TieredLink[];
  status: PlaybackStatus;
  stage: CompletionStage;
  /** Inspected node and its parent at the displayed step, both supplied by the inspector. */
  selected: Coordinate | null;
  selectedParent: Coordinate | null;
  cursor: "crosshair" | "pointer" | "default";
  /** `drag` is fired for each further cell entered while the pointer stays down. */
  onCellPointer: (coord: Coordinate, phase: "down" | "drag") => void;
}

const center = (c: Coordinate) => ({ x: c.x + 0.5, y: c.y + 0.5 });
const points = (cs: readonly Coordinate[]) => cs.map((c) => `${c.x + 0.5},${c.y + 0.5}`).join(" ");

/** Links are drawn faint-to-strong so the emphasised ones are never buried. */
const TIER_ORDER = ["settled", "explored", "frontier", "route", "fresh", "current"] as const;

/** SVG view of the map plus the visual state. One viewBox unit = one cell. */
export function SimulationGrid(props: Props) {
  const { config, visual, motion, links, status, stage, selected, selectedParent, cursor, onCellPointer } = props;
  const { grid, start, goal } = config;
  const svgRef = useRef<SVGSVGElement>(null);
  const lastCell = useRef<string | null>(null);

  const cellAt = (event: PointerEvent<SVGSVGElement>): Coordinate | null => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * grid.width);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * grid.height);
    return x >= 0 && y >= 0 && x < grid.width && y < grid.height ? { x, y } : null;
  };

  const handleDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    const coord = cellAt(event);
    if (!coord) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    lastCell.current = cellKey(coord);
    onCellPointer(coord, "down");
  };

  const handleMove = (event: PointerEvent<SVGSVGElement>) => {
    if (lastCell.current === null) return;
    const coord = cellAt(event);
    if (!coord || cellKey(coord) === lastCell.current) return;
    lastCell.current = cellKey(coord);
    onCellPointer(coord, "drag");
  };

  const handleUp = () => {
    lastCell.current = null;
  };

  const path = visual.path;
  const chain = useMemo(() => (path ? reconstructionChain(path) : []), [path]);
  const timeline = completionTimeline(chain.length);
  const chainIndex = useMemo(() => new Map(chain.map((c, i) => [cellKey(c), i])), [chain]);

  const outcome = status === "complete" ? "found" : status === "no-path" ? "no-path" : "searching";
  const step = motion.step;

  return (
    <svg
      ref={svgRef}
      className={`grid outcome-${outcome} stage-${stage}`}
      style={{ cursor }}
      viewBox={`0 0 ${grid.width} ${grid.height}`}
      role="img"
      aria-label={describeGrid(visual, status)}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
    >
      <defs>
        <pattern id="grid-lines" width={1} height={1} patternUnits="userSpaceOnUse">
          <path d="M 1 0 V 1 H 0" className="grid-line" />
        </pattern>
        <pattern id="terrain-hatch" width={0.5} height={0.5} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={0.5} height={0.5} className="hatch-base" />
          <line x1={0} y1={0} x2={0} y2={0.5} className="hatch-line" />
        </pattern>
      </defs>
      <rect className="grid-backdrop" width={grid.width} height={grid.height} />

      <Cells grid={grid} visual={visual} stage={stage} chainIndex={chainIndex} perNodeMs={timeline.perNodeMs} />

      <g className="probe-layer" aria-hidden="true">
        {motion.probedObstacles.map((c) => (
          <rect key={`p-${step}-${cellKey(c)}`} className="probe" x={c.x + 0.16} y={c.y + 0.16} width={0.68} height={0.68} />
        ))}
      </g>

      <g className="parent-links" aria-hidden="true">
        {TIER_ORDER.map((tier) => (
          <g key={tier}>
            {links
              .filter((l) => l.tier === tier)
              .map(({ from, to, improved }) => {
                const a = center(from);
                const b = center(to);
                // Improved links remount per step so their draw-in animation replays for each recorded event.
                const key = improved ? `${cellKey(to)}@${step}` : cellKey(to);
                return (
                  <line
                    key={key}
                    className={`link link-${tier}${improved ? " link-improved" : ""}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    pathLength={1}
                  />
                );
              })}
          </g>
        ))}
      </g>

      <g className="motion-layer" aria-hidden="true">
        {motion.improved.map(
          (m) =>
            m.oldParent && (
              <line
                key={`ghost-${step}-${cellKey(m.coord)}`}
                className="link-ghost"
                x1={m.oldParent.x + 0.5}
                y1={m.oldParent.y + 0.5}
                x2={m.coord.x + 0.5}
                y2={m.coord.y + 0.5}
              />
            ),
        )}
        {motion.discovered.map((c) => (
          <rect key={`e-${step}-${cellKey(c)}`} className="emerge-ring" x={c.x + 0.06} y={c.y + 0.06} width={0.88} height={0.88} rx={0.16} />
        ))}
        {motion.improved.map((m) => (
          <rect key={`i-${step}-${cellKey(m.coord)}`} className="improve-ring" x={m.coord.x - 0.04} y={m.coord.y - 0.04} width={1.08} height={1.08} rx={0.22} />
        ))}
      </g>

      {path && stage !== "none" && stage !== "goal-reached" && (
        <polyline
          className={`chain-line${stage === "route" ? " chain-line-done" : ""}`}
          points={points(chain)}
          pathLength={1}
          style={{ animationDuration: `${timeline.reconstructMs}ms` }}
        />
      )}
      {path && stage === "route" && (
        <g className="route" style={{ "--route-ms": `${timeline.routeDrawMs}ms` } as CSSProperties}>
          <polyline className="route-glow" points={points(path)} pathLength={1} />
          <polyline className="route-line" points={points(path)} pathLength={1} />
        </g>
      )}

      <Endpoint coord={start} label="S" kind="start" />
      <Endpoint coord={goal} label="G" kind="goal" />

      {motion.current && outcome === "searching" && (
        <g className="current-marker" aria-hidden="true">
          <rect className="current-ring" x={motion.current.x - 0.05} y={motion.current.y - 0.05} width={1.1} height={1.1} rx={0.24} />
          <rect
            key={`pulse-${step}`}
            className="current-pulse"
            x={motion.current.x - 0.05}
            y={motion.current.y - 0.05}
            width={1.1}
            height={1.1}
            rx={0.24}
          />
        </g>
      )}
      {path && stage === "goal-reached" && (
        <circle key="goal-reached" className="goal-reached" cx={goal.x + 0.5} cy={goal.y + 0.5} r={0.6} aria-hidden="true" />
      )}

      {selectedParent && <SelectionMark coord={selectedParent} className="selected-parent" />}
      {selected && <SelectionMark coord={selected} className="selected-node" />}
    </svg>
  );
}

interface CellsProps {
  grid: SimulationConfig["grid"];
  visual: VisualState;
  stage: CompletionStage;
  chainIndex: ReadonlyMap<string, number>;
  perNodeMs: number;
}

/**
 * One tile per cell. Fill changes are CSS transitions on the tile itself, so only cells whose
 * role changed do any work. Path cells keep their search role (closed, or current for the goal)
 * until reconstruction reaches them, so the route is never shown before it is rebuilt.
 */
const Cells = memo(function Cells({ grid, visual, stage, chainIndex, perNodeMs }: CellsProps) {
  const cells = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const key = `${x},${y}`;
      if (grid.blocked[y]![x]) {
        cells.push(<rect key={key} x={x} y={y} width={1} height={1} className="cell cell-blocked" />);
        continue;
      }
      let role: string = visual.cellRoles.get(key) ?? "empty";
      let style: CSSProperties | undefined;
      if (role === "path" && stage !== "route") {
        const index = chainIndex.get(key) ?? 0;
        role = index === 0 ? "current" : "closed";
        if (stage === "reconstructing") {
          role += " cell-chain";
          style = { transitionDelay: `${Math.round(index * perNodeMs)}ms` };
        }
      }
      cells.push(
        <rect key={key} x={x + 0.06} y={y + 0.06} width={0.88} height={0.88} rx={0.16} className={`cell cell-${role}`} style={style} />,
      );
    }
  }
  return <g className="cells">{cells}</g>;
});

function SelectionMark({ coord, className }: { coord: Coordinate; className: string }) {
  // Corner brackets: a shape no node state uses, so selection never reads as a status.
  const { x, y } = coord;
  const a = -0.1;
  const b = 1.1;
  const l = 0.3;
  const d = [
    `M ${x + a} ${y + a + l} V ${y + a} H ${x + a + l}`,
    `M ${x + b - l} ${y + a} H ${x + b} V ${y + a + l}`,
    `M ${x + b} ${y + b - l} V ${y + b} H ${x + b - l}`,
    `M ${x + a + l} ${y + b} H ${x + a} V ${y + b - l}`,
  ].join(" ");
  return <path className={className} d={d} aria-hidden="true" />;
}

function Endpoint({ coord, label, kind }: { coord: Coordinate; label: string; kind: "start" | "goal" }) {
  const { x, y } = coord;
  return (
    <g className={`endpoint endpoint-${kind}`} aria-hidden="true">
      {kind === "start" ? (
        <rect x={x + 0.13} y={y + 0.13} width={0.74} height={0.74} rx={0.2} />
      ) : (
        <>
          <circle cx={x + 0.5} cy={y + 0.5} r={0.4} className="goal-outer" />
          <circle cx={x + 0.5} cy={y + 0.5} r={0.3} className="goal-inner" />
        </>
      )}
      <text x={x + 0.5} y={y + 0.53}>
        {label}
      </text>
    </g>
  );
}

function describeGrid(visual: VisualState, status: PlaybackStatus): string {
  if (visual.totalSteps === 0) return "A* search grid. No search loaded.";
  const where = visual.current ? `, current node (${visual.current.coord.x}, ${visual.current.coord.y})` : "";
  const outcome = status === "complete" ? " Route found." : status === "no-path" ? " No valid route found." : "";
  return `A* search grid. Step ${visual.stepNumber} of ${visual.totalSteps}: ${visual.frontier.length} frontier, ${visual.closed.length} explored${where}.${outcome}`;
}
