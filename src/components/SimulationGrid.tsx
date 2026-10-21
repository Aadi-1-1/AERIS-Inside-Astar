import { useRef, type PointerEvent } from "react";
import type { Coordinate } from "../algorithm";
import type { SimulationConfig, VisualState } from "../simulation/types";
import { cellKey } from "../simulation/visualState";

interface Props {
  config: SimulationConfig;
  visual: VisualState;
  /** Inspected node and its parent at the displayed step, both supplied by the inspector. */
  selected: Coordinate | null;
  selectedParent: Coordinate | null;
  cursor: "crosshair" | "pointer" | "default";
  /** `drag` is fired for each further cell entered while the pointer stays down. */
  onCellPointer: (coord: Coordinate, phase: "down" | "drag") => void;
}

const center = (c: Coordinate) => ({ x: c.x + 0.5, y: c.y + 0.5 });

/** SVG view of the map plus the visual state. One viewBox unit = one cell. */
export function SimulationGrid({ config, visual, selected, selectedParent, cursor, onCellPointer }: Props) {
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

  const cells = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const role = grid.blocked[y]![x] ? "blocked" : (visual.cellRoles.get(`${x},${y}`) ?? "empty");
      cells.push(<rect key={`${x},${y}`} x={x} y={y} width={1} height={1} className={`cell cell-${role}`} />);
    }
  }

  return (
    <svg
      ref={svgRef}
      className="grid"
      style={{ cursor }}
      viewBox={`0 0 ${grid.width} ${grid.height}`}
      role="img"
      aria-label="A* search grid"
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
    >
      <g>{cells}</g>
      <g className="parent-links">
        {visual.parentLinks.map(({ from, to }) => {
          const a = center(from);
          const b = center(to);
          return <line key={cellKey(to)} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
      </g>
      {visual.path && (
        <polyline className="final-path" points={visual.path.map((c) => `${c.x + 0.5},${c.y + 0.5}`).join(" ")} />
      )}
      {selectedParent && <SelectionRing coord={selectedParent} className="selected-parent" />}
      {selected && <SelectionRing coord={selected} className="selected-node" />}
      <Endpoint coord={start} label="S" className="endpoint-start" />
      <Endpoint coord={goal} label="G" className="endpoint-goal" />
    </svg>
  );
}

function SelectionRing({ coord, className }: { coord: Coordinate; className: string }) {
  return <rect className={className} x={coord.x + 0.06} y={coord.y + 0.06} width={0.88} height={0.88} />;
}

function Endpoint({ coord, label, className }: { coord: Coordinate; label: string; className: string }) {
  return (
    <g className={`endpoint ${className}`}>
      <rect x={coord.x + 0.1} y={coord.y + 0.1} width={0.8} height={0.8} rx={0.15} />
      <text x={coord.x + 0.5} y={coord.y + 0.53}>
        {label}
      </text>
    </g>
  );
}
