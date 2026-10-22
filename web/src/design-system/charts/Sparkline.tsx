import { useId } from "react";
import { withAlpha } from "./color";

/**
 * 60+ growth sparkline (design §D.4). Values are drawn as given; the last
 * point is emphasised so the current reading is readable without a tooltip.
 */
export function Sparkline({
  values,
  width = 96,
  height = 28,
  color = "var(--accent)",
  label,
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  label: string;
  className?: string;
}) {
  const id = useId();
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length < 2) {
    return (
      <span className="text-caption text-tertiary" aria-label={`${label}: no trend data`}>
        —
      </span>
    );
  }
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min || 1;
  const pad = 2;
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = points[points.length - 1].split(",").map(Number);
  const rising = finite[finite.length - 1] >= finite[0];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={`${pad},${height - pad} ${points.join(" ")} ${width - pad},${height - pad}`}
        fill={`url(#${id})`}
      />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2} fill={color} />
      <circle
        cx={last[0]}
        cy={last[1]}
        r={3.5}
        fill={withAlpha(rising ? "#5D8647" : "#B4533A", 0.25)}
      />
    </svg>
  );
}
