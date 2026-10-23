import { useRef } from "react";
import { cn } from "../cn";
import { RotateCcw } from "../icons";
import { histogram } from "./breaks";

export interface MapLegendProps {
  layerLabel: string;
  values: number[];
  colors: string[];
  breaks: number[];
  onBreaksChange: (breaks: number[]) => void;
  onReset: () => void;
  ineligibleCount: number;
  partialCount: number;
  noDataCount: number;
  vintage: string;
  className?: string;
}

/**
 * Map legend (D.4): class ramp, live histogram, six draggable class breaks,
 * hatch key and vintage. The markers are keyboard-operable sliders.
 */
export function MapLegend({
  layerLabel,
  values,
  colors,
  breaks,
  onBreaksChange,
  onReset,
  ineligibleCount,
  partialCount,
  noDataCount,
  vintage,
  className,
}: MapLegendProps) {
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef<number | null>(null);
  const bins = histogram(values);
  const max = Math.max(1, ...bins);

  const move = (index: number, clientX: number) => {
    const rect = track.current?.getBoundingClientRect();
    if (!rect) return;
    const raw = ((clientX - rect.left) / rect.width) * 100;
    const next = [...breaks];
    const lo = index === 0 ? 1 : breaks[index - 1] + 1;
    const hi = index === breaks.length - 1 ? 99 : breaks[index + 1] - 1;
    next[index] = Math.max(lo, Math.min(hi, raw));
    onBreaksChange(next);
  };

  return (
    <section
      aria-label={`${layerLabel} map legend`}
      className={cn("rounded-card border border-subtle bg-surface1/95 p-3 shadow-l3 backdrop-blur", className)}
    >
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 truncate text-caption font-medium text-primary">{layerLabel}</h2>
        <span className="ml-auto shrink-0 rounded-pill border border-subtle px-1.5 text-micro uppercase text-tertiary">
          {vintage}
        </span>
        <button
          type="button"
          onClick={onReset}
          aria-label="Reset class breaks to quantiles"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-tertiary hover:bg-surface2 hover:text-primary"
        >
          <RotateCcw size={13} aria-hidden />
        </button>
      </div>

      <div ref={track} className="relative mt-2 h-12 touch-none select-none">
        <div className="absolute inset-x-0 bottom-1 top-0 flex items-end gap-px" aria-hidden>
          {bins.map((count, i) => (
            <span
              key={i}
              className="flex-1 rounded-t-sm bg-accent/60"
              style={{ height: `${Math.max(2, (count / max) * 100)}%` }}
            />
          ))}
        </div>
        {breaks.map((value, i) => (
          <button
            key={i}
            type="button"
            role="slider"
            aria-label={`Class break ${i + 1}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(value)}
            aria-valuetext={`${Math.round(value)} out of 100`}
            onPointerDown={(event) => {
              dragging.current = i;
              event.currentTarget.setPointerCapture(event.pointerId);
              move(i, event.clientX);
            }}
            onPointerMove={(event) => {
              if (dragging.current === i) move(i, event.clientX);
            }}
            onPointerUp={(event) => {
              if (dragging.current === i) move(i, event.clientX);
              dragging.current = null;
            }}
            onPointerCancel={() => {
              dragging.current = null;
            }}
            onKeyDown={(event) => {
              const step = event.shiftKey ? 5 : 1;
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next = [...breaks];
              if (event.key === "ArrowLeft") next[i] = Math.max(0, next[i] - step);
              if (event.key === "ArrowRight") next[i] = Math.min(100, next[i] + step);
              if (event.key === "Home") next[i] = 1;
              if (event.key === "End") next[i] = 99;
              const lo = i === 0 ? 1 : next[i - 1] + 1;
              const hi = i === next.length - 1 ? 99 : next[i + 1] - 1;
              next[i] = Math.max(lo, Math.min(hi, next[i]));
              onBreaksChange(next);
            }}
            className="absolute top-0 z-10 flex h-12 w-8 -translate-x-1/2 cursor-ew-resize items-center justify-center rounded-control text-tertiary after:absolute after:inset-y-0 after:-inset-x-2 after:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-focusring"
            style={{ left: `${value}%` }}
          >
            <span className="h-9 w-0.5 rounded-pill bg-primary shadow-l2" aria-hidden />
          </button>
        ))}
      </div>

      <div className="mt-1 flex items-center justify-between text-caption text-tertiary" aria-hidden>
        <span>0</span>
        <span className="flex h-2 min-w-0 flex-1 mx-2 overflow-hidden rounded-pill">
          {colors.map((color, i) => (
            <span key={i} className="flex-1" style={{ background: color }} />
          ))}
        </span>
        <span>100</span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-caption text-tertiary">
        <span className="flex items-center gap-1.5">
          <span className="hatch h-3 w-4 rounded-chip border border-default" aria-hidden />
          Ineligible · {ineligibleCount.toLocaleString()}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-3 w-4 rounded-chip border border-default"
            style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent 0 3px, var(--accent) 3px 4px)" }}
            aria-hidden
          />
          Partial · {partialCount.toLocaleString()}
        </span>
        <span className="col-span-2 text-tertiary">No data · {noDataCount.toLocaleString()}</span>
      </div>
    </section>
  );
}
