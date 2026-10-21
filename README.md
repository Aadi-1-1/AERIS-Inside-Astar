# AERIS — Inside A*

An interactive educational visualization of the A* pathfinding algorithm, built for the AERIS Autonomous Aerial Vehicles TKS Build. The finished product will let users watch A* explore a grid, inspect g/h/f values and parent links, and see the final path emerge.

## Phase 3: core engine (current)

Phase 3 implements a deterministic, independently tested A* engine in `src/algorithm/`. It has no dependency on React. Each run returns the path, its cost, statistics, and a **search trace** with one `SearchStep` per expanded node. A later UI can replay the search from the trace without inventing any algorithm behaviour. The React app is currently a placeholder.

| File | Responsibility |
| --- | --- |
| `types.ts` | Coordinates, grid, result, trace and neighbour-evaluation types |
| `grid.ts` | Movement directions and costs, bounds/blocked checks, `createGrid`, ASCII `parseMap` |
| `heuristic.ts` | Octile distance |
| `priorityQueue.ts` | Binary heap with keyed in-place priority updates |
| `astar.ts` | `findPath`: the A* search, trace recording and path reconstruction |
| `testing/` | Test-only reference Dijkstra and path validator (not used by the app) |

### Rules

- **Grid:** rectangular, with cells that are either traversable or blocked. `x` grows right and `y` grows down.
- **Movement:** 8 directions. Orthogonal moves cost `1` and diagonal moves cost `√2`. All cells have the same weight.
- **No corner cutting:** a diagonal move from `(x,y)` to `(x+dx,y+dy)` is allowed only when both `(x+dx,y)` and `(x,y+dy)` are traversable.
- **Heuristic:** octile distance, `max(dx,dy) + (√2−1)·min(dx,dy)`. It is admissible and consistent for this movement model.
- **Costs:** `f = g + h`, with `g(start) = 0`. When a cheaper route to an open node is found, A* replaces its `g`, `f` and parent, and re-positions the node in the heap.
- **Tie-breaking:** the open set orders nodes by lowest `f`, then lowest `h`, then earliest discovery. Neighbours are always scanned in the order N, NE, E, SE, S, SW, W, NW, so the same map always produces the same expansion order. Costs within `1e-9` count as equal, so floating-point noise from `√2` sums cannot create false improvements or flip a tie.
- **Edge cases:** if start equals goal, the result is `[start]` with cost `0`. If the goal is unreachable, the result is `no-path` with `path = []` and `cost = null`. An out-of-bounds, non-integer or blocked start or goal, or a malformed grid, throws `InvalidSearchInputError`.

Each neighbour evaluation in the trace has one of these kinds: `discovered`, `improved` (with old and new `g`, `f` and parent), `unchanged`, `blocked`, `corner-blocked` (with the blocking cells), or `already-closed`. Out-of-bounds neighbours are not recorded.

## Running

```bash
npm install
npm test        # Vitest suite
npm run build   # type-check + production build
npm run dev     # placeholder app
```

The tests cover open grids, obstacle detours, diagonal cost, corner cutting, unreachable goals, start = goal, parent improvement, determinism, tie-breaking, trace integrity, invalid input, and agreement with a reference Dijkstra solver on fixed and seeded random maps.

## Current limitations

This Build currently optimizes path length on an abstract 2D grid. It is not a complete autonomous-drone navigation system.

- There is no terrain weighting, energy, wind, battery or vehicle dynamics.
- There is no visualization yet; the UI starts in a later phase.
- Every step stores a full snapshot of the frontier and closed set. This is fine for teaching-sized grids, but it is not meant for very large maps.
