import { describe, expect, it } from "vitest";
import { fipsFromPath, pathFor, viewFromPath, VIEW_PATHS } from "./routes";

describe("routes", () => {
  it("maps every navigable view to a unique path", () => {
    const paths = Object.values(VIEW_PATHS);
    expect(new Set(paths).size).toBe(paths.length);
    for (const [view, path] of Object.entries(VIEW_PATHS)) {
      expect(viewFromPath(path)).toBe(view);
      expect(pathFor(view as keyof typeof VIEW_PATHS)).toBe(path);
    }
  });

  it("recognises area and print deep links", () => {
    expect(viewFromPath("/area/06037")).toBe("area");
    expect(viewFromPath("/print/06037")).toBe("print");
    expect(fipsFromPath("/area/06037")).toBe("06037");
    expect(fipsFromPath("/print/06037")).toBe("06037");
    expect(fipsFromPath("/rankings")).toBeNull();
  });

  it("falls back to explore and ignores malformed FIPS", () => {
    expect(viewFromPath("/nope")).toBe("explore");
    expect(viewFromPath("/rankings/")).toBe("rankings");
    expect(fipsFromPath("/area/abc")).toBeNull();
    expect(pathFor("area")).toBeNull();
  });
});
