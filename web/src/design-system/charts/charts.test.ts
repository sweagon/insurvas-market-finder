import { describe, expect, it } from "vitest";
import { binValues } from "./binValues";
import { readableText, withAlpha } from "./color";

describe("chart helpers", () => {
  it("bins values into contiguous counts without dropping any", () => {
    const bins = binValues([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 5);
    expect(bins).toHaveLength(5);
    expect(bins.reduce((sum, b) => sum + b.count, 0)).toBe(10);
    expect(bins[0].start).toBe(0);
    expect(bins[4].end).toBe(9);
  });

  it("handles a single repeated value and empties", () => {
    const bins = binValues([5, 5, 5], 4);
    expect(bins.reduce((sum, b) => sum + b.count, 0)).toBe(3);
    expect(binValues([], 4)).toEqual([]);
    expect(binValues([Number.NaN], 4)).toEqual([]);
  });

  it("converts hex and passes through colour functions", () => {
    expect(withAlpha("#5D8647", 0.2)).toBe("rgba(93, 134, 71, 0.2)");
    expect(withAlpha("#fff", 0.5)).toBe("rgba(255, 255, 255, 0.5)");
    expect(withAlpha("var(--accent)", 0.2)).toBe("var(--accent)");
  });

  it("picks readable label text for a fill", () => {
    expect(readableText("#DCE8D2")).toBe("#14110c");
    expect(readableText("#5D8647")).toBe("#fffaf0");
  });
});
