import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "../cn";

export interface SliderProps {
  value: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange: (v: number[]) => void;
  /** Optional histogram: bin heights 0..1 drawn behind the track. */
  histogram?: number[];
  "aria-label"?: string;
  className?: string;
}

/** Range-capable slider with an optional histogram behind the track (D.2). */
export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  histogram,
  className,
  ...rest
}: SliderProps) {
  return (
    <div className={cn("relative flex h-6 items-center", className)}>
      {histogram && histogram.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-6 items-end gap-px px-2.5" aria-hidden>
          {histogram.map((h, i) => (
            <span
              key={i}
              className="flex-1 rounded-sm bg-accent"
              style={{ height: `${Math.max(2, h * 100)}%`, opacity: 0.18 }}
            />
          ))}
        </div>
      )}
      <SliderPrimitive.Root
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={onValueChange}
        className="relative flex w-full touch-none items-center"
        {...rest}
      >
        <SliderPrimitive.Track className="relative h-1 w-full grow rounded-pill bg-surface3">
          <SliderPrimitive.Range className="absolute h-full rounded-pill bg-accent" />
        </SliderPrimitive.Track>
        {value.map((_, i) => (
          <SliderPrimitive.Thumb
            key={i}
            className={cn(
              "block h-4 w-4 rounded-pill bg-surface1 shadow-l2",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focusring",
            )}
            style={{ border: "2px solid var(--accent)" }}
          />
        ))}
      </SliderPrimitive.Root>
    </div>
  );
}
