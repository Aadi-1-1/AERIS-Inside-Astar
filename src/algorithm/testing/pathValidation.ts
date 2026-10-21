/** TEST-ONLY helpers for checking that a returned path obeys the movement rules. */
import type { Coordinate, Grid } from "../types";

/**
 * Returns a list of rule violations (empty when the path is valid): every cell
 * in bounds and traversable, every step a single 8-way move, and no diagonal
 * step cutting a blocked corner.
 */
export function pathViolations(grid: Grid, path: readonly Coordinate[], start: Coordinate, goal: Coordinate): string[] {
  const problems: string[] = [];
  const open = (c: Coordinate) =>
    c.x >= 0 && c.y >= 0 && c.x < grid.width && c.y < grid.height && !grid.blocked[c.y]![c.x];

  if (path.length === 0) return ["path is empty"];
  const first = path[0]!;
  const last = path[path.length - 1]!;
  if (first.x !== start.x || first.y !== start.y) problems.push("path does not begin at start");
  if (last.x !== goal.x || last.y !== goal.y) problems.push("path does not end at goal");

  path.forEach((c, i) => {
    if (!open(c)) problems.push(`cell ${i} (${c.x},${c.y}) is out of bounds or blocked`);
    if (i === 0) return;
    const prev = path[i - 1]!;
    const dx = c.x - prev.x;
    const dy = c.y - prev.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== 1) {
      problems.push(`step ${i} (${prev.x},${prev.y})->(${c.x},${c.y}) is not a single move`);
    } else if (dx !== 0 && dy !== 0 && (!open({ x: prev.x + dx, y: prev.y }) || !open({ x: prev.x, y: prev.y + dy }))) {
      problems.push(`step ${i} (${prev.x},${prev.y})->(${c.x},${c.y}) cuts a blocked corner`);
    }
  });
  return problems;
}

/** Sum of move costs along a path (1 orthogonal, sqrt(2) diagonal). */
export function pathLength(path: readonly Coordinate[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const diagonal = path[i]!.x !== path[i - 1]!.x && path[i]!.y !== path[i - 1]!.y;
    total += diagonal ? Math.SQRT2 : 1;
  }
  return total;
}
