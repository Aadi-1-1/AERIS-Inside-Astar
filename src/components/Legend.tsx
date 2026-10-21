const ITEMS = [
  ["cell-empty", "Undiscovered"],
  ["cell-frontier", "Frontier (open)"],
  ["cell-current", "Current expansion"],
  ["cell-closed", "Explored (closed)"],
  ["cell-blocked", "Blocked"],
  ["cell-path", "Final path"],
  ["legend-start", "Start"],
  ["legend-goal", "Goal"],
] as const;

export function Legend() {
  return (
    <ul className="legend">
      {ITEMS.map(([className, label]) => (
        <li key={className}>
          <svg viewBox="0 0 1 1" aria-hidden="true">
            <rect width={1} height={1} className={`cell ${className}`} />
          </svg>
          {label}
        </li>
      ))}
    </ul>
  );
}
