import { describe, expect, it } from "vitest";
import catalog from "./catalog.generated.json";
import {
  LENS_COLOR,
  LENS_LABEL,
  LENS_ORDER,
  SUBSCORE_COLOR,
  SUBSCORE_LABEL,
  SUBSCORE_ORDER,
} from "../state/lensMeta";
import { UNIT_FORMATTERS } from "../state/format";

/**
 * The model-change contract (docs/design/UI_LIVE_CHANGE_PLAYBOOK.md).
 *
 * A config change regenerates catalog.generated.json. These tests make the
 * frontend fail loudly if a new metric, lens or unit was not wired through,
 * instead of rendering a blank label or a raw number.
 */
describe("generated catalogue", () => {
  it("exposes every configured lens and sub-score in order", () => {
    expect(LENS_ORDER).toEqual(Object.keys(catalog.lenses));
    expect(SUBSCORE_ORDER).toEqual(Object.keys(catalog.subscores));
    expect(LENS_ORDER).toContain(catalog.default_lens);
  });

  it("gives every lens and sub-score a label and a distinct colour", () => {
    for (const id of LENS_ORDER) {
      expect(LENS_LABEL[id]).toBeTruthy();
      expect(LENS_COLOR[id]).toMatch(/^#[0-9a-f]{6}$/i);
    }
    for (const id of SUBSCORE_ORDER) {
      expect(SUBSCORE_LABEL[id]).toBeTruthy();
      expect(SUBSCORE_COLOR[id]).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(new Set(LENS_ORDER.map((id) => LENS_COLOR[id])).size).toBe(
      LENS_ORDER.length,
    );
    expect(new Set(SUBSCORE_ORDER.map((id) => SUBSCORE_COLOR[id])).size).toBe(
      SUBSCORE_ORDER.length,
    );
  });

  it("covers every sub-score in every lens and weights each lens to 100", () => {
    for (const id of LENS_ORDER) {
      const weights = catalog.lenses[id].weights as Record<string, number>;
      expect(Object.keys(weights).sort()).toEqual([...SUBSCORE_ORDER].sort());
      const total = Object.values(weights).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(100, 6);
    }
  });

  it("points every metric at a configured sub-score", () => {
    for (const metric of catalog.metrics) {
      expect(SUBSCORE_ORDER).toContain(metric.subscore);
      expect(Array.isArray(metric.flags)).toBe(true);
    }
  });

  it("has a formatter for every declared unit", () => {
    for (const unit of catalog.units) {
      expect(UNIT_FORMATTERS[unit], `missing formatter for ${unit}`).toBeTypeOf(
        "function",
      );
    }
  });
});
