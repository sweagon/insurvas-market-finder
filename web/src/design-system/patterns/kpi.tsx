import { useEffect, useRef, useState } from "react";
import { cn } from "../cn";
import { Info } from "../icons";

/** Count-up hook honoring reduced motion (B.7). */
export function useCountUp(target: number | null, duration = 600, disabled = false): number | null {
  const [value, setValue] = useState(target ?? 0);
  const ref = useRef<number>(target ?? 0);
  useEffect(() => {
    if (target == null) return setValue(0);
    const reduce =
      disabled ||
      (typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) ||
      document.documentElement.dataset.reduceMotion === "1";
    if (reduce) {
      ref.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    const from = ref.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (target - from) * eased;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
      else ref.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, disabled]);
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
    <div className="grid grid-cols-1 divide-y divide-subtle rounded-card border border-subtle bg-surface1 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
      {children}
    </div>
  );
}

export function KpiCell({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="p-[var(--card-pad)]">
      <p className="text-micro uppercase text-tertiary">{label}</p>
      <p className="mt-1.5 num text-num-lg text-primary">{value}</p>
      {children && <div className="mt-1.5">{children}</div>}
    </div>
  );
}
