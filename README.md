# AERIS — Inside A*

An interactive educational visualization of the A* pathfinding algorithm, built for the AERIS Autonomous Aerial Vehicles TKS Build. The finished product will let users watch A* explore a grid, inspect g/h/f values and parent links, and see the final path emerge.

## Phase 3: core engine

Phase 3 implements a deterministic, independently tested A* engine in `src/algorithm/`. It has no dependency on React. Each run returns the path, its cost, statistics, and a **search trace** with one `SearchStep` per expanded node. A later UI can replay the search from the trace without inventing any algorithm behaviour.

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
- **Tie-breaking:** the open set orders nodes by lowest `f`, then lowest `h`, then earliest discovery. Neighbours are always scanned in the order N, NE, E, SE, S, SW, W, NW, so the same map always produces the same expansion order. The heap compares exact numeric values, so it is a strict total order. Only the improvement check uses a `1e-9` tolerance, so floating-point noise from `√2` sums cannot create a false improvement.
- **Edge cases:** if start equals goal, the result is `[start]` with cost `0`. If the goal is unreachable, the result is `no-path` with `path = []` and `cost = null`. An out-of-bounds, non-integer or blocked start or goal, or a malformed grid, throws `InvalidSearchInputError`.

Each neighbour evaluation in the trace has one of these kinds: `discovered`, `improved` (with old and new `g`, `f` and parent), `unchanged`, `blocked`, `corner-blocked` (with the blocking cells), or `already-closed`. Out-of-bounds neighbours are not recorded.

## Phase 4: functional simulation (current)

A basic SVG simulation of a 32×20 grid, driven entirely by the engine's trace:

```
Grid configuration → findPath (once per run) → SearchResult.trace
  → playback controller (step index, status, speed) → visual-state adapter → SVG renderer
```

- `src/simulation/`: pure, React-free logic.
  - `config.ts`: the default map and the edit rules. Start and goal cannot be blocked; they must stay in bounds, traversable and distinct.
  - `playback.ts`: the Start, Pause, Step, Tick, Reset and Speed transitions.
  - `controller.ts`: combines editing and playback. Any map edit discards the result.
  - `visualState.ts`: reads the frontier, closed set, current node, parent links and the final path for a step.
- `src/components/`: the renderer and controls. They never compute costs, frontier membership, parents or routes.
- **Controls:**
  - **Start** runs A* once and replays its trace; when paused, it resumes.
  - **Step** shows exactly one `SearchStep`.
  - **Reset** returns to the pre-search state.
  - **Speed** (0.5×–4×) only changes the replay rate. At 1× the delay is 450 ms per step.
- **Editing:** while playback is not running, choose Obstacle, Start or Goal mode and click the grid. In Obstacle mode you can click-drag to paint. Any edit returns the simulation to idle.

## Running

```bash
npm install
npm test        # Vitest suite
npm run build   # type-check + production build
npm run dev     # interactive simulation
```

The tests cover open grids, obstacle detours, diagonal cost, corner cutting, unreachable goals, start = goal, parent improvement, determinism, tie-breaking, trace integrity, invalid input, and agreement with a reference Dijkstra solver on fixed and seeded random maps.

## Current limitations

This Build currently optimizes path length on an abstract 2D grid. It is not a complete autonomous-drone navigation system.

- There is no terrain weighting, energy, wind, battery or vehicle dynamics.
- The UI is intentionally basic. Node inspection and the polished design come in later phases.
- Every step stores a full snapshot of the frontier and closed set. This is fine for teaching-sized grids, but it is not meant for very large maps.
