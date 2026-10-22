import type { CountyRow, MetricMeta } from "../data/types";

/** The first active estimate flag for this county/metric, if any. */
export function estimateFlag(
  metric: MetricMeta,
  county: CountyRow | null | undefined,
): string | null {
  if (!county) return null;
  return metric.flags.find((flag) => Boolean(county.metrics?.[flag])) ?? null;
}
