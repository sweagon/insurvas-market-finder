import { FLAG_DESCRIPTIONS, type CountyRow, type MetricMeta } from "../../data/types";
import { estimateFlag } from "../../state/estimate";
import { Tooltip } from "../primitives/tooltip";
import { cn } from "../cn";

/**
 * Metric name with an accessible definition tooltip and, when the county's
 * value was imputed or shrunk, an "Estimate" badge naming the treatment.
 * Part G.1: every number must be explainable without leaving the screen.
 */
export function MetricLabel({
  metric,
  county,
  className,
}: {
  metric: MetricMeta;
  county?: CountyRow | null;
  className?: string;
}) {
  const flag = estimateFlag(metric, county);
  const content = (
    <span className="block space-y-1">
      <span className="block font-medium text-primary">{metric.label}</span>
      <span className="block text-secondary">{metric.description}</span>
      <span className="block text-tertiary">
        {metric.source.toUpperCase()} · {metric.vintage} · {metric.unit}
      </span>
      {flag && <span className="block text-tertiary">{FLAG_DESCRIPTIONS[flag]}</span>}
    </span>
  );
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <Tooltip content={content}>
        <button
          type="button"
          aria-label={`About ${metric.label}`}
          className="min-w-0 truncate text-left underline decoration-dotted underline-offset-2 hover:text-primary"
        >
          {metric.label}
        </button>
      </Tooltip>
      {flag && (
        <span
          className="shrink-0 rounded-chip bg-warningsubtle px-1.5 py-0.5 text-micro text-warning"
          title={FLAG_DESCRIPTIONS[flag]}
        >
          Estimate
        </span>
      )}
    </span>
  );
}
