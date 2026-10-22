import { describe, expect, it } from "vitest";
import type { CountyRow, MetricMeta } from "../data/types";
import { estimateFlag } from "./estimate";

const metric: MetricMeta = {
  id: "ssa_beneficiary_share_65plus",
  label: "SSA beneficiary share (65+)",
  description: "Share of residents 65+ receiving Social Security.",
  subscore: "need",
  source: "ssa_oasdi",
  table_field: "ssa_beneficiary_share_65plus",
  vintage: "December 2025",
  unit: "share",
  direction: "higher_is_better",
  transform: "none",
  moe: "none",
  scored: true,
  modeled: false,
  flags: ["imputed_ssa_share", "shrunk_ssa_share"],
  caveats: "",
};

function county(metrics: Record<string, boolean>): CountyRow {
  return {
    fips: "01001",
    name: "Autauga",
    state: "AL",
    abbr: "AL",
    pop60: 5000,
    metrics,
    scores: {},
  } as unknown as CountyRow;
}

describe("estimateFlag", () => {
  it("returns the active imputation or shrinkage flag", () => {
    expect(estimateFlag(metric, county({ imputed_ssa_share: true }))).toBe("imputed_ssa_share");
    expect(estimateFlag(metric, county({ shrunk_ssa_share: true }))).toBe("shrunk_ssa_share");
  });

  it("returns null for observed values and missing counties", () => {
    expect(estimateFlag(metric, county({}))).toBeNull();
    expect(estimateFlag(metric, null)).toBeNull();
  });
});
