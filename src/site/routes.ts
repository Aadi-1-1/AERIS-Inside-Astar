/**
 * Hash-based routing for the two pages that exist. Hash routes need no server configuration,
 * and `#/applications/<section>` deep-links a section without clashing with the route itself.
 */
export type Page = "simulation" | "applications";

export interface Route {
  readonly page: Page;
  /** Optional in-page section id, e.g. `nav2` in `#/applications/nav2`. */
  readonly section: string | null;
}

export interface NavItem {
  readonly page: Page;
  readonly label: string;
  readonly href: string;
}

/** Only pages that are actually built appear in navigation. */
export const NAV_ITEMS: readonly NavItem[] = [
  { page: "simulation", label: "Simulation", href: "#/" },
  { page: "applications", label: "Real-World Applications", href: "#/applications" },
];

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "applications") return { page: "applications", section: parts[1] ?? null };
  return { page: "simulation", section: null };
}

export function sectionHref(section: string): string {
  return `#/applications/${section}`;
}
