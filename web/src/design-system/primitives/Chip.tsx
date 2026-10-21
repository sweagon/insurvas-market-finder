import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../cn";
import { X } from "../icons";

export type ChipTone = "neutral" | "accent" | "positive" | "negative" | "warning" | "info";

const tones: Record<ChipTone, string> = {
  neutral: "bg-surface2 text-secondary border-subtle",
  accent: "bg-accentsubtle text-accenttext border-accentborder",
  positive: "bg-positivesubtle text-positive border-transparent",
  negative: "bg-negativesubtle text-negative border-transparent",
  warning: "bg-warningsubtle text-warning border-transparent",
  info: "bg-infosubtle text-info border-transparent",
};

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone;
  icon?: ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
}

/** Tinted pill. Used for lenses, vintages, applied filters (R3, R7). */
export const Chip = forwardRef<HTMLSpanElement, ChipProps>(
  ({ tone = "neutral", icon, onRemove, removeLabel, className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-caption font-medium",
        tones[tone],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? "Remove filter"}
          className="-mr-1 ml-0.5 rounded-pill p-0.5 text-current hover:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focusring"
        >
          <X size={12} aria-hidden />
        </button>
      )}
    </span>
  ),
);
Chip.displayName = "Chip";
