import { useEffect, useRef, type ReactNode } from "react";
import { sectionHref } from "../site/routes";
import { CASE_STUDIES, CATEGORIES, EXCLUDED_CLAIMS, SOURCES, SOURCE_ORDER, type EvidenceCategory, type SourceId } from "./sources";
import "./applications.css";

const SECTIONS = [
  { id: "origins", label: "1968 origins" },
  { id: "nav2", label: "Confirmed: Nav2" },
  { id: "uav-demo", label: "UAV simulation" },
  { id: "ardupilot", label: "Not A*: ArduPilot" },
  { id: "constraints", label: "Why real systems need more" },
  { id: "aeris", label: "What AERIS built" },
  { id: "sources", label: "Sources" },
] as const;

interface Props {
  /** Section to scroll to, from `#/applications/<section>`. */
  section: string | null;
}

export function ApplicationsPage({ section }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const target = section ? document.getElementById(section) : null;
    if (target) target.scrollIntoView({ block: "start" });
    else {
      window.scrollTo(0, 0);
      titleRef.current?.focus({ preventScroll: true });
    }
  }, [section]);

  return (
    <main className="rwa" id="main">
      <header className="rwa-hero">
        <p className="eyebrow">Real-World Applications</p>
        <h1 ref={titleRef} tabIndex={-1}>
          Where A* meets the real world
        </h1>
        <p className="rwa-lede">
          Our simulator recreates one well-established pathfinding algorithm on a small, perfectly known grid. Real robots
          and drones plan under far more constraints, and they do not all use A*. This page separates what we could verify
          in primary documentation from what we could not.
        </p>
        <EvidenceKey />
        <nav className="rwa-toc" aria-label="On this page">
          <ol>
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a href={sectionHref(s.id)}>
                  <span className="mono">{String(i + 1).padStart(2, "0")}</span> {s.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <Origins />
      <Nav2Case />
      <UavDemoCase />
      <ArduPilotCase />
      <Constraints />
      <WhatAerisBuilt />
      <References />
    </main>
  );
}

/* ---------------------------------------------------------------- shared */

export function EvidenceBadge({ category }: { category: EvidenceCategory }) {
  return (
    <span className={`evidence-badge evidence-${category}`}>
      <span className="evidence-mark" aria-hidden="true" />
      {CATEGORIES[category].label}
    </span>
  );
}

function EvidenceKey() {
  return (
    <section className="evidence-key" aria-labelledby="evidence-key-title">
      <h2 id="evidence-key-title" className="eyebrow">
        How each example is classified
      </h2>
      <dl>
        {(Object.keys(CATEGORIES) as EvidenceCategory[]).map((c) => (
          <div key={c}>
            <dt>
              <EvidenceBadge category={c} />
            </dt>
            <dd>{CATEGORIES[c].definition}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Inline citation: a named link to the source that supports the sentence next to it. */
function Cite({ id }: { id: SourceId }) {
  const s = SOURCES[id];
  return (
    <a className="cite" href={s.url} target="_blank" rel="noreferrer">
      {s.short}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function Section({ id, number, title, children }: { id: string; number: number; title: string; children: ReactNode }) {
  return (
    <section className="rwa-section" id={id} aria-labelledby={`${id}-title`}>
      <p className="section-number mono" aria-hidden="true">
        {String(number).padStart(2, "0")}
      </p>
      <h2 id={`${id}-title`}>{title}</h2>
      {children}
    </section>
  );
}

/** Case-study header: the evidence category and every source the case rests on. */
function CaseEvidence({ caseId }: { caseId: string }) {
  const study = CASE_STUDIES.find((c) => c.id === caseId)!;
  return (
    <div className="case-evidence" data-category={study.category}>
      <EvidenceBadge category={study.category} />
      <p className="case-sources">
        <span className="muted">Evidence:</span>{" "}
        {study.sources.map((id, i) => (
          <span key={id}>
            {i > 0 && " · "}
            <Cite id={id} />
          </span>
        ))}
      </p>
    </div>
  );
}

function ProvesPanel({ proves, notProves }: { proves: ReactNode[]; notProves: ReactNode[] }) {
  return (
    <div className="proves">
      <div>
        <h3>What it demonstrates</h3>
        <ul className="check-list">
          {proves.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3>What it does not prove</h3>
        <ul className="cross-list">
          {notProves.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** A left-to-right flow of labelled stages, read by assistive technology as an ordered list. */
function Flow({ label, steps, tone }: { label: string; steps: { title: string; note?: string }[]; tone: "aeris" | "real" | "demo" }) {
  return (
    <figure className={`flow flow-${tone}`}>
      <figcaption>{label}</figcaption>
      <ol>
        {steps.map((s) => (
          <li key={s.title}>
            <strong>{s.title}</strong>
            {s.note && <span>{s.note}</span>}
          </li>
        ))}
      </ol>
    </figure>
  );
}

/* ---------------------------------------------------------------- sections */

function Origins() {
  return (
    <Section id="origins" number={1} title="From 1968 to modern planning">
      <div className="two-col">
        <div className="prose">
          <p>
            A* was published in 1968 by Peter Hart, Nils Nilsson and Bertram Raphael in{" "}
            <em>IEEE Transactions on Systems Science and Cybernetics</em> <Cite id="hart1968" />. Their contribution was
            to fold a problem-specific estimate (a heuristic) into a formal theory of graph search, and to prove an
            optimality property for that family of searches.
          </p>
          <p>
            The key result: if the estimate never overestimates the true remaining cost, the search is guaranteed to
            return a minimum-cost path. Our octile heuristic satisfies that condition for 8-direction movement, which is
            why the simulator's route is always a shortest one.
          </p>
        </div>
        <figure className="formula-card" aria-label="The A* evaluation function: f of n equals g of n plus h of n">
          <p className="formula-main mono">
            f(n) = <span className="term-g">g(n)</span> + <span className="term-h">h(n)</span>
          </p>
          <dl>
            <div>
              <dt className="mono term-g">g(n)</dt>
              <dd>cost of the best known path from the start to n</dd>
            </div>
            <div>
              <dt className="mono term-h">h(n)</dt>
              <dd>estimate of the remaining cost from n to the goal</dd>
            </div>
            <div>
              <dt className="mono">f(n)</dt>
              <dd>the priority: the open node with the lowest f is expanded next</dd>
            </div>
          </dl>
          <figcaption>
            The same three numbers appear in the <a href="#/">simulator's Decision Inspector</a>.
          </figcaption>
        </figure>
      </div>
    </Section>
  );
}

function Nav2Case() {
  const planners = [
    {
      name: "Smac 2D",
      state: "(x, y) costmap cells",
      body: (
        <>
          A “cost-aware holonomic A*” for circular differential-drive and omnidirectional robots <Cite id="nav2Smac2d" />,
          using an 8-connected neighbourhood <Cite id="smacReadme" />.
        </>
      ),
      note: "Closest to AERIS",
    },
    {
      name: "Hybrid-A*",
      state: "(x, y, heading)",
      body: (
        <>
          An SE2 planner for Ackermann, car-like and legged robots. It searches with Dubin or Reeds-Shepp motion models,
          72 heading bins by default and a minimum turning radius <Cite id="nav2SmacHybrid" />.
        </>
      ),
      note: "Kinematically feasible",
    },
    {
      name: "State Lattice",
      state: "(x, y, heading) via control sets",
      body: (
        <>
          A lattice planner for arbitrarily shaped robots, built on the same templated A* search with control sets for
          different drivetrains <Cite id="nav2Smac" />.
        </>
      ),
      note: "Any robot shape",
    },
  ];
  return (
    <Section id="nav2" number={2} title="Confirmed A* in robotics: ROS 2 Nav2 Smac Planner">
      <CaseEvidence caseId="nav2" />
      <blockquote className="source-quote">
        <p>“The Smac Planner plugin implements three A* based planning algorithms: 2D A*, Hybrid-A*, and State Lattice path planners.”</p>
        <footer>
          — Nav2 documentation, <Cite id="nav2Smac" />
        </footer>
      </blockquote>
      <p className="prose">
        Nav2 is the navigation framework for ROS 2 robots. The Smac Planner is one of its planner plugins: it computes a
        path over the robot's costmap, which a separate controller then follows. Its package README
        describes a shared, optimised <code>AStar</code> template that all three planners use <Cite id="smacReadme" />.
      </p>

      <div className="card-grid three">
        {planners.map((p) => (
          <article className="planner-card" key={p.name}>
            <header>
              <h3>{p.name}</h3>
              <span className="pill">{p.note}</span>
            </header>
            <p className="state mono">state: {p.state}</p>
            <p>{p.body}</p>
          </article>
        ))}
      </div>

      <div className="callout">
        <h3>Why real planners add costs and kinematics</h3>
        <p>
          In our Build a cell is either free or blocked, and the robot is a point that can step in 8 directions. Smac 2D
          instead reads a <em>costmap</em> and steers away from high-cost areas. Its docs note that setting{" "}
          <code>cost_travel_multiplier</code> to 0.0 “effectively disables steering away from obstacles and acts like a
          naive binary search A*” <Cite id="nav2Smac2d" />. That “naive” mode is essentially what AERIS shows. A car-like
          robot also cannot turn on the spot, so Hybrid-A* adds heading to the search and only follows motions the vehicle
          can actually drive, with a minimum turning radius and penalties for reversing and turning{" "}
          <Cite id="nav2SmacHybrid" />.
        </p>
      </div>

      <ComparisonTable />

      <aside className="caveat">
        <strong>A* is a choice, even inside Nav2.</strong> Nav2's NavFn planner is described as “a wavefront Dijkstra or A*
        expanded holonomic planner”, and its <code>use_astar</code> option defaults to <code>false</code>{" "}
        <Cite id="nav2NavFn" />. The Smac README says users have reported running the planner on delivery robots,
        industrial robots, vertical farming and solar farms <Cite id="smacReadme" />. Those are reports, not named
        deployments, so we do not attach any company to them.
      </aside>
    </Section>
  );
}

function ComparisonTable() {
  const rows: [string, string, string, string][] = [
    ["Search state", "grid cell (x, y)", "costmap cell (x, y)", "pose (x, y, heading)"],
    ["Moves", "8 directions, no corner cutting", "8-connected neighbourhood", "Dubin or Reeds-Shepp motion primitives"],
    ["Cost", "path length (1 or √2 per move)", "path length plus costmap cost penalty", "length plus turning, reversing and cost penalties"],
    ["Map", "hand-drawn free/blocked grid", "Nav2 costmap", "Nav2 costmap"],
    ["Vehicle", "a point", "approximated as a circle", "footprint plus minimum turning radius"],
  ];
  return (
    <div className="table-wrap">
      <table className="compare-table">
        <caption>AERIS compared with two Smac planners, as documented</caption>
        <thead>
          <tr>
            <th scope="col" />
            <th scope="col" className="aeris-col">AERIS (this Build)</th>
            <th scope="col">Smac 2D</th>
            <th scope="col">Smac Hybrid-A*</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, ...cells]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              {cells.map((c, i) => (
                <td key={i}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UavDemoCase() {
  return (
    <Section id="uav-demo" number={3} title="A* in UAV research and simulation">
      <CaseEvidence caseId="uav-demo" />
      <p className="prose">
        <em>uav-path-planning-demo</em> is a third-party project that simulates a substation-inspection drone mission{" "}
        <Cite id="uavDemo" />. It plans its global route with its own A* on an obstacle grid, then flies the resulting
        waypoints on PX4 SITL (the PX4 autopilot software running in simulation) inside the Gazebo simulator.
      </p>

      <Flow
        tone="demo"
        label="The project's pipeline, as described in its README"
        steps={[
          { title: "Map + destination", note: "from a validated map catalog" },
          { title: "Height-aware obstacle grid", note: "with obstacle inflation" },
          { title: "A* global route", note: "the project's own planner" },
          { title: "Simplified waypoints", note: "grid path → local NED" },
          { title: "MAVSDK → PX4 SITL ↔ Gazebo", note: "simulated flight" },
          { title: "Simulated risk sensing", note: "rule-based; may replace waypoints" },
        ]}
      />

      <p className="prose">
        The planner file implements a grid A* with an octile heuristic and √2 diagonal moves when diagonals are enabled,
        the same cost model as our Build <Cite id="uavDemoPlanner" />. PX4 is the flight software that receives and flies
        the waypoints; the A* runs in the project's own Python code before that.
      </p>

      <ProvesPanel
        proves={[
          "A grid A* route can be turned into waypoints and flown by PX4 in a software-in-the-loop simulation.",
          "Its README reports 16 of 16 simulated runs passing the project's checks on one map (substation_simple_v3).",
          "Simple replanning in simulation: candidate routes are evaluated, and remaining outbound waypoints can be replaced.",
        ]}
        notProves={[
          "That PX4's standard navigation uses A*. The A* is the project's own code, not part of PX4.",
          "Real-world performance. The README states: “Simulation only; no real UAV hardware validation.”",
          "Handling of moving obstacles. “Obstacles are static in the current portfolio demo.”",
          "Real perception. Risk sensing is “map-based and rule-based, not camera/LiDAR deep perception.”",
        ]}
      />
    </Section>
  );
}

function ArduPilotCase() {
  return (
    <Section id="ardupilot" number={4} title="Real drone navigation doesn't mean A*">
      <CaseEvidence caseId="ardupilot" />
      <p className="prose">
        ArduPilot is open-source autopilot software for multicopters, planes, rovers and boats. For Copter, its object
        avoidance documentation lists Simple Object Avoidance, BendyRuler, Dijkstra's, and Dijkstra's with BendyRuler{" "}
        <Cite id="ardupilotOA" />. A* is not among the documented path planners, and we do not describe ArduPilot's
        avoidance stack as A*.
      </p>

      <div className="card-grid three">
        <article className="planner-card">
          <header>
            <h3>BendyRuler</h3>
            <span className="pill mono">OA_TYPE = 1</span>
          </header>
          <p>
            “Probes around the vehicle in many directions looking for open spaces”, then picks a direction that is
            sufficiently open while still heading for the destination <Cite id="ardupilotBendy" />. It reacts to
            obstacles seen by proximity sensors.
          </p>
        </article>
        <article className="planner-card">
          <header>
            <h3>Dijkstra's</h3>
            <span className="pill mono">OA_TYPE = 2</span>
          </header>
          <p>
            Builds “safe areas” from the fence and stay-out zones, then finds the shortest path. It “does not support
            avoiding objects sensed with lidar or proximity sensors” <Cite id="ardupilotDijkstra" />.
          </p>
        </article>
        <article className="planner-card">
          <header>
            <h3>Dijkstra's + BendyRuler</h3>
            <span className="pill mono">OA_TYPE = 3</span>
          </header>
          <p>
            Dijkstra's plans around fences; if a proximity-sensed obstacle appears, navigation switches to BendyRuler, and
            returns to Dijkstra's once the view is clear <Cite id="ardupilotDijkstraBendy" />.
          </p>
        </article>
      </div>

      <figure className="decision-flow">
        <figcaption>Dijkstra's + BendyRuler, as described in ArduPilot's documentation (AUTO, GUIDED and RTL modes)</figcaption>
        <ol>
          <li>
            <strong>Dijkstra's</strong>
            <span>shortest path around fences and stay-out zones</span>
          </li>
          <li className="decision">
            <strong>Proximity obstacle detected?</strong>
            <span>
              <em>yes</em> → switch to BendyRuler · <em>no</em> → keep following Dijkstra's
            </span>
          </li>
          <li>
            <strong>BendyRuler</strong>
            <span>local detour toward open space; resume Dijkstra's when clear</span>
          </li>
        </ol>
      </figure>

      <div className="callout">
        <h3>Why this matters for our Build</h3>
        <p>
          ArduPilot's own explanation is that Dijkstra's can find the shortest path around complex fences, but “due to the
          computational complexity it cannot be used for to avoid Proximity based obstacles”, so a fast local method
          handles those <Cite id="ardupilotDijkstraBendy" />. ArduPilot therefore splits planning into a global layer
          and a reactive local layer. Our simulator only models the global layer, with a map that never changes.
          Dijkstra's algorithm is the same search as A* with h(n) = 0. The docs do not say why a heuristic was not used,
          so we do not guess.
        </p>
      </div>

      <PlannerComparison />
    </Section>
  );
}

function PlannerComparison() {
  const rows: { name: string; scope: string; searches: string; documented: ReactNode }[] = [
    {
      name: "A*",
      scope: "Global",
      searches: "Graph search ordered by f = g + h. Finds a minimum-cost path when h never overestimates.",
      documented: <Cite id="hart1968" />,
    },
    {
      name: "Dijkstra's",
      scope: "Global",
      searches: "Graph search ordered by g alone (A* with h = 0). ArduPilot uses it for the shortest path around fences.",
      documented: <Cite id="ardupilotDijkstra" />,
    },
    {
      name: "BendyRuler",
      scope: "Local",
      searches: "Probes directions around the vehicle for open space. Documented as not guaranteeing a shortest path.",
      documented: <Cite id="ardupilotDijkstraBendy" />,
    },
    {
      name: "Hybrid-A*",
      scope: "Global",
      searches: "A*-based search over position and heading with a vehicle motion model and turning radius.",
      documented: <Cite id="nav2SmacHybrid" />,
    },
  ];
  return (
    <div className="table-wrap">
      <table className="compare-table">
        <caption>Planner comparison: documented characteristics only, no scores or rankings</caption>
        <thead>
          <tr>
            <th scope="col">Planner</th>
            <th scope="col">Scope</th>
            <th scope="col">What it does</th>
            <th scope="col">Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <th scope="row">{r.name}</th>
              <td>
                <span className={`scope scope-${r.scope.toLowerCase()}`}>{r.scope}</span>
              </td>
              <td>{r.searches}</td>
              <td>{r.documented}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Constraints() {
  const rows: [string, string, string][] = [
    ["Space", "Static 2D grid, 32 × 20 cells", "Continuous space or fine costmaps, sometimes with height"],
    ["Map", "Known perfectly in advance", "Built from sensors; can be incomplete or out of date"],
    ["Obstacles", "Fixed while the search runs", "Moving or newly detected obstacles that force replanning"],
    ["Cost", "Path length only", "Length plus clearance, terrain or penalty costs"],
    ["Vehicle", "A point that steps in 8 directions", "Kinematics: heading, turning radius, reversing"],
    ["Uncertainty", "None", "Sensor noise and position error"],
    ["Safety", "Walls only", "Margins, fences, stay-out zones, inflated obstacles"],
    ["Compute", "Tiny grid, no time limit", "Results needed within a time budget on onboard hardware"],
    ["Execution", "Search ends at a drawn route", "A controller or autopilot must actually follow the path"],
  ];
  return (
    <Section id="constraints" number={5} title="Why real systems need more">
      <div className="flows">
        <Flow
          tone="aeris"
          label="AERIS (this Build)"
          steps={[{ title: "Grid you draw" }, { title: "A* search" }, { title: "Route on screen" }]}
        />
        <Flow
          tone="real"
          label="A real navigation system (conceptual; real stacks differ)"
          steps={[
            { title: "Map + perception" },
            { title: "Global planning" },
            { title: "Local avoidance" },
            { title: "Control" },
            { title: "Vehicle", note: "new sensor data feeds back in" },
          ]}
        />
      </div>
      <p className="prose">
        The rows below are things a real system <em>may</em> need. Not every system deals with every one. The examples
        above touch on several: Smac adds costs and turning limits, ArduPilot adds a reactive local planner and safety
        margins, and the UAV demo inflates obstacles and replans in simulation.
      </p>
      <div className="table-wrap">
        <table className="compare-table constraints-table">
          <caption>Our Build compared with what real navigation may require</caption>
          <thead>
            <tr>
              <th scope="col" />
              <th scope="col" className="aeris-col">Our Build</th>
              <th scope="col">Real systems may need</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, ours, real]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{ours}</td>
                <td>{real}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function WhatAerisBuilt() {
  return (
    <Section id="aeris" number={6} title="What AERIS built — and what it is not">
      <div className="two-col">
        <div className="prose">
          <p>
            AERIS recreates the core logic of A* in a controlled educational environment. It uses an open set ordered by f
            = g + h, an octile heuristic, √2 diagonal moves without corner cutting, parent links and path reconstruction.
            Every frame of the <a href="#/">simulation</a> is replayed from the engine's recorded search trace, so what you
            see is what the algorithm actually did.
          </p>
          <div className="is-not">
            <h3>It is not</h3>
            <ul className="cross-list">
              <li>an autopilot or a flight controller;</li>
              <li>a complete drone planner (no perception, local avoidance or control);</li>
              <li>a model of real drone energy, wind or flight physics;</li>
              <li>proof that any delivery company uses A*;</li>
              <li>proof that A* is the best planner for drones.</li>
            </ul>
          </div>
        </div>
        <aside className="excluded" aria-labelledby="excluded-title">
          <h3 id="excluded-title">Claims we deliberately don't make</h3>
          <p className="muted small">We found no primary source supporting these, so the page does not state them.</p>
          <ul>
            {EXCLUDED_CLAIMS.map((c) => (
              <li key={c}>
                <s>{c}</s>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </Section>
  );
}

function References() {
  return (
    <Section id="sources" number={7} title="Sources">
      <p className="prose muted small">
        Checked October 2026. Where a documentation site is generated from a public repository, the “page source” link
        goes to the exact file the published page is built from.
      </p>
      <ol className="references">
        {SOURCE_ORDER.map((id) => {
          const s = SOURCES[id];
          return (
            <li key={id} id={`ref-${id}`}>
              <p className="ref-title">
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.title}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </p>
              <p className="ref-publisher">{s.publisher}</p>
              {s.sourceFile && (
                <p className="ref-publisher">
                  <a href={s.sourceFile} target="_blank" rel="noreferrer">
                    Page source on GitHub<span className="sr-only"> for {s.title} (opens in a new tab)</span>
                  </a>
                </p>
              )}
              <dl className="ref-claims">
                <div>
                  <dt>Supports</dt>
                  <dd>{s.supports}</dd>
                </div>
                <div>
                  <dt>Does not show</dt>
                  <dd>{s.doesNotShow}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
