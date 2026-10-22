import { cn } from "../cn";

export interface LegendItem {
  id: string;
  label: string;
  color?: string;
  hatch?: boolean;
}

/** Toggle legend (R5). Hatch swatches are explained in the tooltip copy. */
export function ChartLegend({
  items,
  active,
  onToggle,
  className,
}: {
  items: LegendItem[];
  active: Record<string, boolean>;
  onToggle: (id: string) => void;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5", className)}>
      {items.map((item) => {
        const on = active[item.id] ?? true;
        return (
          <li key={item.id}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(item.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-control px-1 py-0.5 text-caption transition-opacity duration-fast hover:bg-surface2",
                on ? "text-secondary" : "text-tertiary opacity-60",
              )}
            >
              {item.hatch ? (
                <svg width={12} height={12} aria-hidden viewBox="0 0 12 12">
                  <rect width={12} height={12} rx={2} fill="var(--surface-3)" />
                  <path d="M-2 4 4 -2M0 12 12 0M6 14 14 6" stroke={item.color ?? "var(--text-tertiary)"} strokeWidth={1} />
                </svg>
              ) : (
                <span
                  aria-hidden
                  className="size-2.5 rounded-[2px]"
                  style={{ background: item.color ?? "var(--text-tertiary)" }}
                />
              )}
              {item.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
