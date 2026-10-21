type Swatch = "empty" | "frontier" | "current" | "closed" | "blocked" | "path" | "start" | "goal";

const ITEMS: [Swatch, string][] = [
  ["frontier", "Frontier"],
  ["current", "Current"],
  ["closed", "Explored"],
  ["blocked", "Blocked"],
  ["path", "Final route"],
  ["start", "Start"],
  ["goal", "Goal"],
];

/** Swatches reuse the grid's own classes so the legend cannot drift from the map. */
export function Legend() {
  return (
    <ul className="legend" aria-label="Legend">
      {ITEMS.map(([kind, label]) => (
        <li key={kind}>
          <svg viewBox="-0.1 -0.1 1.2 1.2" aria-hidden="true">
            <SwatchShape kind={kind} />
          </svg>
          {label}
        </li>
      ))}
      <li>
        <svg viewBox="0 0 1.2 1.2" aria-hidden="true">
          <line className="link link-frontier" x1={0.1} y1={1.1} x2={1.1} y2={0.1} />
        </svg>
        Parent link
      </li>
    </ul>
  );
}

function SwatchShape({ kind }: { kind: Swatch }) {
  switch (kind) {
    case "blocked":
      return <rect width={1} height={1} className="cell cell-blocked" />;
    case "start":
      return (
        <g className="endpoint endpoint-start">
          <rect x={0.05} y={0.05} width={0.9} height={0.9} rx={0.22} />
        </g>
      );
    case "goal":
      return (
        <g className="endpoint endpoint-goal">
          <circle cx={0.5} cy={0.5} r={0.45} className="goal-outer" />
          <circle cx={0.5} cy={0.5} r={0.32} className="goal-inner" />
        </g>
      );
    default:
      return <rect x={0.06} y={0.06} width={0.88} height={0.88} rx={0.16} className={`cell cell-${kind}`} />;
  }
}
