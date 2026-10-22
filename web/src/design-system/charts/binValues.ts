export interface HistogramBin {
  start: number;
  end: number;
  count: number;
}

export function binValues(values: number[], bins = 20): HistogramBin[] {
  const finite = values.filter((v) => Number.isFinite(v));
  if (!finite.length) return [];
  let min = Math.min(...finite);
  let max = Math.max(...finite);
  if (min === max) {
    min -= 0.5;
    max += 0.5;
  }
  const step = (max - min) / bins;
  const out = Array.from({ length: bins }, (_, i) => ({
    start: min + i * step,
    end: min + (i + 1) * step,
    count: 0,
  }));
  for (const v of finite) {
    const idx = Math.min(bins - 1, Math.floor((v - min) / step));
    out[idx].count += 1;
  }
  return out;
}
