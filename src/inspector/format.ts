import type { Coordinate } from "../algorithm";

/**
 * Display-only rounding. Whole numbers print without decimals (`1`, `7`); everything else
 * gets three decimals (`1.414`, `19.657`). Stored values are never changed.
 */
export function formatCost(value: number): string {
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 1e-9) return String(rounded === 0 ? 0 : rounded);
  return value.toFixed(3);
}

export function formatCoord(c: Coordinate | null): string {
  return c ? `(${c.x}, ${c.y})` : "none";
}
