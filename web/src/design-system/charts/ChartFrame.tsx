import { useId, useState, type ReactNode } from "react";
import { cn } from "../cn";
import { Chip } from "../primitives/Chip";
import { Button } from "../primitives/Button";
import { EmptyState, ErrorState } from "../patterns/states";
import { Table2, BarChart3 } from "../icons";

export type ChartState = "ready" | "loading" | "empty" | "error";

/**
 * Every chart ships inside a frame that names it, states its vintage, explains
 * itself in one sentence and offers a table twin (design §D.4). Loading, empty
 * and error states are built in so no chart can ship without them.
 */
export function ChartFrame({
  title,
  subtitle,
  vintage,
  summary,
  children,
  table,
  state = "ready",
  emptyReason = "No rows match the current filters.",
  errorReason = "The chart could not be rendered.",
  onRetry,
  actions,
  height = 240,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  vintage?: string;
  summary: string;
  children: ReactNode;
  table?: ReactNode;
  state?: ChartState;
  emptyReason?: string;
  errorReason?: string;
  onRetry?: () => void;
  actions?: ReactNode;
  height?: number;
  className?: string;
}) {
  const [asTable, setAsTable] = useState(false);
  const summaryId = useId();
  const showTable = asTable && table && state === "ready";

  return (
    <figure
      className={cn("rounded-card border border-subtle bg-surface1", className)}
      aria-labelledby={summaryId}
    >
      <header className="flex flex-wrap items-start gap-2 border-b border-subtle px-[var(--card-pad)] py-3">
        <div className="min-w-0">
          <h3 className="text-h3 text-primary">{title}</h3>
          {subtitle && <p className="mt-0.5 text-caption text-tertiary">{subtitle}</p>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {vintage && <Chip tone="neutral">{vintage}</Chip>}
          {actions}
          {table && state === "ready" && (
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={asTable}
              onClick={() => setAsTable((v) => !v)}
              iconLeft={
                asTable ? (
                  <BarChart3 size={14} aria-hidden />
                ) : (
                  <Table2 size={14} aria-hidden />
                )
              }
            >
              {asTable ? "View chart" : "View as table"}
            </Button>
          )}
        </div>
      </header>

      <div className="p-[var(--card-pad)]" aria-live="polite" aria-busy={state === "loading"}>
        {state === "loading" && (
          <div
            className="animate-pulse rounded-control bg-surface2"
            style={{ height }}
            aria-label={`Loading ${title}`}
          />
        )}
        {state === "empty" && (
          <div style={{ minHeight: height }}>
            <EmptyState title="Nothing to chart" reason={emptyReason} />
          </div>
        )}
        {state === "error" && (
          <div style={{ minHeight: height }}>
            <ErrorState message={errorReason} onRetry={onRetry} />
          </div>
        )}
        {state === "ready" && showTable && <div className="overflow-x-auto">{table}</div>}
        {state === "ready" && !showTable && children}
      </div>

      <figcaption
        id={summaryId}
        className="border-t border-subtle px-[var(--card-pad)] py-2 text-caption text-tertiary"
      >
        {summary}
      </figcaption>
    </figure>
  );
}
