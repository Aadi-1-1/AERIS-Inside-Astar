import type { Coordinate } from "./types";

/**
 * Octile distance: the exact shortest-path length between two cells on an
 * obstacle-free 8-connected grid where orthogonal moves cost 1 and diagonal
 * moves cost sqrt(2). Admissible and consistent for this movement model.
 */
export function octileDistance(from: Coordinate, to: Coordinate): number {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}
