import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../cn";

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  "aria-label"?: string;
}

/**
 * Minimal windowing helper (no dependency). Keeps the DOM to the visible
 * window plus overscan, so 3,144-row lists and comboboxes stay at 60fps (F.5).
 */
export function VirtualList<T>({
  items,
  itemHeight,
  height,
  overscan = 6,
  renderItem,
  className,
  ...rest
}: VirtualListProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const onScroll = useCallback(() => {
    if (ref.current) setScrollTop(ref.current.scrollTop);
  }, []);

  useEffect(() => {
    setScrollTop(ref.current?.scrollTop ?? 0);
  }, [items]);

  const total = items.length;
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visible = Math.ceil(height / itemHeight) + overscan * 2;
  const end = Math.min(total, start + visible);
  const slice = items.slice(start, end);

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      style={{ height, overflowY: "auto" }}
      className={cn("relative", className)}
      role="listbox"
      {...rest}
    >
      <div style={{ height: total * itemHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${start * itemHeight}px)` }}>
          {slice.map((item, i) => renderItem(item, start + i))}
        </div>
      </div>
    </div>
  );
}
