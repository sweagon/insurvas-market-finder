/**
 * Python <-> TypeScript scoring parity test.
 *
 * Reads the golden files produced by `python -m tests.parity.generate` and
 * asserts the TS port reproduces every total, sub-score and metric
 * contribution to <= 1e-9. Regenerate the goldens with `make parity`.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CONFIG, scoreMatrix } from "./score";

const ROOT = resolve(__dirname, "../../..");
const PARITY = resolve(ROOT, "tests/parity");

interface Inputs {
  fips: string[];
  columns: Record<string, number[]>;
  pop: number[];
}
interface Expected {
  lens_order: string[];
  expected: Record<
    string,
    {
      total: number[];
      subscores: Record<string, number[]>;
      contributions: Record<string, number[]>;
      eligibility: boolean[];
    }
  >;
}

const inputs = JSON.parse(readFileSync(resolve(PARITY, "inputs.json"), "utf-8")) as Inputs;
const goldens = JSON.parse(readFileSync(resolve(PARITY, "expected.json"), "utf-8")) as Expected;

const TOL = 1e-9;

describe("Python <-> TypeScript scoring parity", () => {
  const columns: Record<string, Float64Array> = {};
  for (const [id, arr] of Object.entries(inputs.columns)) columns[id] = Float64Array.from(arr);
  const pop = Float64Array.from(inputs.pop);

  for (const lensId of goldens.lens_order) {
    it(`matches Python for lens "${lensId}"`, () => {
      const res = scoreMatrix({ fips: inputs.fips, columns, lensId, eligibilityPop: pop });
      const exp = goldens.expected[lensId];

      expect(res.total.length).toBe(exp.total.length);
      for (let i = 0; i < exp.total.length; i++) {
        expect(Math.abs(res.total[i] - exp.total[i])).toBeLessThanOrEqual(TOL);
      }

      for (const [sub, arr] of Object.entries(exp.subscores)) {
        for (let i = 0; i < arr.length; i++) {
          expect(Math.abs(res.subscores[sub][i] - arr[i])).toBeLessThanOrEqual(TOL);
        }
      }

      for (const [mid, arr] of Object.entries(exp.contributions)) {
        for (let i = 0; i < arr.length; i++) {
          expect(Math.abs(res.contributions[mid][i] - arr[i])).toBeLessThanOrEqual(TOL);
        }
      }

      for (let i = 0; i < exp.eligibility.length; i++) {
        expect(res.eligibility[i]).toBe(exp.eligibility[i]);
      }
    });
  }

  it("scores are reproducible through the shared config", () => {
    expect(CONFIG.default_lens).toBeTruthy();
    expect(Object.keys(CONFIG.lenses).length).toBeGreaterThanOrEqual(5);
  });
});
