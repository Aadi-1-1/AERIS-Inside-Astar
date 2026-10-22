import { describe, expect, it } from "vitest";
import { NAV_ITEMS, parseRoute, sectionHref } from "./routes";

describe("hash routes", () => {
  it("defaults to the simulation", () => {
    for (const hash of ["", "#", "#/", "#/unknown", "#nav2"]) expect(parseRoute(hash)).toEqual({ page: "simulation", section: null });
  });

  it("recognises the applications page and an optional section", () => {
    expect(parseRoute("#/applications")).toEqual({ page: "applications", section: null });
    expect(parseRoute("#/applications/")).toEqual({ page: "applications", section: null });
    expect(parseRoute("#/applications/ardupilot")).toEqual({ page: "applications", section: "ardupilot" });
    expect(parseRoute(sectionHref("sources"))).toEqual({ page: "applications", section: "sources" });
  });

  it("navigation lists only pages that exist, and every link resolves to its page", () => {
    expect(NAV_ITEMS.map((i) => i.label)).toEqual(["Simulation", "Real-World Applications"]);
    for (const item of NAV_ITEMS) expect(parseRoute(item.href).page).toBe(item.page);
  });
});
