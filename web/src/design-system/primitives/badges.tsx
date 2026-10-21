import { cn } from "../cn";
import { BadgeCheck, Circle, HelpCircle, Info } from "../icons";

/* ------------------------------------------------------------------ badges */

export type StatusTone = "positive" | "warning" | "negative" | "neutral" | "info";

const statusTones: Record<StatusTone, string> = {
  positive: "bg-positivesubtle text-positive",
  warning: "bg-warningsubtle text-warning",
  negative: "bg-negativesubtle text-negative",
  neutral: "bg-surface3 text-secondary",
  info: "bg-infosubtle text-info",
};

export function StatusPill({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: StatusTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-caption font-medium",
        statusTones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Confidence badge: three-bar icon + High/Medium/Low (D.3). Low is hatched. */
export function ConfidenceBadge({
  level,
  className,
}: {
  level: "high" | "medium" | "low";
  className?: string;
}) {
  const bars =
    level === "high" ? 3 : level === "medium" ? 2 : 1;
  const tone =
    level === "high" ? "text-positive" : level === "medium" ? "text-warning" : "text-warning";
  const label = level === "high" ? "High confidence" : level === "medium" ? "Medium confidence" : "Low confidence";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-caption", className)} title={label}>
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "w-[3px] rounded-[1px]",
              i < bars ? tone.replace("text-", "bg-") : "bg-strong",
              i === 0 && "h-1.5",
              i === 1 && "h-2.5",
              i === 2 && "h-3.5",
            )}
          />
        ))}
      </span>
      <span className={level === "low" ? "text-warning" : "text-secondary"}>{label}</span>
      {level === "low" && <span className="sr-only">Estimates are noisy.</span>}
    </span>
  );
}

/** Robust pick: lime outline, check icon. Shown when P(top 50) >= 0.8. */
export function RobustPickBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border border-positive px-2 py-0.5 text-caption font-medium text-positive",
        className,
      )}
    >
      <BadgeCheck size={12} aria-hidden />
      Robust pick
    </span>
  );
}

/* ------------------------------------------------------------------ numbers */

/** Score chip: 0–100 with a 4px bar underneath (D.3). */
export function ScoreChip({
  value,
  color = "var(--accent)",
  className,
}: {
  value: number | null;
  color?: string;
  className?: string;
}) {
  if (value == null) return <span className="text-tertiary">—</span>;
  return (
    <span className={cn("inline-flex flex-col items-end gap-1", className)}>
      <span className="num text-num-md">{Math.round(value)}</span>
      <span
        className="h-1 w-10 overflow-hidden rounded-pill bg-surface3"
        role="img"
        aria-label={`Score ${Math.round(value)} of 100`}
      >
        <span
          className="block h-full rounded-pill"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
        />
      </span>
    </span>
  );
}

/** Rank badge: numeric in a rounded square; top 3 get a forest tint (R4). */
export function RankBadge({ rank, className }: { rank: number | null; className?: string }) {
  const top = rank != null && rank <= 3;
  return (
    <span
      className={cn(
        "inline-flex h-7 min-w-7 items-center justify-center rounded-chip px-1 font-mono text-mono",
        top ? "bg-accentsubtle text-accenttext" : "bg-surface2 text-secondary",
        className,
      )}
    >
      {rank == null ? "—" : rank}
    </span>
  );
}

/** Two-letter state monogram; the color comes from the lens, never the state. */
export function Monogram({
  abbr,
  color,
  size = 28,
  className,
}: {
  abbr: string;
  color?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-chip font-mono font-semibold",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        background: color ? `color-mix(in oklab, ${color} 18%, transparent)` : "var(--bg-surface-3)",
        color: color ?? "var(--text-secondary)",
      }}
      aria-hidden
    >
      {abbr}
    </span>
  );
}

export function InfoDot({ title }: { title: string }) {
  return (
    <span className="inline-flex text-tertiary" title={title} tabIndex={0} aria-label={title}>
      <Info size={14} aria-hidden />
    </span>
  );
}

export const CountIcon = Circle;
export const HintIcon = HelpCircle;
