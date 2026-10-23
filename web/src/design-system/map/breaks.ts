/** Classed-map breaks and small numeric helpers. */

export const MAP_CLASS_COUNT = 7;

/** Deterministic quantile breaks for a set of finite values. */
export function quantileBreaks(values: Iterable<number>, classes = MAP_CLASS_COUNT): number[] {
  const sorted = Array.from(values)
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
  if (!sorted.length) return Array.from({ length: classes - 1 }, (_, i) => ((i + 1) * 100) / classes);
  return Array.from({ length: classes - 1 }, (_, i) => {
    const p = (i + 1) / classes;
    const pos = (sorted.length - 1) * p;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  });
}

/** Index of the class for `value` given internal breaks (always 0..len). */
export function classIndex(value: number, breaks: readonly number[]): number {
  for (let i = 0; i < breaks.length; i += 1) {
    if (value < breaks[i]) return i;
  }
  return breaks.length;
}

/** Keep breaks ordered and inside the 0–100 display domain. */
export function clampBreaks(next: number[], previous: readonly number[]): number[] {
  return next.map((value, i) => {
    const lower = i === 0 ? 0 : (previous[i - 1] ?? 0) + 1;
    const upper = i === next.length - 1 ? 100 : (previous[i + 1] ?? 100) - 1;
    const rounded = Math.round(Math.max(0, Math.min(100, value)));
    return Math.max(lower, Math.min(upper, rounded));
  });
}

/** A compact histogram for the legend (32 bins across 0–100). */
export function histogram(values: Iterable<number>, bins = 32): number[] {
  const out = new Array<number>(bins).fill(0);
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    const i = Math.max(0, Math.min(bins - 1, Math.floor((value / 100) * bins)));
    out[i] += 1;
  }
  return out;
}
