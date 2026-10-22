import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "../site/SiteHeader";
import { ApplicationsPage } from "./ApplicationsPage";
import { CASE_STUDIES, CATEGORIES, EXCLUDED_CLAIMS, SOURCES, SOURCE_ORDER } from "./sources";

const html = renderToStaticMarkup(<ApplicationsPage section={null} />);
const text = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");

/** The markup of the element with this id, up to the next section. */
function sectionMarkup(id: string): string {
  const start = html.indexOf(`id="${id}"`);
  expect(start).toBeGreaterThan(-1);
  const next = html.indexOf('<section class="rwa-section"', start + 1);
  return html.slice(start, next === -1 ? undefined : next);
}

describe("Real-World Applications page", () => {
  it("renders the hero and all seven sections", () => {
    expect(html).toContain("Where A* meets the real world");
    for (const id of ["origins", "nav2", "uav-demo", "ardupilot", "constraints", "aeris", "sources"]) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it("each case study shows exactly its own evidence category", () => {
    const expected = { nav2: "confirmed", "uav-demo": "research", ardupilot: "related" };
    expect(Object.fromEntries(CASE_STUDIES.map((c) => [c.id, c.category]))).toEqual(expected);
    for (const study of CASE_STUDIES) {
      const markup = sectionMarkup(study.id);
      expect(markup).toContain(`evidence-badge evidence-${study.category}`);
      for (const other of Object.keys(CATEGORIES)) {
        if (other !== study.category) expect(markup).not.toContain(`evidence-badge evidence-${other}`);
      }
      // Every source the case rests on is linked inside the case itself, not only in the reference list.
      for (const id of study.sources) expect(markup).toContain(`href="${SOURCES[id].url}"`);
    }
  });

  it("links the required primary sources", () => {
    const required = [
      "https://ieeexplore.ieee.org/document/4082128",
      "https://docs.nav2.org/rolling/configuration_and_development/configuration_guide/planners_plugins/smac/",
      "https://ardupilot.org/copter/docs/common-object-avoidance-landing-page.html",
      "https://ardupilot.org/copter/docs/common-oa-dijkstrabendyruler.html",
      "https://github.com/Xieyizhou/uav-path-planning-demo",
    ];
    for (const url of required) expect(html).toContain(`href="${url}"`);
  });

  it("lists every source in the references with what it supports and what it does not show", () => {
    const refs = sectionMarkup("sources");
    expect(SOURCE_ORDER).toHaveLength(Object.keys(SOURCES).length);
    for (const id of SOURCE_ORDER) {
      expect(refs).toContain(`id="ref-${id}"`);
      expect(text(refs)).toContain(SOURCES[id].supports.replace(/\s+/g, " "));
      expect(text(refs)).toContain(SOURCES[id].doesNotShow.replace(/\s+/g, " "));
    }
    // External links open safely.
    for (const tag of html.match(/<a [^>]*target="_blank"[^>]*>/g) ?? []) expect(tag).toContain('rel="noreferrer"');
  });

  it("never states an excluded claim outside the 'claims we don't make' list", () => {
    const excludedStart = html.indexOf('<aside class="excluded"');
    const withoutExcludedList = html.slice(0, excludedStart) + html.slice(html.indexOf("</aside>", excludedStart));
    const body = text(withoutExcludedList);
    for (const claim of EXCLUDED_CLAIMS) expect(body).not.toContain(claim);
    // Any "uses A*" wording elsewhere must sit in a negation: a does-not-prove item ("That PX4 ...")
    // or the "It is not ... proof that ..." list.
    for (const match of body.matchAll(/uses A\*/g)) {
      const before = body.slice(Math.max(0, match.index! - 60), match.index);
      expect(before).toMatch(/That |not |n't|proof that /);
    }
  });

  it("states optimality only as far as this Build supports it", () => {
    const body = text(html);
    expect(body).not.toMatch(/always a shortest one/);
    expect(body).not.toMatch(/guaranteed to return a minimum-cost path/);
    expect(body).toMatch(/check every route's cost against a separate Dijkstra solver/);
  });

  it("the ArduPilot case names Dijkstra's and BendyRuler and is not presented as A*", () => {
    const markup = text(sectionMarkup("ardupilot"));
    expect(markup).toContain("Dijkstra's");
    expect(markup).toContain("BendyRuler");
    expect(markup).toContain("A* is not among the documented path planners");
    expect(markup).not.toMatch(/ArduPilot (uses|runs) A\*/);
  });

  it("the PX4 demo is labelled third-party and simulation-only", () => {
    const markup = text(sectionMarkup("uav-demo"));
    expect(markup).toContain("third-party");
    expect(markup).toContain("Simulation only; no real UAV hardware validation.");
    expect(markup).toContain("The A* is the project's own code, not part of PX4.");
  });
});

describe("site header", () => {
  it("marks the current page", () => {
    const sim = renderToStaticMarkup(<SiteHeader page="simulation" />);
    expect(sim).toMatch(/href="#\/" aria-current="page"/);
    const apps = renderToStaticMarkup(<SiteHeader page="applications" />);
    expect(apps).toMatch(/href="#\/applications" aria-current="page"/);
    expect(apps).not.toMatch(/href="#\/" aria-current/);
  });
});
