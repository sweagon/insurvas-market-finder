import { useMemo, useRef, useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "../cn";
import { Check, ChevronsUpDown, Search } from "../icons";
import { VirtualList } from "./VirtualList";

export interface ComboOption {
  value: string;
  label: string;
  hint?: string;
}

export interface ComboboxProps {
  options: ComboOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  ariaLabel?: string;
  className?: string;
  /** Virtualize when the option list is large (counties). */
  virtual?: boolean;
  size?: "sm" | "md";
}

/** Searchable, keyboard-friendly combobox; virtualized for 3,144 items (D.2). */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  ariaLabel,
  className,
  virtual,
  size = "md",
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.hint?.toLowerCase().includes(q) ?? false),
    );
  }, [options, query]);

  const selected = options.find((o) => o.value === value);
  const shouldVirtualize = virtual ?? filtered.length > 60;
  const height = 280;
  const itemHeight = 36;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        aria-label={ariaLabel}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-control border border-default bg-surface1 px-3 text-body text-primary",
          size === "sm" ? "h-8 text-body-sm" : "h-control",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focusring",
          !selected && "text-tertiary",
          className,
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronsUpDown size={14} aria-hidden className="text-tertiary" />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          sideOffset={6}
          align="start"
          className="z-popover w-[var(--radix-popover-trigger-width)] min-w-64 rounded-panel border border-default bg-surface1 shadow-l3"
        >
          <div className="flex items-center gap-2 border-b border-subtle px-3 py-2">
            <Search size={14} className="text-tertiary" aria-hidden />
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full bg-transparent text-body text-primary outline-none placeholder:text-tertiary"
            />
          </div>
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-caption text-tertiary">No matches.</p>
          ) : shouldVirtualize ? (
            <VirtualList
              items={filtered}
              itemHeight={itemHeight}
              height={height}
              aria-label={ariaLabel}
              renderItem={(o) => (
                <ComboRow
                  key={o.value}
                  option={o}
                  selected={o.value === value}
                  height={itemHeight}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQuery("");
                  }}
                />
              )}
            />
          ) : (
            <div className="max-h-72 overflow-y-auto p-1">
              {filtered.map((o) => (
                <ComboRow
                  key={o.value}
                  option={o}
                  selected={o.value === value}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQuery("");
                  }}
                />
              ))}
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function ComboRow({
  option,
  selected,
  onSelect,
  height,
}: {
  option: ComboOption;
  selected: boolean;
  onSelect: () => void;
  height?: number;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      style={height ? { height } : undefined}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-control px-2 text-left text-body",
        "hover:bg-surface2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focusring",
        selected && "text-primary",
      )}
    >
      <span className="truncate">{option.label}</span>
      <span className="flex items-center gap-2">
        {option.hint && <span className="font-mono text-mono text-tertiary">{option.hint}</span>}
        {selected && <Check size={14} className="text-accenttext" aria-hidden />}
      </span>
    </button>
  );
}
