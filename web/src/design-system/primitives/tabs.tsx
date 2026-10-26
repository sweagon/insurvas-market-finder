import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../cn";

/* Underline tabs (R3): a sliding forest underline. */
export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <TabsPrimitive.List
      className={cn("flex items-center gap-4 border-b border-subtle", className)}
    >
      {children}
    </TabsPrimitive.List>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        "-mb-px border-b-2 border-transparent px-1 pb-3 pt-2 text-body font-medium text-secondary transition-colors duration-fast",
        "hover:text-primary",
        "data-[state=active]:border-accent data-[state=active]:text-primary",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focusring",
        className,
      )}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

/** Pill tabs (R5): track in surface-2, selected pill raised. */
export function PillTabs({
  value,
  onValueChange,
  options,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex h-8 items-center gap-0.5 rounded-pill border border-subtle bg-surface2 p-0.5",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(o.value)}
            className={cn(
              "rounded-pill px-3 py-1 text-caption font-medium transition-colors duration-fast",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focusring",
              active
                ? "border border-subtle bg-surface3 text-primary"
                : "text-secondary hover:text-primary",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Segmented control (R2): Counties / States, Radar / Bars, Chart / Table. */
export function SegmentedControl({
  value,
  onValueChange,
  options,
  className,
  size = "md",
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: React.ReactNode; icon?: React.ReactNode }[];
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-control border border-subtle bg-surface2 p-0.5",
        size === "sm" ? "h-8" : "h-control",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onValueChange(o.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[6px] font-medium transition-colors duration-fast",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focusring",
              "h-full",
              size === "sm" ? "px-2 text-caption" : "px-2.5 text-body-sm",
              active ? "bg-surface3 text-primary shadow-l2" : "text-secondary hover:text-primary",
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
