import { describe, expect, it } from "vitest";
import { DIRECTIONS, findPath, octileDistance, type Coordinate } from "../algorithm";
import { isDiagonal, moveCost } from "../algorithm/grid";
import { pathViolations } from "../algorithm/testing/pathValidation";
import { referenceShortestCost } from "../algorithm/testing/referenceDijkstra";
import { QA_SCENARIOS } from "./scenarios";

const TOL = 9;
const byName = Object.fromEntries(QA_SCENARIOS.map((s) => [s.name, s]));

describe("QA scenarios (32×20)", () => {
  it("have the intended outcome", () => {
    expect(findPath(byName["Open Terrain"]!.config).status).toBe("found");
    expect(findPath(byName["Mountain Pass"]!.config).status).toBe("found");
    expect(findPath(byName["Dense Obstacles"]!.config).status).toBe("found");
    expect(findPath(byName["No Route"]!.config).status).toBe("no-path");
  });

  for (const { name, config } of QA_SCENARIOS) {
    it(`${name}: cost agrees with the reference Dijkstra and the path is valid`, () => {
      const result = findPath(config);
      const reference = referenceShortestCost(config.grid, config.start, config.goal);
      if (reference === null) {
        expect(result.status).toBe("no-path");
        expect(result.path).toEqual([]);
        return;
      }
      expect(result.cost).toBeCloseTo(reference, TOL);
      expect(pathViolations(config.grid, result.path, config.start, config.goal)).toEqual([]);
    });
  }

  // The engine never reopens a closed node. That is only safe if every node's g is already its true
  // shortest distance when it is expanded, which the consistent octile heuristic should guarantee.
  it("every expanded node's g equals its true shortest distance from the start", () => {
    for (const name of ["Mountain Pass", "Dense Obstacles"]) {
      const { config } = byName[name]!;
      for (const step of findPath(config).trace) {
        const truth = referenceShortestCost(config.grid, config.start, step.expanded.coord);
        expect(step.expanded.g).toBeCloseTo(truth!, TOL);
      }
    }
  });
});

describe("octile heuristic under the 8-direction model", () => {
  it("is consistent: h(n) ≤ cost(n, n') + h(n') for every move, and h(goal) = 0", () => {
    const goals: Coordinate[] = [{ x: 0, y: 0 }, { x: 28, y: 5 }, { x: 31, y: 19 }, { x: 13, y: 11 }];
    for (const goal of goals) {
      expect(octileDistance(goal, goal)).toBe(0);
      for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 32; x++) {
          for (const d of DIRECTIONS) {
            const next = { x: x + d.dx, y: y + d.dy };
            const slack = moveCost(d) + octileDistance(next, goal) - octileDistance({ x, y }, goal);
            expect(slack).toBeGreaterThanOrEqual(-1e-12);
            expect(moveCost(d)).toBe(isDiagonal(d) ? Math.SQRT2 : 1);
          }
        }
      }
    }
  });
});
