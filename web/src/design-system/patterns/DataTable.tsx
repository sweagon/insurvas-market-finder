import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "../cn";
import { Button } from "../primitives/Button";
import { Checkbox } from "../primitives/inputs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../primitives/dropdownMenu";
import { EmptyState } from "./states";
import { usePreferences } from "../providers/PreferencesProvider";
import { ArrowDown, ArrowUp, Check, ChevronDown, GripVertical, SlidersHorizontal } from "../icons";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  width: number;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => number | string;
  align?: "left" | "right";
  hidden?: boolean;
  /** Pin to the left edge. Only the first two visible columns can pin. */
  sticky?: boolean;
}

/**
 * Virtualized data table (design §D.3.1): sticky header and first columns,
 * sorting, column visibility and resizing, selection ranges, roving keyboard
 * navigation, density, disabled rows and a footer with totals.
 */
export function DataTable<T>({
  rows,
  columns,
  getRowId,
  caption,
  onActivate,
  selectedIds,
  onSelectedChange,
  compareIds = [],
  onToggleCompare,
  onBulkCompare,
  onBulkExport,
  onExport,
  isDisabled,
  height = 560,
  initialSort,
  loading = false,
}: {
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  caption: string;
  onActivate: (row: T) => void;
  selectedIds?: Set<string>;
  onSelectedChange?: (ids: Set<string>) => void;
  compareIds?: string[];
  onToggleCompare?: (id: string) => void;
  onBulkCompare?: () => void;
  onBulkExport?: () => void;
  onExport?: () => void;
  isDisabled?: (row: T) => boolean;
  height?: number;
  initialSort?: { id: string; desc: boolean };
  loading?: boolean;
}) {
  const { density, toggleDensity } = usePreferences();
  const rowHeight = density === "compact" ? 46 : 58;
  const [sorting, setSorting] = useState<SortingState>(
    initialSort ? [{ id: initialSort.id, desc: initialSort.desc }] : [],
  );
  const [visibility, setVisibility] = useState<VisibilityState>(() =>
    Object.fromEntries(columns.filter((c) => c.hidden).map((c) => [c.id, false])),
  );
  const [widths, setWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(columns.map((c) => [c.id, c.width])),
  );
  const [active, setActive] = useState(0);
  const selectAnchor = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selected = selectedIds ?? new Set<string>();

  const defs = useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((c) => ({
        id: c.id,
        header: c.header,
        accessorFn: (row: T) => (c.sortValue ? c.sortValue(row) : ""),
        enableSorting: Boolean(c.sortValue),
        cell: ({ row }) => c.cell(row.original),
        meta: { align: c.align, sticky: c.sticky },
      })),
    [columns],
  );

  const table = useReactTable({
    data: rows,
    columns: defs,
    state: { sorting, columnVisibility: visibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => getRowId(row),
  });

  const modelRows = table.getRowModel().rows;
  const visibleCols = table.getVisibleLeafColumns();

  const virtualizer = useVirtualizer({
    count: modelRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  });

  const totalWidth = visibleCols.reduce((sum, col) => sum + (widths[col.id] ?? 120), 42);

  useEffect(() => {
    virtualizer.measure();
  }, [rowHeight, virtualizer]);

  const move = useCallback(
    (next: number) => {
      if (!modelRows.length) return;
      const clamped = Math.max(0, Math.min(modelRows.length - 1, next));
      setActive(clamped);
      virtualizer.scrollToIndex(clamped, { align: "auto" });
    },
    [modelRows.length, virtualizer],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    // Keep keys scoped to the grid itself; checkboxes and menu buttons handle
    // their own activation.
    if (event.target !== event.currentTarget) return;
    const row = modelRows[active]?.original;
    if (!row) return;
    if (event.key === "ArrowDown" || event.key === "j") {
      event.preventDefault();
      move(active + 1);
    } else if (event.key === "ArrowUp" || event.key === "k") {
      event.preventDefault();
      move(active - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      move(0);
    } else if (event.key === "End") {
      event.preventDefault();
      move(modelRows.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      onActivate(row);
    } else if (event.key === " " && onSelectedChange) {
      event.preventDefault();
      const next = new Set(selected);
      const id = getRowId(row);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      selectAnchor.current = active;
      onSelectedChange(next);
    } else if (event.key.toLowerCase() === "c" && onToggleCompare) {
      event.preventDefault();
      onToggleCompare(getRowId(row));
    }
  };

  const toggleAt = (index: number, shift: boolean) => {
    if (!onSelectedChange) return;
    const next = new Set(selected);
    const from = shift && selectAnchor.current !== null ? selectAnchor.current : index;
    const [lo, hi] = from <= index ? [from, index] : [index, from];
    const ids = modelRows.slice(lo, hi + 1).map((r) => r.id);
    const adding = !selected.has(modelRows[index]?.id ?? "");
    for (const id of ids) {
      if (adding) next.add(id);
      else next.delete(id);
    }
    selectAnchor.current = index;
    onSelectedChange(next);
  };

  const startResize = (id: string, event: React.PointerEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = widths[id] ?? 120;
    const onMove = (e: PointerEvent) => {
      setWidths((w) => ({ ...w, [id]: Math.max(64, startWidth + e.clientX - startX) }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const gridTemplate = [42, ...visibleCols.map((c) => widths[c.id] ?? 120)]
    .map((w) => `${w}px`)
    .join(" ");

  const allSelected = modelRows.length > 0 && modelRows.every((r) => selected.has(r.id));
  const someSelected = modelRows.some((r) => selected.has(r.id));

  return (
    <div className="overflow-hidden rounded-card border border-subtle bg-surface1">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-accentborder bg-accentsubtle px-3 py-2 text-body-sm">
          <span className="text-accenttext">{selected.size.toLocaleString()} selected</span>
          {onBulkCompare && <Button size="sm" variant="secondary" onClick={onBulkCompare}>Compare</Button>}
          {onBulkExport && <Button size="sm" variant="secondary" onClick={onBulkExport}>Export</Button>}
          <Button size="sm" variant="ghost" onClick={() => onSelectedChange?.(new Set())}>Clear</Button>
        </div>
      )}

      <div
        ref={scrollRef}
        role="grid"
        aria-label={caption}
        aria-rowcount={modelRows.length}
        aria-colcount={visibleCols.length + 1}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onFocus={() => {
          if (modelRows.length && !modelRows[active]) setActive(0);
        }}
        style={{ height, overflow: "auto" }}
        className="relative focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focusring"
      >
        <div style={{ width: totalWidth, minWidth: "100%" }}>
          <div
            role="row"
            aria-rowindex={1}
            className="sticky top-0 z-20 grid items-center gap-0 border-b border-default bg-surface2 text-micro uppercase text-tertiary"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <div role="columnheader" className="sticky left-0 z-30 flex h-9 items-center justify-center bg-surface2">
              <Checkbox
                checked={allSelected}
                indeterminate={!allSelected && someSelected}
                className="relative after:absolute after:-inset-2.5 after:content-['']"
                aria-label="Select all visible rows"
                onCheckedChange={(v) => {
                  if (!onSelectedChange) return;
                  const next = new Set(selected);
                  for (const r of modelRows) {
                    if (v) next.add(r.id);
                    else next.delete(r.id);
                  }
                  onSelectedChange(next);
                }}
              />
            </div>
            {visibleCols.map((col, i) => {
              const meta = col.columnDef.meta as { align?: "left" | "right"; sticky?: boolean } | undefined;
              const dir = col.getIsSorted();
              const label = col.columnDef.header;
              const labelText = typeof label === "string" ? label : col.id;
              return (
                <div
                  key={col.id}
                  role="columnheader"
                  aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}
                  className={cn(
                    "group/header sticky top-0 z-20 flex h-control items-center gap-1 bg-surface2 px-2",
                    meta?.align === "right" && "justify-end",
                    i === 0 && "left-[42px] z-30 shadow-[1px_0_0_var(--border-subtle)]",
                  )}
                >
                  {col.getCanSort() ? (
                    <button
                      type="button"
                      onClick={col.getToggleSortingHandler()}
                      className="inline-flex min-w-0 items-center gap-1 truncate hover:text-secondary"
                    >
                      <span className="truncate">{labelText}</span>
                      {dir === "asc" && <ArrowUp size={11} aria-hidden />}
                      {dir === "desc" && <ArrowDown size={11} aria-hidden />}
                    </button>
                  ) : (
                    <span className="truncate">{labelText}</span>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" aria-label={`Column menu for ${labelText}`} className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-tertiary hover:text-primary focus:opacity-100 md:opacity-0 md:group-hover/header:opacity-100">
                        <ChevronDown size={13} aria-hidden />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel>{labelText}</DropdownMenuLabel>
                      {col.getCanSort() && (
                        <>
                          <DropdownMenuItem onSelect={() => col.toggleSorting(false)}>Sort ascending</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => col.toggleSorting(true)}>Sort descending</DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem onSelect={() => col.toggleVisibility(false)}>Hide column</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <span
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Resize ${labelText}`}
                    onPointerDown={(e) => startResize(col.id, e)}
                    className="absolute -right-2 top-1/2 h-9 w-4 -translate-y-1/2 cursor-col-resize touch-none rounded hover:bg-accent/30"
                  />
                </div>
              );
            })}
          </div>

          {loading && (
            <div aria-busy="true">
              {Array.from({ length: Math.ceil(height / rowHeight) }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-subtle px-3" style={{ height: rowHeight }}>
                  <div className="h-3 w-4 animate-pulse rounded bg-surface3" />
                  <div className="h-3 flex-1 animate-pulse rounded bg-surface3" />
                  <div className="h-3 w-16 animate-pulse rounded bg-surface3" />
                </div>
              ))}
            </div>
          )}

          {!loading && modelRows.length === 0 && (
            <EmptyState title="No areas match" reason="Clear one or more filters to see counties again." />
          )}

          {!loading && modelRows.length > 0 && (
            <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
              {virtualizer.getVirtualItems().map((item) => {
                const row = modelRows[item.index];
                const id = row.id;
                const isSelected = selected.has(id);
                const inCompare = compareIds.includes(id);
                const disabled = isDisabled?.(row.original) ?? false;
                return (
                  <div
                    key={id}
                    role="row"
                    aria-rowindex={item.index + 2}
                    aria-selected={isSelected}
                    data-active={item.index === active || undefined}
                    onClick={() => {
                      setActive(item.index);
                      onActivate(row.original);
                    }}
                    style={{
                      height: rowHeight,
                      transform: `translateY(${item.start}px)`,
                      gridTemplateColumns: gridTemplate,
                      backgroundImage: disabled
                        ? "repeating-linear-gradient(135deg, transparent 0 7px, var(--bg-surface-3) 7px 8px)"
                        : undefined,
                    }}
                    className={cn(
                      "absolute left-0 top-0 grid w-full cursor-pointer items-center border-b border-subtle text-body-sm transition-colors",
                      isSelected ? "bg-accentsubtle" : item.index === active ? "bg-surface2" : "bg-surface1 hover:bg-surface2",
                      disabled && "opacity-60",
                      inCompare && "border-l-2 border-l-accent",
                    )}
                  >
                    <div role="gridcell" className="sticky left-0 z-10 flex h-full items-center justify-center bg-inherit" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        className="relative after:absolute after:-inset-2.5 after:content-['']"
                        aria-label={`Select row ${item.index + 1}`}
                        onCheckedChange={() => toggleAt(item.index, false)}
                      />
                    </div>
                    {row.getVisibleCells().map((cell, i) => {
                      const meta = cell.column.columnDef.meta as { align?: "left" | "right" } | undefined;
                      return (
                        <div
                          key={cell.id}
                          role="gridcell"
                          className={cn(
                            "flex h-full min-w-0 items-center px-2",
                            meta?.align === "right" && "justify-end text-right",
                            i === 0 && "sticky left-[42px] z-10 bg-inherit shadow-[1px_0_0_var(--border-subtle)]",
                          )}
                        >
                          <div className="min-w-0 flex-1">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-subtle px-3 py-2 text-caption text-tertiary">
        <span>
          {modelRows.length.toLocaleString()} rows
          {selected.size > 0 ? ` · ${selected.size.toLocaleString()} selected` : ""}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" iconLeft={<SlidersHorizontal size={14} aria-hidden />}>
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
              {columns.map((c) => {
                const visible = visibility[c.id] !== false;
                return (
                  <DropdownMenuItem key={c.id} onSelect={() => table.getColumn(c.id)?.toggleVisibility()}>
                    <Check size={14} className={visible ? "text-accenttext" : "opacity-0"} aria-hidden />
                    {c.header}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="ghost" onClick={toggleDensity}>
            {density === "compact" ? "Comfortable" : "Compact"}
          </Button>
          {onExport && (
            <Button size="sm" variant="ghost" onClick={onExport}>
              Export
            </Button>
          )}
          <span className="hidden items-center gap-1 pl-2 text-micro text-tertiary md:inline-flex" title="Arrow keys move, Enter opens, Space selects, C compares">
            <GripVertical size={12} aria-hidden /> Keyboard ready
          </span>
        </div>
      </div>
    </div>
  );
}
