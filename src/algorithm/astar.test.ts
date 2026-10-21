import { describe, expect, it } from "vitest";
import { findPath } from "./astar";
import { createGrid, parseMap } from "./grid";
import { octileDistance } from "./heuristic";
import { pathLength, pathViolations } from "./testing/pathValidation";
import { referenceShortestCost } from "./testing/referenceDijkstra";
import { InvalidSearchInputError, type Coordinate, type SearchProblem } from "./types";

const TOL = 9; // decimal digits for toBeCloseTo

function problemFrom(rows: string[]): SearchProblem {
  const { grid, start, goal } = parseMap(rows);
  if (!start || !goal) throw new Error("test map needs S and G");
  return { grid, start, goal };
}

function expectValidOptimalPath(problem: SearchProblem) {
  const result = findPath(problem);
  expect(result.status).toBe("found");
  expect(pathViolations(problem.grid, result.path, problem.start, problem.goal)).toEqual([]);
  expect(result.cost).toBeCloseTo(pathLength(result.path), TOL);
  expect(result.cost).toBeCloseTo(referenceShortestCost(problem.grid, problem.start, problem.goal)!, TOL);
  return result;
}

const key = (c: Coordinate) => `${c.x},${c.y}`;

describe("A* — required correctness cases", () => {
  it("A: finds an optimal route across an open grid", () => {
    const grid = createGrid(10, 6);
    const start = { x: 0, y: 0 };
    const goal = { x: 9, y: 4 };
    const result = expectValidOptimalPath({ grid, start, goal });
    expect(result.path[0]).toEqual(start);
    expect(result.path[result.path.length - 1]).toEqual(goal);
    // 4 diagonal + 5 straight moves
    expect(result.cost).toBeCloseTo(4 * Math.SQRT2 + 5, TOL);
    expect(result.path).toHaveLength(10);
  });

  it("B: detours around a wall without entering blocked cells, at optimal cost", () => {
    const problem = problemFrom([
      "........",
      "...#....",
      ".S.#..G.",
      "...#....",
      "...#....",
    ]);
    const result = expectValidOptimalPath(problem);
    for (const c of result.path) expect(problem.grid.blocked[c.y]![c.x]).toBe(false);
    // Over the top of the wall: (1,2)->(2,1)->(2,0)->(3,0)->(4,0)->(5,1)->(6,2) = 3 diag + 3 straight.
    // The shortcuts (2,1)->(3,0) and (3,0)->(4,1) would cut the wall's corner at (3,1).
    expect(result.cost).toBeCloseTo(3 * Math.SQRT2 + 3, TOL);
  });

  it("C: a diagonal move costs sqrt(2), not 1", () => {
    const result = findPath({ grid: createGrid(2, 2), start: { x: 0, y: 0 }, goal: { x: 1, y: 1 } });
    expect(result.status).toBe("found");
    expect(result.path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
    expect(result.cost).toBeCloseTo(Math.SQRT2, 12);
    expect(result.cost).not.toBeCloseTo(1, 6);

    const step1 = result.trace[0]!;
    const diag = step1.neighbors.find((n) => n.kind === "discovered" && n.coord.x === 1 && n.coord.y === 1);
    expect(diag && diag.kind === "discovered" && diag.stepCost).toBeCloseTo(Math.SQRT2, 12);
  });

  it("D: forbids diagonal corner cutting (S X / X G)", () => {
    const problem = problemFrom(["SX", "XG"]);
    const result = findPath(problem);
    expect(result.status).toBe("no-path");
    expect(result.path).toEqual([]);
    expect(result.cost).toBeNull();
    const evaluation = result.trace[0]!.neighbors.find((n) => n.coord.x === 1 && n.coord.y === 1);
    expect(evaluation?.kind).toBe("corner-blocked");
    if (evaluation?.kind === "corner-blocked") {
      expect(evaluation.blockingCells).toEqual([
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ]);
    }
  });

  it("D2: a single blocked corner is enough to forbid the diagonal", () => {
    // Diagonal (0,0)->(1,1) is forbidden because (1,0) is blocked, so the path must go down then right.
    const problem = problemFrom(["SX", ".G"]);
    const result = expectValidOptimalPath(problem);
    expect(result.path).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]);
    expect(result.cost).toBeCloseTo(2, TOL);
  });

  it("E: reports no-path when the goal is walled in", () => {
    const problem = problemFrom([
      "S......",
      "...###.",
      "...#G#.",
      "...###.",
      ".......",
    ]);
    const result = findPath(problem);
    expect(result.status).toBe("no-path");
    expect(result.path).toEqual([]);
    expect(result.cost).toBeNull();
    // Every reachable cell gets expanded before giving up: 35 cells - 8 walls - goal = 26.
    expect(result.stats.expandedNodes).toBe(26);
    expect(result.trace[result.trace.length - 1]!.frontier).toEqual([]);
  });

  it("F: start equal to goal returns a single-cell path at cost 0", () => {
    const grid = createGrid(3, 3);
    const result = findPath({ grid, start: { x: 1, y: 1 }, goal: { x: 1, y: 1 } });
    expect(result.status).toBe("found");
    expect(result.path).toEqual([{ x: 1, y: 1 }]);
    expect(result.cost).toBe(0);
    expect(result.trace).toHaveLength(1);
    expect(result.trace[0]!.isGoal).toBe(true);
  });

  it("G: replaces an inferior parent when a cheaper route is found, and traces it", () => {
    const problem = problemFrom([
      "...#...",
      ".S.#...",
      "...#.G.",
      ".......",
    ]);
    const result = expectValidOptimalPath(problem);

    const improvements = result.trace.flatMap((s) =>
      s.neighbors.flatMap((n) => (n.kind === "improved" ? [{ step: s, n }] : [])),
    );
    expect(improvements.length).toBeGreaterThan(0);

    const { step, n } = improvements[0]!;
    expect(n.coord).toEqual({ x: 1, y: 3 });
    expect(n.oldG).toBeCloseTo(2 * Math.SQRT2, TOL);
    expect(n.newG).toBeCloseTo(2, TOL);
    expect(n.newG).toBeLessThan(n.oldG);
    expect(n.oldParent).toEqual({ x: 2, y: 2 });
    expect(n.newParent).toEqual({ x: 1, y: 2 });
    expect(n.newParent).toEqual(step.expanded.coord);
    expect(n.newF).toBeCloseTo(n.newG + n.node.h, TOL);
    expect(n.oldF - n.newF).toBeCloseTo(n.oldG - n.newG, TOL);

    // The improvement was really applied: the frontier snapshot carries the new values.
    const inFrontier = step.frontier.find((f) => f.coord.x === 1 && f.coord.y === 3)!;
    expect(inFrontier.g).toBeCloseTo(2, TOL);
    expect(inFrontier.parent).toEqual({ x: 1, y: 2 });

    // The original discovery is in an earlier step, with the old parent.
    const discovery = result.trace
      .flatMap((s) => s.neighbors)
      .find((e) => e.kind === "discovered" && e.coord.x === 1 && e.coord.y === 3);
    expect(discovery?.kind === "discovered" && discovery.node.parent).toEqual({ x: 2, y: 2 });
  });

  it("H: is deterministic across repeated runs", () => {
    const problem = problemFrom([
      "S.........",
      "..##......",
      "...#..#...",
      "...#..#...",
      "......#..G",
    ]);
    const runs = Array.from({ length: 5 }, () => findPath(problem));
    const first = runs[0]!;
    for (const run of runs.slice(1)) {
      expect(run.path).toEqual(first.path);
      expect(run.cost).toBe(first.cost);
      expect(run.trace.map((s) => key(s.expanded.coord))).toEqual(first.trace.map((s) => key(s.expanded.coord)));
      expect(run.trace).toEqual(first.trace);
    }
  });
});

describe("A* — tie-breaking", () => {
  it("prefers lower h when f ties", () => {
    // On an open grid toward a goal straight east, all cells on the straight line have f = 4.
    // Among them the one closest to the goal (lowest h) must be expanded first.
    const result = findPath({ grid: createGrid(5, 3), start: { x: 0, y: 1 }, goal: { x: 4, y: 1 } });
    expect(result.trace.map((s) => key(s.expanded.coord))).toEqual(["0,1", "1,1", "2,1", "3,1", "4,1"]);
  });

  it("falls back to earliest discovery when f and h tie", () => {
    // From (1,0) toward (1,2) on an open 3x3 grid, mirror-image neighbours tie on both f and h.
    // Direction order is N, NE, E, SE, S, SW, W, NW, so E/SE are discovered before W/SW.
    const result = findPath({ grid: createGrid(3, 3), start: { x: 1, y: 0 }, goal: { x: 1, y: 2 } });
    const frontier = result.trace[0]!.frontier;
    expect(frontier.map((n) => key(n.coord))).toEqual(["1,1", "2,1", "0,1", "2,0", "0,0"]);
    const [, se, sw] = frontier;
    expect(se!.f).toBeCloseTo(sw!.f, 12);
    expect(se!.h).toBeCloseTo(sw!.h, 12);
    expect(se!.discoveryOrder).toBeLessThan(sw!.discoveryOrder);
  });

  it("every frontier snapshot is sorted by (f, h, discovery order)", () => {
    const result = findPath(
      problemFrom(["S...#....", "....#....", ".......#.", "....#..#G"]),
    );
    for (const step of result.trace) {
      for (let i = 1; i < step.frontier.length; i++) {
        const a = step.frontier[i - 1]!;
        const b = step.frontier[i]!;
        const ordered =
          a.f < b.f - 1e-9 ||
          (Math.abs(a.f - b.f) <= 1e-9 && (a.h < b.h - 1e-9 || (Math.abs(a.h - b.h) <= 1e-9 && a.discoveryOrder < b.discoveryOrder)));
        expect(ordered).toBe(true);
      }
      // The node expanded at step k+1 is the head of the frontier after step k.
      const next = result.trace[step.step];
      if (next) expect(next.expanded).toEqual(step.frontier[0]);
    }
  });
});

describe("A* — trace integrity", () => {
  const problem = problemFrom([
    "S..#......",
    "...#..##..",
    "...#...#..",
    "......##.G",
    "...#......",
  ]);
  const result = findPath(problem);

  it("records one step per expansion and consistent stats", () => {
    expect(result.status).toBe("found");
    expect(result.trace.map((s) => s.step)).toEqual(result.trace.map((_, i) => i + 1));
    expect(result.stats.steps).toBe(result.trace.length);
    expect(result.stats.expandedNodes).toBe(result.trace.length);
    expect(result.trace[result.trace.length - 1]!.isGoal).toBe(true);
    expect(result.trace.filter((s) => s.isGoal)).toHaveLength(1);
    const discovered = result.trace.flatMap((s) => s.neighbors).filter((n) => n.kind === "discovered").length;
    expect(result.stats.discoveredNodes).toBe(discovered + 1); // + start
    expect(result.stats.maxFrontierSize).toBe(Math.max(1, ...result.trace.map((s) => s.frontier.length)));
  });

  it("stores correct g/h/f values on every expanded node", () => {
    for (const step of result.trace) {
      const e = step.expanded;
      expect(e.h).toBeCloseTo(octileDistance(e.coord, problem.goal), 12);
      expect(e.f).toBeCloseTo(e.g + e.h, 12);
    }
    expect(result.trace[0]!.expanded).toMatchObject({ coord: problem.start, g: 0, parent: null });
  });

  it("closed set grows by exactly the expanded node each step, never re-expanding", () => {
    const seen = new Set<string>();
    result.trace.forEach((step, i) => {
      expect(step.closed).toHaveLength(i + 1);
      expect(step.closed[i]).toEqual(step.expanded.coord);
      expect(seen.has(key(step.expanded.coord))).toBe(false);
      seen.add(key(step.expanded.coord));
      for (const f of step.frontier) expect(seen.has(key(f.coord))).toBe(false);
    });
  });

  it("final path matches the parent chain recorded in the trace", () => {
    const parentOf = new Map<string, Coordinate | null>();
    for (const step of result.trace) parentOf.set(key(step.expanded.coord), step.expanded.parent);
    const chain: Coordinate[] = [problem.goal];
    let parent = parentOf.get(key(problem.goal));
    while (parent) {
      chain.push(parent);
      parent = parentOf.get(key(parent));
    }
    expect(chain.reverse()).toEqual(result.path);
  });

  it("each neighbour evaluation carries g = parent g + step cost", () => {
    for (const step of result.trace) {
      for (const n of step.neighbors) {
        if (n.kind === "discovered") expect(n.node.g).toBeCloseTo(step.expanded.g + n.stepCost, 12);
        if (n.kind === "improved") expect(n.newG).toBeCloseTo(step.expanded.g + n.stepCost, 12);
        if (n.kind === "unchanged") expect(n.candidateG).toBeGreaterThanOrEqual(n.node.g - 1e-9);
      }
    }
  });

  it("reports blocked and already-closed neighbours", () => {
    const kinds = new Set(result.trace.flatMap((s) => s.neighbors.map((n) => n.kind)));
    expect(kinds.has("blocked")).toBe(true);
    expect(kinds.has("already-closed")).toBe(true);
    expect(kinds.has("unchanged")).toBe(true);
  });
});

describe("A* — matches reference Dijkstra optimal cost", () => {
  const maps: Record<string, string[]> = {
    open: ["S.........", "..........", "..........", ".........G"],
    wall: ["....#.....", ".S..#.....", "....#..G..", "....#.....", ".........."],
    maze: [
      "S.#.......",
      "..#.####..",
      "..#....#..",
      "..####.#..",
      "......#...",
      ".####.#.##",
      "......#..G",
    ],
    diagonalGaps: ["S.#...", ".#.#..", "#.#.#.", ".#.#.#", "..#.#G"],
    corridor: ["S#.......", ".#.#####.", ".#.#...#.", ".#.#.#.#.", "...#.#...", "#####.##G"],
    unreachable: ["S...#", "....#", "#####", "....G"],
  };

  for (const [name, rows] of Object.entries(maps)) {
    it(`map "${name}"`, () => {
      const problem = problemFrom(rows);
      const reference = referenceShortestCost(problem.grid, problem.start, problem.goal);
      const result = findPath(problem);
      if (reference === null) {
        expect(result.status).toBe("no-path");
        return;
      }
      expect(result.status).toBe("found");
      expect(result.cost).toBeCloseTo(reference, TOL);
      expect(pathViolations(problem.grid, result.path, problem.start, problem.goal)).toEqual([]);
    });
  }

  it("seeded random maps", () => {
    let seed = 12345;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed / 2 ** 31;
    };
    let found = 0;
    for (let trial = 0; trial < 60; trial++) {
      const width = 6 + Math.floor(rand() * 10);
      const height = 6 + Math.floor(rand() * 10);
      const blocked: Coordinate[] = [];
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (rand() < 0.3) blocked.push({ x, y });
      const start = { x: 0, y: 0 };
      const goal = { x: width - 1, y: height - 1 };
      const grid = createGrid(
        width,
        height,
        blocked.filter((c) => !(c.x === start.x && c.y === start.y) && !(c.x === goal.x && c.y === goal.y)),
      );
      const reference = referenceShortestCost(grid, start, goal);
      const result = findPath({ grid, start, goal });
      if (reference === null) {
        expect(result.status).toBe("no-path");
      } else {
        found++;
        expect(result.cost).toBeCloseTo(reference, TOL);
        expect(pathViolations(grid, result.path, start, goal)).toEqual([]);
      }
    }
    expect(found).toBeGreaterThan(10);
  });
});

describe("A* — invalid input", () => {
  const grid = createGrid(4, 4, [{ x: 2, y: 2 }]);

  it("rejects coordinates outside the grid", () => {
    expect(() => findPath({ grid, start: { x: -1, y: 0 }, goal: { x: 1, y: 1 } })).toThrow(InvalidSearchInputError);
    expect(() => findPath({ grid, start: { x: 0, y: 0 }, goal: { x: 4, y: 1 } })).toThrow(/outside/);
  });

  it("rejects non-integer coordinates", () => {
    expect(() => findPath({ grid, start: { x: 0.5, y: 0 }, goal: { x: 1, y: 1 } })).toThrow(InvalidSearchInputError);
  });

  it("rejects a blocked start or goal", () => {
    expect(() => findPath({ grid, start: { x: 2, y: 2 }, goal: { x: 0, y: 0 } })).toThrow(/Start.*blocked/);
    expect(() => findPath({ grid, start: { x: 0, y: 0 }, goal: { x: 2, y: 2 } })).toThrow(/Goal.*blocked/);
  });

  it("rejects malformed grids", () => {
    expect(() => createGrid(0, 3)).toThrow(InvalidSearchInputError);
    const ragged = { width: 3, height: 2, blocked: [[false, false, false], [false]] };
    expect(() => findPath({ grid: ragged, start: { x: 0, y: 0 }, goal: { x: 1, y: 0 } })).toThrow(InvalidSearchInputError);
    expect(() => parseMap(["S..", "..G."])).toThrow(InvalidSearchInputError);
  });
});
