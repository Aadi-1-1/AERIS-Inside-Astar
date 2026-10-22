/**
 * Every source cited on the Real-World Applications page. Each entry records what the source
 * supports and what it does not, so the page never leans on a source for more than it says.
 * Sources were checked in October 2026. Where a docs site is generated from a public repository,
 * `sourceFile` points at the exact file the published page is built from.
 */
export interface Source {
  readonly id: SourceId;
  /** Short label used in inline citation chips. */
  readonly short: string;
  readonly title: string;
  readonly publisher: string;
  readonly url: string;
  readonly sourceFile?: string;
  readonly supports: string;
  readonly doesNotShow: string;
}

export type SourceId =
  | "hart1968"
  | "nav2Smac"
  | "smacReadme"
  | "nav2Smac2d"
  | "nav2SmacHybrid"
  | "nav2NavFn"
  | "ardupilotOA"
  | "ardupilotDijkstraBendy"
  | "ardupilotBendy"
  | "ardupilotDijkstra"
  | "uavDemo"
  | "uavDemoPlanner";

const NAV2_DOCS_SRC =
  "https://github.com/ros-navigation/docs.nav2.org/blob/master/docs/configuration_and_development/configuration_guide/planners_plugins";
const ARDUPILOT_WIKI_SRC = "https://github.com/ArduPilot/ardupilot_wiki/blob/master/common/source/docs";

export const SOURCES: Record<SourceId, Source> = {
  hart1968: {
    id: "hart1968",
    short: "Hart, Nilsson & Raphael 1968",
    title: "A Formal Basis for the Heuristic Determination of Minimum Cost Paths",
    publisher:
      "P. E. Hart, N. J. Nilsson, B. Raphael · IEEE Transactions on Systems Science and Cybernetics, vol. 4, no. 2, pp. 100–107, July 1968 · doi:10.1109/TSSC.1968.300136",
    url: "https://ieeexplore.ieee.org/document/4082128",
    supports:
      "The origin of A*: heuristic information built into a formal theory of graph search, with an optimality property proved for that class of searches.",
    doesNotShow: "Anything about modern robots, drones or which systems use A* today.",
  },
  nav2Smac: {
    id: "nav2Smac",
    short: "Nav2 docs: Smac Planner",
    title: "Smac Planner — Nav2 configuration guide",
    publisher: "Nav2 (ROS 2 Navigation) documentation",
    url: "https://docs.nav2.org/rolling/configuration_and_development/configuration_guide/planners_plugins/smac/",
    sourceFile: `${NAV2_DOCS_SRC}/smac/index.md`,
    supports:
      "“The Smac Planner plugin implements three A* based planning algorithms: 2D A*, Hybrid-A*, and State Lattice path planners”, all built on one templated A* search. It also states the robot types each planner supports: circular differential-drive and omnidirectional (2D), car-like (Ackermann) and legged (Hybrid-A*), and arbitrary shapes (State Lattice).",
    doesNotShow:
      "That all ROS or Nav2 navigation uses A*. Nav2 offers other planner plugins, and each robot integrator chooses which to run.",
  },
  smacReadme: {
    id: "smacReadme",
    short: "nav2_smac_planner README",
    title: "nav2_smac_planner — package README",
    publisher: "ros-navigation/navigation2 on GitHub",
    url: "https://github.com/ros-navigation/navigation2/tree/main/nav2_smac_planner",
    supports:
      "Design details: SmacPlanner2D supports “8-connected neighborhood models”, Hybrid-A* supports Dubin and Reeds-Shepp models, and an AStar template library is shared by the plugins. It also says users have reported using it on delivery robots, industrial robots, vertical farming and solar farms.",
    doesNotShow: "Named production deployments. The user reports are listed without companies or details.",
  },
  nav2Smac2d: {
    id: "nav2Smac2d",
    short: "Nav2 docs: Smac 2D",
    title: "Smac 2D Planner — configuration page (source)",
    publisher: "Nav2 documentation source, ros-navigation/docs.nav2.org",
    url: `${NAV2_DOCS_SRC}/smac/smac_2d/configuring_smac_2d.md`,
    supports:
      "Smac 2D “implements a cost-aware holonomic A* algorithm”; with cost_travel_multiplier set to 0.0 it “acts like a naive binary search A*”.",
    doesNotShow: "Which robots in the field run this planner.",
  },
  nav2SmacHybrid: {
    id: "nav2SmacHybrid",
    short: "Nav2 docs: Smac Hybrid-A*",
    title: "Smac Hybrid-A* Planner — configuration page (source)",
    publisher: "Nav2 documentation source, ros-navigation/docs.nav2.org",
    url: `${NAV2_DOCS_SRC}/smac/smac_hybrid/configuring_smac_hybrid.md`,
    supports:
      "Hybrid-A* searches with a DUBIN or REEDS_SHEPP motion model, 72 heading bins by default, and a minimum_turning_radius, with penalties for reversing, turning and high-cost cells.",
    doesNotShow: "Anything about aerial vehicles, or which robots in the field run this planner.",
  },
  nav2NavFn: {
    id: "nav2NavFn",
    short: "Nav2 docs: NavFn",
    title: "NavFn Planner — configuration page (source)",
    publisher: "Nav2 documentation source, ros-navigation/docs.nav2.org",
    url: `${NAV2_DOCS_SRC}/configuring_navfn.md`,
    supports:
      "NavFn “implements a wavefront Dijkstra or A* expanded holonomic planner”, and its use_astar parameter defaults to false.",
    doesNotShow: "How often integrators choose NavFn, Smac or another planner.",
  },
  ardupilotOA: {
    id: "ardupilotOA",
    short: "ArduPilot docs: Object Avoidance",
    title: "Object Avoidance (Copter)",
    publisher: "ArduPilot documentation",
    url: "https://ardupilot.org/copter/docs/common-object-avoidance-landing-page.html",
    sourceFile: `${ARDUPILOT_WIKI_SRC}/common-object-avoidance-landing-page.rst`,
    supports:
      "The documented avoidance types for Copter: Simple Object Avoidance, BendyRuler, Dijkstra's, and Dijkstra's with BendyRuler. A* is not listed.",
    doesNotShow: "Why ArduPilot chose these algorithms, or what third-party companion computers might run.",
  },
  ardupilotDijkstraBendy: {
    id: "ardupilotDijkstraBendy",
    short: "ArduPilot docs: Dijkstra's + BendyRuler",
    title: "Object Avoidance using Dijkstra's with BendyRuler",
    publisher: "ArduPilot documentation",
    url: "https://ardupilot.org/copter/docs/common-oa-dijkstrabendyruler.html",
    sourceFile: `${ARDUPILOT_WIKI_SRC}/common-oa-dijkstrabendyruler.rst`,
    supports:
      "Dijkstra's plans the shortest path around fences; when a proximity-sensor obstacle is detected, navigation switches to BendyRuler, then resumes Dijkstra's. OA_TYPE = 3; AUTO, GUIDED and RTL modes.",
    doesNotShow: "That A* plays any part in this stack.",
  },
  ardupilotBendy: {
    id: "ardupilotBendy",
    short: "ArduPilot docs: BendyRuler",
    title: "Object Avoidance with Bendy Ruler (source)",
    publisher: "ArduPilot wiki source, ArduPilot/ardupilot_wiki",
    url: `${ARDUPILOT_WIKI_SRC}/common-oa-bendyruler.rst`,
    supports:
      "BendyRuler “probes around the vehicle in many directions looking for open spaces” and picks a sufficiently open direction that still moves toward the destination.",
    doesNotShow: "A shortest-path guarantee; the combined-planner page calls it a local planner that does not guarantee one.",
  },
  ardupilotDijkstra: {
    id: "ardupilotDijkstra",
    short: "ArduPilot docs: Dijkstra's",
    title: "Object Avoidance with Dijkstra's (source)",
    publisher: "ArduPilot wiki source, ArduPilot/ardupilot_wiki",
    url: `${ARDUPILOT_WIKI_SRC}/common-oa-dijkstras.rst`,
    supports:
      "Dijkstra's builds “safe areas” from the fence and stay-out zones and finds the shortest path; it “does not support avoiding objects sensed with lidar or proximity sensors”.",
    doesNotShow: "Anything about A*.",
  },
  uavDemo: {
    id: "uavDemo",
    short: "uav-path-planning-demo (GitHub)",
    title: "Substation UAV Autonomy Demo (uav-path-planning-demo)",
    publisher: "Third-party repository by GitHub user Xieyizhou · MIT licence",
    url: "https://github.com/Xieyizhou/uav-path-planning-demo",
    supports:
      "A height-aware obstacle grid → A* global route → simplified waypoints, flown through MAVSDK against PX4 SITL and Gazebo; 16 of 16 simulated runs passed the project's checks on one map.",
    doesNotShow:
      "That PX4's standard navigation uses A*, or any real-hardware result. The README says “Simulation only; no real UAV hardware validation.”",
  },
  uavDemoPlanner: {
    id: "uavDemoPlanner",
    short: "Demo planner code",
    title: "src/planner/astar_grid.py",
    publisher: "uav-path-planning-demo source code",
    url: "https://github.com/Xieyizhou/uav-path-planning-demo/blob/main/src/planner/astar_grid.py",
    supports:
      "The A* in the demo is the project's own grid search, with an octile heuristic and √2 diagonal moves when diagonals are enabled.",
    doesNotShow: "Anything about PX4 internals; PX4 only receives the resulting waypoints.",
  },
};

/** Order of the reference list. */
export const SOURCE_ORDER: readonly SourceId[] = [
  "hart1968",
  "nav2Smac",
  "smacReadme",
  "nav2Smac2d",
  "nav2SmacHybrid",
  "nav2NavFn",
  "uavDemo",
  "uavDemoPlanner",
  "ardupilotOA",
  "ardupilotDijkstraBendy",
  "ardupilotBendy",
  "ardupilotDijkstra",
];

export type EvidenceCategory = "confirmed" | "research" | "related";

export const CATEGORIES: Record<EvidenceCategory, { label: string; definition: string }> = {
  confirmed: {
    label: "Confirmed A* implementation",
    definition: "Primary documentation explicitly states that A* is used.",
  },
  research: {
    label: "Research / simulation demonstration",
    definition: "A project or demo implements A*, but this is not evidence of production use.",
  },
  related: {
    label: "Related real-world navigation",
    definition: "A real system plans paths, but its documented planner is not A* (or is not stated).",
  },
};

export interface CaseStudy {
  readonly id: string;
  readonly title: string;
  readonly category: EvidenceCategory;
  /** The sources the case's claims rest on. */
  readonly sources: readonly SourceId[];
}

export const CASE_STUDIES: readonly CaseStudy[] = [
  { id: "nav2", title: "ROS 2 Nav2 — Smac Planner", category: "confirmed", sources: ["nav2Smac", "smacReadme", "nav2Smac2d", "nav2SmacHybrid"] },
  { id: "uav-demo", title: "A* global planning in a PX4 SITL / Gazebo simulation", category: "research", sources: ["uavDemo", "uavDemoPlanner"] },
  { id: "ardupilot", title: "ArduPilot object avoidance", category: "related", sources: ["ardupilotOA", "ardupilotDijkstraBendy", "ardupilotBendy", "ardupilotDijkstra"] },
];

/** Claims the page deliberately does not make, because no primary source we checked supports them. */
export const EXCLUDED_CLAIMS: readonly string[] = [
  "Zipline uses A*",
  "Wing uses A*",
  "DJI uses A*",
  "PX4's standard navigation stack uses A*",
  "ArduPilot's standard object avoidance uses A*",
  "All ROS navigation uses A*",
  "AERIS models real drone energy, wind or flight physics",
  "This Build proves A* is the best planner for drones",
];
