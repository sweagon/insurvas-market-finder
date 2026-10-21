import { cn } from "../cn";
import { ArrowDown, ArrowUp, Minus } from "../icons";
import { pts } from "../../state/format";

export interface DeltaChipProps {
  value: number | null;
  /** Text context, e.g. "vs US". */
  context?: string;
  /** Unit: "pts" prints points, "pct" prints a percentage. */
  kind?: "pts" | "pct";
  inverted?: boolean;
  className?: string;
}

/**
 * Delta chip (D.3). The arrow carries the meaning; color only reinforces it,
 * so it is never color-only (F.4).
 */
export function DeltaChip({ value, context, kind = "pts", inverted, className }: DeltaChipProps) {
  if (value == null) return <span className="text-tertiary">—</span>;
  const positive = inverted ? value < 0 : value > 0;
  const negative = inverted ? value > 0 : value < 0;
  const Arrow = value === 0 ? Minus : value > 0 ? ArrowUp : ArrowDown;
  const tone = positive ? "text-positive" : negative ? "text-negative" : "text-secondary";
  const label = kind === "pct" ? `${value > 0 ? "+" : ""}${value.toFixed(1)}%` : pts(value);
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-caption font-medium", tone, className)}
    >
      <Arrow size={12} aria-hidden />
      <span className="tnum">{label}</span>
      {context && <span className="text-tertiary">{context}</span>}
      <span className="sr-only">
        {positive ? "above" : negative ? "below" : "equal to"} {context ?? "comparison"}
      </span>
    </span>
  );
}
