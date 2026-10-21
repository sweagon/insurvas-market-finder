import { cn } from "../cn";
import { HelpCircle, RefreshCw, TriangleAlert } from "../icons";
import { Button } from "../primitives/Button";

/** Wireframe motif (R2): a small dot-matrix block used in empty/error states. */
export function WireframeMotif({ className }: { className?: string }) {
  const cols = 13;
  const rows = 8;
  const dots = Array.from({ length: cols * rows }, (_, i) => i);
  return (
    <svg
      viewBox="0 0 130 80"
      className={cn("h-20 w-32 text-tertiary", className)}
      aria-hidden
      role="presentation"
    >
      {dots.map((i) => {
        const x = (i % cols) * 10 + 5;
        const y = Math.floor(i / cols) * 10 + 5;
        const cx = 65;
        const cy = 40;
        const d = Math.hypot(x - cx, y - cy);
        const r = d < 42 ? 1.6 : 0.8;
        return <circle key={i} cx={x} cy={y} r={r} fill="currentColor" opacity={d < 42 ? 0.5 : 0.25} />;
      })}
    </svg>
  );
}

/** Skeletons matching the final layout; a 2px forest progress line on top. */
export function ProgressLine() {
  return (
    <div className="fixed inset-x-0 top-0 z-sticky h-0.5 overflow-hidden bg-transparent" role="progressbar" aria-label="Loading">
      <div className="h-full w-1/3 animate-[scan_1.2s_ease-in-out_infinite] bg-accent" />
    </div>
  );
}

export function LoadingState({ label = "Loading market data…" }: { label?: string }) {
  return (
    <div className="flex h-full flex-col gap-6 p-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-card bg-surface2" />
        ))}
      </div>
      <div className="h-[420px] animate-pulse rounded-card bg-surface2" />
      <p className="text-caption text-tertiary">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  reason,
  actionLabel,
  onAction,
}: {
  title: string;
  reason: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <WireframeMotif />
      <h3 className="text-h3 text-primary">{title}</h3>
      <p className="max-w-sm text-body text-secondary">{reason}</p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center" role="alert">
      <WireframeMotif className="text-negative" />
      <h3 className="text-h3 text-primary">We could not load the data</h3>
      <p className="max-w-md text-body text-secondary">
        {message}. Check your connection and try again.
      </p>
      {onRetry && (
        <Button variant="primary" iconLeft={<RefreshCw size={16} aria-hidden />} onClick={onRetry}>
          Retry
        </Button>
      )}
      <details className="mt-2 text-caption text-tertiary">
        <summary className="cursor-pointer">Technical details</summary>
        <code className="mt-1 block font-mono text-mono">{message}</code>
      </details>
    </div>
  );
}

/** Partial-data banner: hatched cells plus this notice (D.6). */
export function PartialDataBanner({ count, onDismiss }: { count: number; onDismiss?: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-card border border-warningsubtle bg-warningsubtle px-3 py-2 text-body-sm text-warning">
      <TriangleAlert size={16} aria-hidden />
      <span>
        {count} {count === 1 ? "metric is" : "metrics are"} unavailable here; the score uses state
        medians (flagged).
      </span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="ml-auto text-caption underline">
          Dismiss
        </button>
      )}
    </div>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-1.5 text-caption text-tertiary">
      <HelpCircle size={14} aria-hidden />
      {children}
    </p>
  );
}
