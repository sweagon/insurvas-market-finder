/**
 * Reference scoring engine - TypeScript port of `pipeline/score/reference.py`.
 *
 * PARITY CONTRACT: this file is a line-by-line mirror of the Python module.
 * `parity.test.ts` asserts agreement with `tests/parity/expected.json` to
 * <= 1e-9. Any numerical change in either file MUST be mirrored in the other.
 *
 * Numerics mirrored from NumPy:
 *  - `quantile` uses linear interpolation over the fully sorted finite values
 *    (NumPy default, method="linear"): pos = q * (n - 1).
 *  - Percentile ranks use the average-rank / (n - 1) convention (SciPy
 *    "average"), with cap ties broken by the pre-winsorisation value, matching
 *    `np.lexsort((tiebreak, values))`.
 *
 * Missing data:
 *  - A sub-score with no usable input is `NaN`, not zero. The weights of the
 *    sub-scores that *are* available are renormalised onto the 0-100 scale and
 *    `coverage`/`partial` report what was missing.
 */

import configJson from "./config.generated.json";

export type Direction = "higher_is_better" | "lower_is_better";
export type Transform = "none" | "log" | "winsor_log";

export interface ScoredMetric {
  id: string;
  subscore: string;
  direction: Direction;
  transform: Transform;
  scored: boolean;
  lens_weights: Record<string, number>;
}

export interface Lens {
  label: string;
  description: string;
  weights: Record<string, number>;
  flip_insurance_sign: boolean;
}

export interface ScoringConfig {
  version: number;
  params: { winsor_lower: number; winsor_upper: number; eligibility_min_60plus: number };
  default_lens: string;
  subscores: string[];
  lenses: Record<string, Lens>;
  metrics: ScoredMetric[];
}

export const CONFIG = configJson as unknown as ScoringConfig;

export interface ScoreResult {
  total: Float64Array;
  subscores: Record<string, Float64Array>;
  contributions: Record<string, Float64Array>;
  eligibility: boolean[];
  /** Share of sub-score weight that was available for each county. */
  coverage: Float64Array;
  /** True when at least one sub-score could not be computed. */
  partial: boolean[];
}

const isFiniteNum = (x: number): boolean => Number.isFinite(x);

/** NumPy-style linear-interpolation quantile over finite values. */
export function quantile(values: number[], q: number): number {
  const finite = values.filter(isFiniteNum).sort((a, b) => a - b);
  const n = finite.length;
  if (n === 0) return NaN;
  if (n === 1) return finite[0];
  const pos = q * (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return finite[lo];
  const frac = pos - lo;
  return finite[lo] + frac * (finite[hi] - finite[lo]);
}

export function winsorize(values: Float64Array, lower: number, upper: number): Float64Array {
  const finiteVals: number[] = [];
  for (let i = 0; i < values.length; i++) if (isFiniteNum(values[i])) finiteVals.push(values[i]);
  const out = Float64Array.from(values);
  if (finiteVals.length === 0) return out;
  const lo = quantile(finiteVals, lower);
  const hi = quantile(finiteVals, upper);
  for (let i = 0; i < out.length; i++) {
    if (isFiniteNum(out[i])) out[i] = Math.min(Math.max(out[i], lo), hi);
  }
  return out;
}

/**
 * Average-rank percentile in [0, 1]; NaN stays NaN; higher is always better.
 * `tiebreak` resolves winsorisation-cap ties by the pre-cap magnitude.
 */
export function percentileRank(
  values: Float64Array,
  direction: Direction,
  tiebreak?: Float64Array,
): Float64Array {
  const out = new Float64Array(values.length).fill(NaN);
  const idx: number[] = [];
  for (let i = 0; i < values.length; i++) if (isFiniteNum(values[i])) idx.push(i);
  const n = idx.length;
  if (n === 0) return out;

  // Sort by (value, tiebreak) ascending - mirrors np.lexsort((tb, vals)).
  idx.sort((a, b) => {
    const va = values[a];
    const vb = values[b];
    if (va !== vb) return va - vb;
    if (tiebreak) {
      const ta = tiebreak[a];
      const tb = tiebreak[b];
      if (ta !== tb) return ta - tb;
    }
    return a - b;
  });

  const pct = new Float64Array(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (
      j + 1 < n &&
      values[idx[j + 1]] === values[idx[i]] &&
      (tiebreak === undefined || tiebreak[idx[j + 1]] === tiebreak[idx[i]])
    ) {
      j++;
    }
    const avgRank = (i + j) / 2;
    const p = n === 1 ? 1 : avgRank / (n - 1);
    for (let k = i; k <= j; k++) pct[k] = p;
    i = j + 1;
  }

  for (let k = 0; k < n; k++) {
    let p = pct[k];
    if (direction === "lower_is_better") p = 1 - p;
    out[idx[k]] = p;
  }
  return out;
}

export function transformMetric(
  values: Float64Array,
  metric: ScoredMetric,
  config: ScoringConfig,
): Float64Array {
  const transformed = Float64Array.from(values);
  if (metric.transform === "log" || metric.transform === "winsor_log") {
    for (let i = 0; i < transformed.length; i++) {
      const v = Math.max(transformed[i], 0);
      transformed[i] = Math.log1p(v);
    }
  }
  const wins = winsorize(transformed, config.params.winsor_lower, config.params.winsor_upper);
  return percentileRank(wins, metric.direction, transformed);
}

export function scoreMatrix(opts: {
  fips: string[];
  columns: Record<string, Float64Array>;
  config?: ScoringConfig;
  lensId?: string;
  eligibilityPop?: Float64Array;
}): ScoreResult {
  const config = opts.config ?? CONFIG;
  const lensId = opts.lensId ?? config.default_lens;
  const lens = config.lenses[lensId];
  const n = opts.fips.length;

  // Percentile ranks per scored metric.
  const pct: Record<string, Float64Array> = {};
  for (const m of config.metrics) {
    if (!m.scored) continue;
    const col = opts.columns[m.id];
    if (!col) continue;
    pct[m.id] = transformMetric(col, m, config);
  }

  // Guaranteed-issue lenses treat higher disease burden as a positive signal.
  const flip = lens.flip_insurance_sign;
  const flipIfInsurability = (sub: string, m: ScoredMetric, arr: Float64Array): Float64Array => {
    if (sub === "insurability" && flip && m.direction === "lower_is_better") {
      const flipped = Float64Array.from(arr);
      for (let i = 0; i < flipped.length; i++) if (isFiniteNum(flipped[i])) flipped[i] = 1 - flipped[i];
      return flipped;
    }
    return arr;
  };

  // Sub-score weights (normalised to 1).
  const lensWeightTotal =
    Object.values(lens.weights).reduce((a, b) => a + b, 0) || 1;
  const subWeights: Record<string, number> = {};
  for (const [k, v] of Object.entries(lens.weights)) subWeights[k] = v / lensWeightTotal;

  // Metric weights within each sub-score (normalised per sub-score).
  const metricWeights: Record<string, number> = {};
  for (const sub of config.subscores) {
    const ids = config.metrics.filter((m) => m.scored && m.subscore === sub);
    const total = ids.reduce((a, m) => a + (m.lens_weights[lensId] ?? 0), 0);
    if (total <= 0) continue;
    for (const m of ids) {
      const w = m.lens_weights[lensId] ?? 0;
      metricWeights[m.id] = w / total;
    }
  }

  const subscores: Record<string, Float64Array> = {};
  const contributions: Record<string, Float64Array> = {};
  const available: Record<string, boolean[]> = {};
  const rawSubContrib: Record<string, Float64Array> = {};

  for (const sub of config.subscores) {
    const metrics = config.metrics.filter((m) => m.scored && m.subscore === sub);
    const weightSum = new Float64Array(n);
    const acc = new Float64Array(n);
    for (const m of metrics) {
      const mw = metricWeights[m.id] ?? 0;
      if (mw <= 0 || !pct[m.id]) continue;
      const arr = flipIfInsurability(sub, m, pct[m.id]);
      for (let i = 0; i < n; i++) {
        if (isFiniteNum(arr[i])) {
          acc[i] += arr[i] * mw;
          weightSum[i] += mw;
        }
      }
    }
    // A sub-score with no usable input is unavailable (NaN), not zero.
    const hasData: boolean[] = [];
    const subScore = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      hasData.push(weightSum[i] > 0);
      subScore[i] = weightSum[i] > 0 ? acc[i] / weightSum[i] : NaN;
    }
    available[sub] = hasData;
    subscores[sub] = subScore;

    const sw = subWeights[sub] ?? 0;
    const subContrib = new Float64Array(n);
    for (let i = 0; i < n; i++) subContrib[i] = hasData[i] ? subScore[i] * sw * 100 : 0;
    rawSubContrib[sub] = subContrib;

    for (const m of metrics) {
      const mw = metricWeights[m.id] ?? 0;
      const contrib = new Float64Array(n);
      if (mw > 0 && pct[m.id]) {
        const arr = flipIfInsurability(sub, m, pct[m.id]);
        for (let i = 0; i < n; i++) {
          const valid = isFiniteNum(arr[i]);
          const denom = weightSum[i] > 0 ? weightSum[i] : 1;
          const share = valid ? mw / denom : 0;
          contrib[i] = subContrib[i] * share;
        }
      }
      contributions[m.id] = contrib;
    }
  }

  // Renormalise onto the 0-100 scale over the sub-scores that are available
  // for each county. Mirrors `pipeline/score/reference.py`.
  const weightAvailable = new Float64Array(n);
  for (const sub of config.subscores) {
    const sw = subWeights[sub] ?? 0;
    const has = available[sub] ?? [];
    for (let i = 0; i < n; i++) if (has[i]) weightAvailable[i] += sw;
  }
  const scale = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    scale[i] = weightAvailable[i] > 0 ? 1 / weightAvailable[i] : NaN;
  }

  const total = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (const sub of config.subscores) sum += rawSubContrib[sub][i];
    total[i] = sum * scale[i];
  }
  for (const id of Object.keys(contributions)) {
    const arr = contributions[id];
    for (let i = 0; i < n; i++) arr[i] *= scale[i];
  }

  const partial: boolean[] = [];
  for (let i = 0; i < n; i++) partial.push(weightAvailable[i] < 1 - 1e-9);

  let eligibility: boolean[];
  if (opts.eligibilityPop) {
    eligibility = Array.from(opts.eligibilityPop, (p) => p >= config.params.eligibility_min_60plus);
  } else {
    eligibility = new Array(n).fill(true);
  }

  return { total, subscores, contributions, eligibility, coverage: weightAvailable, partial };
}
