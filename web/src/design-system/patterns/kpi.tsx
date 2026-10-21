import { useEffect, useRef, useState } from "react";
import { cn } from "../cn";
import { Info } from "../icons";
import { prefersReducedMotion } from "../tokens/motion";

/** True when the user has opted into reduced motion in the app settings. */
function reduceMotionEnabled(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.reduceMotion === "1";
}

/**
 * Count-up hook honoring reduced motion (B.7).
 *
 * The reduced-motion check is made during render so the final value can be
 * returned directly; the animation itself only writes state from a
 * `requestAnimationFrame` callback, never synchronously from an effect.
 */
export function useCountUp(target: number | null, duration = 600, disabled = false): number | null {
  const [value, setValue] = useState(target ?? 0);
  const fromRef = useRef<number>(target ?? 0);
  const reduced = disabled || prefersReducedMotion() || reduceMotionEnabled();

  useEffect(() => {
    if (target == null || reduced) return;
    const start = performance.now();
    const from = fromRef.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (target - from) * eased;
      fromRef.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);

  if (target == null) return 0;
  if (reduced) return target;
  return value;
}

export interface KpiCardProps {
  label: string;
  value: string;
  info?: string;
  delta?: React.ReactNode;
  sparkline?: React.ReactNode;
  link?: () => void;
  className?: string;
}

/** KPI card (D.3, R4/R5): micro label + value + delta + sparkline + corner link. */
export function KpiCard({ label, value, info, delta, sparkline, link, className }: KpiCardProps) {
  return (
    <div className={cn("rounded-card border border-subtle bg-surface1 p-[var(--card-pad)]", className)}>
      <div className="flex items-center gap-1.5">
        <span className="text-micro uppercase text-tertiary">{label}</span>
        {info && (
          <span className="text-tertiary" title={info} aria-label={info}>
            <Info size={12} aria-hidden />
          </span>
        )}
        {link && (
          <button
            type="button"
            onClick={link}
            aria-label={`Open ${label}`}
            className="ml-auto rounded-control p-0.5 text-tertiary hover:text-primary"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </button>
        )}
      </div>
      <div className="mt-2 num text-num-lg text-primary">{value}</div>
      {(delta || sparkline) && (
        <div className="mt-2 flex items-center justify-between">
          {delta}
          {sparkline}
        </div>
      )}
    </div>
  );
}

/** KPI strip (R3): 4 cells with hairline dividers; wraps 4/2/1 by container. */
export function KpiStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-subtle overflow-hidden rounded-card border border-subtle bg-surface1 sm:divide-y-0 lg:grid-cols-4">
      {children}
    </div>
  );
}

export function KpiCell({ label, value, children, valueClassName }: { label: string; value: string; children?: React.ReactNode; valueClassName?: string }) {
  return (
    <div className="min-w-0 p-[var(--card-pad)]">
      <p className="text-micro uppercase text-tertiary">{label}</p>
      <p className={cn("mt-1.5 num text-num-lg text-primary whitespace-nowrap", valueClassName)}>{value}</p>
      {children && <div className="mt-1.5">{children}</div>}
    </div>
  );
}
