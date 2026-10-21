import { describe, expect, it } from "vitest";
import { octileDistance } from "./heuristic";

describe("octileDistance", () => {
  it("is zero for the same cell", () => {
    expect(octileDistance({ x: 3, y: 4 }, { x: 3, y: 4 })).toBe(0);
  });

  it("equals the step count for purely orthogonal offsets", () => {
    expect(octileDistance({ x: 0, y: 0 }, { x: 5, y: 0 })).toBe(5);
    expect(octileDistance({ x: 2, y: 7 }, { x: 2, y: 1 })).toBe(6);
  });

  it("equals k*sqrt(2) for purely diagonal offsets", () => {
    expect(octileDistance({ x: 0, y: 0 }, { x: 3, y: 3 })).toBeCloseTo(3 * Math.SQRT2, 12);
  });

  it("matches max(dx,dy) + (sqrt(2)-1)*min(dx,dy) for mixed offsets", () => {
    // dx = 5, dy = 2 -> 2 diagonals + 3 straights
    expect(octileDistance({ x: 1, y: 1 }, { x: 6, y: 3 })).toBeCloseTo(2 * Math.SQRT2 + 3, 12);
    expect(octileDistance({ x: 6, y: 3 }, { x: 1, y: 1 })).toBeCloseTo(2 * Math.SQRT2 + 3, 12);
  });

  it("is not Manhattan or Euclidean distance", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 4, y: 3 };
    const octile = octileDistance(a, b);
    expect(octile).not.toBeCloseTo(7, 6); // Manhattan
    expect(octile).not.toBeCloseTo(5, 6); // Euclidean
    expect(octile).toBeCloseTo(1 + 3 * Math.SQRT2, 12);
  });
});
