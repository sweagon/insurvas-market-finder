/**
 * Python <-> TypeScript scoring parity test.
 *
 * Reads the golden files produced by `python -m tests.parity.generate` and
 * asserts the TS port reproduces every total, sub-score and metric
 * contribution to <= 1e-9. Regenerate the goldens with `make parity`.
 *
 * Missing values are stored as `null` in the golden files (strict JSON), so
 * `null` maps back to `NaN` on both sides.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CONFIG, scoreMatrix } from "./score";

const ROOT = resolve(__dirname, "../../..");
const PARITY = resolve(ROOT, "tests/parity");

type Nullable = number | null;

interface Inputs {
  fips: string[];
  columns: Record<string, Nullable[]>;
  pop: number[];
}
interface Expected {
  lens_order: string[];
  expected: Record<
    string,
    {
      total: Nullable[];
      subscores: Record<string, Nullable[]>;
      contributions: Record<string, Nullable[]>;
      eligibility: boolean[];
      coverage: Nullable[];
      partial: boolean[];
    }
  >;
}

const inputs = JSON.parse(readFileSync(resolve(PARITY, "inputs.json"), "utf-8")) as Inputs;
const goldens = JSON.parse(readFileSync(resolve(PARITY, "expected.json"), "utf-8")) as Expected;

const TOL = 1e-9;

const toF64 = (arr: Nullable[]): Float64Array =>
  Float64Array.from(arr.map((v) => (v === null ? NaN : v)));

const expectClose = (actual: number, expected: Nullable): void => {
  if (expected === null) {
    expect(Number.isNaN(actual)).toBe(true);
    return;
  }
  expect(Number.isFinite(actual)).toBe(true);
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(TOL);
};

describe("Python <-> TypeScript scoring parity", () => {
  const columns: Record<string, Float64Array> = {};
  for (const [id, arr] of Object.entries(inputs.columns)) columns[id] = toF64(arr);
  const pop = Float64Array.from(inputs.pop);

  for (const lensId of goldens.lens_order) {
    it(`matches Python for lens "${lensId}"`, () => {
      const res = scoreMatrix({ fips: inputs.fips, columns, lensId, eligibilityPop: pop });
      const exp = goldens.expected[lensId];

      expect(res.total.length).toBe(exp.total.length);
      for (let i = 0; i < exp.total.length; i++) {
        expectClose(res.total[i], exp.total[i]);
      }

      for (const [sub, arr] of Object.entries(exp.subscores)) {
        for (let i = 0; i < arr.length; i++) {
          expectClose(res.subscores[sub][i], arr[i]);
        }
      }

      for (const [mid, arr] of Object.entries(exp.contributions)) {
        for (let i = 0; i < arr.length; i++) {
          expectClose(res.contributions[mid][i], arr[i]);
        }
      }

      for (let i = 0; i < exp.eligibility.length; i++) {
        expect(res.eligibility[i]).toBe(exp.eligibility[i]);
      }

      for (let i = 0; i < exp.coverage.length; i++) {
        expectClose(res.coverage[i], exp.coverage[i]);
        expect(res.partial[i]).toBe(exp.partial[i]);
      }
    });
  }

  it("scores are reproducible through the shared config", () => {
    expect(CONFIG.default_lens).toBeTruthy();
    expect(Object.keys(CONFIG.lenses).length).toBeGreaterThanOrEqual(5);
  });

  it("treats a missing sub-score as unavailable, not as zero", () => {
    const full = scoreMatrix({ fips: inputs.fips, columns, lensId: "volume", eligibilityPop: pop });
    const noInsurability: Record<string, Float64Array> = {};
    for (const [id, arr] of Object.entries(columns)) {
      if (id === "chronic_burden_composite" || id === "risk_behaviour_composite") continue;
      noInsurability[id] = arr;
    }
    const partial = scoreMatrix({
      fips: inputs.fips,
      columns: noInsurability,
      lensId: "volume",
      eligibilityPop: pop,
    });
    expect(partial.coverage[0]).toBeLessThan(1);
    expect(partial.partial[0]).toBe(true);
    // A county that lost the insurability sub-score is not penalised for it.
    expect(partial.total[0]).toBeGreaterThan(full.total[0]);
  });
});
