import { useId } from "react";
import { cn } from "../cn";

/**
 * Median dot with a p05–p95 line (design §D.4). Shows the uncertainty of a
 * percentile rank without implying a point estimate is exact.
 */
export function RankWhisker({
  p05,
  p50,
  p95,
  label,
  color = "var(--accent)",
  className,
  showValues = false,
  min = 0,
  max = 100,
}: {
  p05: number;
  p50: number;
  p95: number;
  label: string;
  color?: string;
  className?: string;
  showValues?: boolean;
  min?: number;
  max?: number;
}) {
  const id = useId();
  const span = max - min || 1;
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const lo = clamp(Number.isFinite(p05) ? p05 : p50);
  const hi = clamp(Number.isFinite(p95) ? p95 : p50);
  const mid = clamp(Number.isFinite(p50) ? p50 : (lo + hi) / 2);
  const width = 120;
  const height = 16;
  const x = (v: number) => 4 + ((v - min) / span) * (width - 8);

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label}: median ${mid.toFixed(0)}, range ${lo.toFixed(0)} to ${hi.toFixed(0)}`}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.75} />
          </linearGradient>
        </defs>
        <line x1={x(lo)} x2={x(hi)} y1={height / 2} y2={height / 2} stroke={`url(#${id})`} strokeWidth={3} strokeLinecap="round" />
        <line x1={x(lo)} x2={x(lo)} y1={5} y2={height - 5} stroke={color} strokeWidth={1} opacity={0.6} />
        <line x1={x(hi)} x2={x(hi)} y1={5} y2={height - 5} stroke={color} strokeWidth={1} opacity={0.6} />
        <circle cx={x(mid)} cy={height / 2} r={3.5} fill={color} stroke="var(--bg-surface-1)" strokeWidth={1.5} />
      </svg>
      {showValues && (
        <span className="font-mono text-micro text-tertiary">
          {lo.toFixed(0)}–{hi.toFixed(0)}
        </span>
      )}
    </div>
  );
}
