/**
 * TEST-ONLY reference solver. Not part of the production engine or UI.
 *
 * A deliberately simple O(V^2) Dijkstra (equivalent to A* with h = 0) that
 * re-implements the movement rules independently of astar.ts, so the two can
 * cross-check each other's optimal costs.
 */
import type { Coordinate, Grid } from "../types";

export function referenceShortestCost(grid: Grid, start: Coordinate, goal: Coordinate): number | null {
  const { width, height, blocked } = grid;
  const open = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && !blocked[y]![x];
  const dist = new Array<number>(width * height).fill(Infinity);
  const done = new Array<boolean>(width * height).fill(false);
  dist[start.y * width + start.x] = 0;

  for (;;) {
    let best = -1;
    for (let i = 0; i < dist.length; i++) {
      if (!done[i] && dist[i]! < Infinity && (best === -1 || dist[i]! < dist[best]!)) best = i;
    }
    if (best === -1) return null;
    const x = best % width;
    const y = Math.floor(best / width);
    if (x === goal.x && y === goal.y) return dist[best]!;
    done[best] = true;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (!open(nx, ny)) continue;
        const diagonal = dx !== 0 && dy !== 0;
        if (diagonal && (!open(x + dx, y) || !open(x, y + dy))) continue;
        const next = ny * width + nx;
        const candidate = dist[best]! + (diagonal ? Math.SQRT2 : 1);
        if (candidate < dist[next]!) dist[next] = candidate;
      }
    }
  }
}
