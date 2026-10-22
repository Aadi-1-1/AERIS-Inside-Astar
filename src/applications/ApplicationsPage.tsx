import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
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
          AERIS shows A* on a small, perfectly known grid. Here is how that connects to real robots and drones, using only
          what we could verify in primary sources.
        </p>
        <section className="short-version" aria-labelledby="short-version-title">
          <h2 id="short-version-title" className="eyebrow">
            The short version
          </h2>
          <ol>
            <li>A* is an established pathfinding algorithm, first published in 1968.</li>
            <li>It is genuinely used in real robot planners, such as ROS 2 Nav2's Smac Planner.</li>
            <li>Autonomous drones don't all use A*: ArduPilot's documented path planners are Dijkstra's and BendyRuler.</li>
            <li>Real navigation adds sensors, changing maps, vehicle limits and safety margins that our grid leaves out.</li>
            <li>AERIS recreates one core planning step, not a complete autonomous aircraft.</li>
          </ol>
        </section>
        <EvidenceKey />
        <nav className="rwa-toc" aria-label="On this page">
          <ol>
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a href={sectionHref(s.id)} onClick={(e) => rescrollIfCurrent(e, s.id)}>
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

/**
 * A link to the section already in the URL changes no hash, so no route update would scroll to
 * it. Scroll directly instead, so the link still works after the reader has scrolled away.
 */
function rescrollIfCurrent(event: MouseEvent<HTMLAnchorElement>, id: string) {
  if (window.location.hash !== sectionHref(id)) return;
  event.preventDefault();
  document.getElementById(id)?.scrollIntoView({ block: "start" });
}

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
            <em>IEEE Transactions on Systems Science and Cybernetics</em> <Cite id="hart1968" />. Their idea: guide the
            search with an estimate of the distance still to go (a <em>heuristic</em>), and prove when that still finds the
            cheapest route.
          </p>
          <p>
            The proof needs conditions on the estimate, so we only claim what holds here. With this Build's moves (8
            directions, cost 1 straight and √2 diagonal, no corner cutting), our octile estimate never overestimates, even
            one step at a time (it is <em>consistent</em>). Our tests also check every route's cost against a separate
            Dijkstra solver.
          </p>
        </div>
        <figure className="formula-card" aria-label="The A* evaluation function: f of n equals g of n plus h of n">
          <p className="formula-main mono">
            f(n) = <span className="term-g">g(n)</span> + <span className="term-h">h(n)</span>
          </p>
          <dl>
            <div>
              <dt className="mono term-g">g(n)</dt>
              <dd>distance travelled from the start to n, by the best route found so far</dd>
            </div>
            <div>
              <dt className="mono term-h">h(n)</dt>
              <dd>estimate of the distance left from n to the goal</dd>
            </div>
            <div>
              <dt className="mono">f(n)</dt>
              <dd>the score: the frontier cell with the lowest f is expanded next</dd>
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
  const planners: { name: string; state: string; body: string; note: string; sources: SourceId[] }[] = [
    {
      name: "Smac 2D",
      state: "(x, y) costmap cells",
      body: "A “cost-aware holonomic A*” for circular differential-drive and omnidirectional robots, moving between 8 neighbouring cells.",
      note: "Closest to AERIS",
      sources: ["nav2Smac2d", "nav2Smac", "smacReadme"],
    },
    {
      name: "Hybrid-A*",
      state: "(x, y, heading)",
      body: "For car-like (Ackermann) and legged robots. It only follows motions the vehicle can drive (Dubin or Reeds-Shepp models) with a minimum turning radius.",
      note: "Respects turning limits",
      sources: ["nav2Smac", "nav2SmacHybrid"],
    },
    {
      name: "State Lattice",
      state: "(x, y, heading) via control sets",
      body: "For robots of any shape, using the same templated A* search with control sets for different drivetrains.",
      note: "Any robot shape",
      sources: ["nav2Smac"],
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
            <p className="card-sources">
              {p.sources.map((id) => (
                <Cite key={id} id={id} />
              ))}
            </p>
          </article>
        ))}
      </div>

      <div className="callout">
        <h3>Why real planners add costs and kinematics</h3>
        <p>
          In AERIS a cell is free or blocked and the robot is a point. Smac 2D instead reads a <em>costmap</em> and steers
          away from high-cost areas; with <code>cost_travel_multiplier</code> set to 0.0 it “acts like a naive binary
          search A*” <Cite id="nav2Smac2d" />, which is essentially what AERIS shows. A car-like robot also cannot turn on
          the spot, so Hybrid-A* adds heading to the search and penalises reversing and turning{" "}
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
        the same cost model as our Build <Cite id="uavDemoPlanner" />.
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
        <Cite id="ardupilotOA" />. A* is not among the documented path planners.
      </p>

      <div className="card-grid two">
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
      </div>

      <figure className="decision-flow">
        <figcaption>
          Combined: Dijkstra's + BendyRuler (<span className="mono">OA_TYPE = 3</span>; AUTO, GUIDED and RTL modes){" "}
          <Cite id="ardupilotDijkstraBendy" />
        </figcaption>
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
          ArduPilot says Dijkstra's finds the shortest path around fences but, “due to the computational complexity”,
          cannot handle obstacles sensed in flight, so a fast local method takes over <Cite id="ardupilotDijkstraBendy" />.
          That is a split into global and local planning; AERIS models only the global part, on a map that never changes.
          Dijkstra's is the same search as A* with h = 0. The docs don't say why no heuristic is used, so we don't guess.
        </p>
      </div>
    </Section>
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
        Not every real system needs every row below, but the examples above each add several: Smac adds costs and turning
        limits, ArduPilot a reactive local planner, and the UAV demo obstacle inflation and replanning.
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
            AERIS recreates the core of A*: a frontier ordered by f = g + h, an octile heuristic, √2 diagonal moves
            without corner cutting, parent links and route reconstruction. Every frame of the <a href="#/">simulation</a>{" "}
            is replayed from the real search, so what you see is what the algorithm actually did.
          </p>
          <div className="is-not">
            <h3>It is not</h3>
            <ul className="cross-list">
              <li>an autopilot or a flight controller;</li>
              <li>a complete drone planner (no perception, local avoidance or control);</li>
              <li>a model of real drone energy, wind or flight physics.</li>
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
              <details className="ref-details">
                <summary>What it supports, and what it does not show</summary>
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
              </details>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
