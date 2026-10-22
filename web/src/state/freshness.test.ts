import { describe, expect, it } from "vitest";
import { CATALOG_CONFIG_HASH, type BuildMeta } from "../data/types";
import { dataFreshness, STALE_AFTER_DAYS } from "./freshness";

function meta(overrides: Partial<BuildMeta> = {}): BuildMeta {
  return {
    built_at: new Date().toISOString(),
    config_version: 1,
    config_hash: CATALOG_CONFIG_HASH,
    vintages: {},
    counties: 3144,
    eligible: 2680,
    lenses: [],
    mc_draws: 500,
    ...overrides,
  };
}

describe("dataFreshness", () => {
  it("accepts a recent build made from the same config", () => {
    expect(dataFreshness(meta()).stale).toBe(false);
  });

  it("flags a config hash mismatch even when the build is new", () => {
    const f = dataFreshness(meta({ config_hash: "0000000000000000" }));
    expect(f.configStale).toBe(true);
    expect(f.stale).toBe(true);
  });

  it("flags an aged build even when the config matches", () => {
    const old = new Date(Date.now() - (STALE_AFTER_DAYS + 1) * 86_400_000);
    const f = dataFreshness(meta({ built_at: old.toISOString() }));
    expect(f.aged).toBe(true);
    expect(f.stale).toBe(true);
  });

  it("does not warn on missing or unparseable metadata", () => {
    expect(dataFreshness(null).stale).toBe(false);
    expect(dataFreshness(meta({ built_at: "not-a-date" })).stale).toBe(false);
  });
});
