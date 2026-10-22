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

## Phase 4: functional simulation

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

## Phase 5: decision inspector

A right-hand panel explains the search using only recorded trace data (`src/inspector/`, React-free):

- **Live:** shows the current expansion's g, h and f, with `f = g + h` using the actual values. It shows the parent as `parent g + move cost = node g`, where the move costs 1 orthogonally or √2 diagonally, worked out from the two coordinates. It also explains why A* chose this node: it headed the frontier under *lowest f → lowest h → earliest discovery*. The runner-up and the deciding rule come from the recorded frontier.
- **Inspect:** choose the **Inspect** tool (selected automatically when a search starts) and click any frontier, explored, current or final-path cell. The panel then shows:
  - its status;
  - its values, parent and history (discovered → cheaper path found → expanded);
  - any recorded improvement, with previous and new parent, g and f.
  
  Clicking an undiscovered cell, or **Back to Live**, returns to Live. The edit tools never inspect, and Inspect never edits.
- **Summary:** when the search ends, the panel shows the outcome, cost, path length and `SearchResult.stats`.
- **Temporal correctness:** `buildNodeHistory` indexes each node's events once per result. `nodeStateAt(node, step)` uses only the events up to the displayed step, so a node inspected before an improvement shows its earlier g, f and parent.
- **Selection:** a selected node stays selected while playback advances, and its values update each step. Reset, any map edit, or a new search clears the selection.
- **Display:** values are rounded to 3 decimals for display only; stored values keep full precision.

## Phase 6: premium interface

A visual pass over the same simulation. The engine, the trace and the inspector logic are unchanged; motion is a presentation layer that only reads the displayed `SearchStep`.

- **Visual states:** one meaning per state, carried by shape and weight as well as colour. Frontier cells are outlined cyan tiles, explored cells are muted filled tiles, and the current node is near-white with a ring. Blocked terrain is hatched, Start is a square **S** and Goal is a ringed **G**. Selection uses corner brackets, a shape no other state uses. Design tokens (palette, fonts, motion timing) are CSS variables in `src/index.css`. Inter and JetBrains Mono are bundled locally through `@fontsource-variable`.
- **Trace-driven animation:** `src/simulation/motion.ts` (React-free) reads the displayed step's neighbour evaluations. Only nodes recorded as `discovered` in that step get the emergence ring. The current node gets one pulse per expansion. Obstacles rejected by `blocked` or `corner-blocked` evaluations get a faint edge. Every effect plays once per step; nothing loops.
- **Parent network:** every link is a recorded parent → child edge, weighted by what the child is now. The link into the current node and the links created this step are strongest, frontier links are visible and explored links are subdued. When the search ends, non-route links fade but stay faintly visible.
- **Improvement transitions:** for each recorded `improved` event, the link from the recorded `oldParent` fades to a dashed trace, the link from `newParent` draws in, and the node gets a brief ring. The Live panel lists the old/new parent and g. Nothing appears without such an event.
- **Path reconstruction:** after the goal is expanded, the sequence is goal reached → the stored parent chain is walked from goal to start (`SearchResult.path` reversed) → the route draws from start to goal and becomes the dominant element. The status line describes this as a reconstruction, not further search. With no route, nothing is drawn, the search settles, and the grid and panel say **No valid route found**.
- **Display rounding:** the deciding comparison is still taken from exact values. If the deciding values look equal at 3 decimals, the panel says so instead of calling them tied or showing an unexplained "lower" value.
- **Reduced motion:** with `prefers-reduced-motion`, transitions and animations jump to their end state and the completion sequence goes straight to the final route. All algorithm state stays visible.

## Phase 7: Real-World Applications

A second page, **Real-World Applications** (`#/applications`, in the top navigation next to Simulation), looks at where A* is actually used and what that means for this simplified Build. The simulation stays mounted while you read; a running search is paused, not reset.

- **Evidence classification:** every example is labelled with exactly one category:
  - **Confirmed A* implementation:** primary documentation explicitly states A* is used.
  - **Research / simulation demonstration:** A* is implemented, but this is not evidence of production use.
  - **Related real-world navigation:** a real system whose documented planner is not A*.
- **Main sources:**
  - Hart, Nilsson & Raphael (1968), the original A* paper.
  - The ROS 2 Nav2 Smac Planner docs: 2D A*, Hybrid-A* and State Lattice. *Confirmed.*
  - A third-party PX4 SITL/Gazebo UAV demo whose own code runs A*. *Research/simulation; not PX4's standard stack.*
  - ArduPilot's object-avoidance docs: BendyRuler, Dijkstra's, and Dijkstra's + BendyRuler. *Related, not A*.*
- **Sourcing:** claims carry inline links to their source. The reference list records what each source supports and what it does not show. The page also lists claims it deliberately does not make, such as "Zipline/Wing/DJI use A*" or "PX4/ArduPilot use A*".
- **Code layout:** source data is in `src/applications/sources.ts` and the page in `src/applications/`. Routing is a small hash router in `src/site/`.

## Phase 8: quality review (current)

An end-to-end audit of the Build, run against the production bundle in Chromium (Playwright), with no new features. `src/algorithm/` was reviewed and not changed.

- **Verified:** engine rules and A* vs Dijkstra agreement; grid cells, parent links and one-shot animations against the trace at sampled steps of five maps; inspector values before and after a real `improved` event; Start/Pause/Resume/Step/Reset and all four speeds; editing rules; routing, deep links and Back/Forward during a running search; 1440/1024/768 px layouts; keyboard focus, contrast and reduced motion; console and network errors; 4× playback performance.
- **QA maps:** `src/qa/scenarios.ts` holds four fixed 32×20 maps (Open Terrain, Mountain Pass, Dense Obstacles, No Route). These are test fixtures, not UI presets.
- **Fixes:**
  - The Applications page no longer states optimality more broadly than this Build supports.
  - The small "faint" label colour was raised to meet WCAG AA contrast.
  - A table-of-contents link to the section already in the URL now scrolls.
  - ArduPilot links use the canonical `ardupilot.org` host.
  - Nav2 robot-type claims now cite the page that states them.
- **New tests:**
  - Each QA map matches the reference Dijkstra.
  - Every expanded node's `g` equals its true shortest distance. This makes never reopening closed nodes safe.
  - The octile heuristic is consistent for every move.
  - A regression check on the optimality wording.

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
- The open set compares exact floating-point `f` values. Two routes of equal true length can differ by less than 10⁻⁹, and that difference, not the `h` tie-break, can decide which node is expanded next. On open maps this widens exploration. Route costs are unaffected, and the inspector says when this happens.
- The grid is operated with a pointer. The controls and the decision panel are keyboard-accessible, but individual cells cannot be inspected or edited from the keyboard.
- There is no backward playback. Desktop is the primary layout; narrow screens get a stacked layout.
- Every step stores a full snapshot of the frontier and closed set. This is fine for teaching-sized grids, but it is not meant for very large maps.
