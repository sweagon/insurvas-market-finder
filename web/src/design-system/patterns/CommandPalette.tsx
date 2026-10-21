import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, type ViewId } from "../../state/store";
import { Modal } from "../overlays/Modal";
import { Search } from "../icons";
import { stateAbbr } from "../../state/format";
import { LENS_ORDER } from "../../state/lensMeta";

const VIEWS: { id: ViewId; label: string }[] = [
  { id: "explore", label: "Go to map" },
  { id: "rankings", label: "Go to rankings" },
  { id: "compare", label: "Go to compare" },
  { id: "scatter", label: "Go to scatter explorer" },
  { id: "sensitivity", label: "Go to sensitivity lab" },
  { id: "methodology", label: "Open methodology" },
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { counties, lens, setLens, setView, select } = useStore();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset the palette each time it opens. Adjusting state during render (rather
  // than in an effect) avoids an extra commit with the previous query visible.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setActive(0);
    }
  }

  // Focus is a DOM side effect, so it belongs in an effect.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  const q = query.trim().toLowerCase();
  const areas = useMemo(() => {
    if (!q) return [];
    return counties
      .filter((c) => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q) || c.fips.includes(q))
      .slice(0, 8);
  }, [counties, q]);
  const views = useMemo(() => VIEWS.filter((v) => !q || v.label.toLowerCase().includes(q)), [q]);
  const lenses = useMemo(() => LENS_ORDER.filter((l) => !q || l.includes(q)), [q]);
  const total = areas.length + views.length + lenses.length;

  const run = (fn: () => void) => {
    fn();
    onOpenChange(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(total - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      let i = 0;
      for (const v of views) { if (i === active) return run(() => setView(v.id)); i++; }
      for (const l of lenses) { if (i === active) return run(() => setLens(l)); i++; }
      const area = areas[active - views.length - lenses.length];
      if (area) run(() => select(area.fips));
    }
  };

  const item = (i: number, label: string, hint: string, onClick: () => void) => (
    <button
      key={`${hint}-${label}-${i}`}
      type="button"
      onMouseEnter={() => setActive(i)}
      onClick={() => run(onClick)}
      className={`flex w-full items-center justify-between rounded-control px-3 py-2 text-left text-body-sm ${active === i ? "bg-surface2 text-primary" : "text-secondary"}`}
    >
      <span className="truncate">{label}</span>
      <span className="ml-3 shrink-0 text-caption text-tertiary">{hint}</span>
    </button>
  );

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Command palette">
      <div className="flex items-center gap-2 rounded-control border border-default bg-surface2 px-3">
        <Search size={16} className="text-tertiary" aria-hidden />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0); }}
          onKeyDown={onKeyDown}
          placeholder="Search counties, lenses, views…"
          aria-label="Command palette search"
          className="h-10 w-full bg-transparent text-body text-primary outline-none placeholder:text-tertiary"
        />
      </div>
      <div className="mt-3 max-h-[50vh] space-y-3 overflow-y-auto">
        {views.length > 0 && (
          <div>
            <p className="px-1 pb-1 text-micro uppercase text-tertiary">Navigate</p>
            {views.map((v, j) => item(j, v.label, "View", () => setView(v.id)))}
          </div>
        )}
        {lenses.length > 0 && (
          <div>
            <p className="px-1 pb-1 text-micro uppercase text-tertiary">Strategy lens</p>
            {lenses.map((l, j) => item(views.length + j, l.replace(/_/g, " "), l === lens ? "Active" : "Lens", () => setLens(l)))}
          </div>
        )}
        {areas.length > 0 && (
          <div>
            <p className="px-1 pb-1 text-micro uppercase text-tertiary">Areas</p>
            {areas.map((c, j) => item(views.length + lenses.length + j, `${c.name}, ${c.state}`, stateAbbr(c.state), () => select(c.fips)))}
          </div>
        )}
        {total === 0 && <p className="px-3 py-6 text-center text-body-sm text-tertiary">No matches.</p>}
      </div>
      <p className="mt-3 border-t border-subtle pt-2 text-caption text-tertiary">↑↓ to move · Enter to open · Esc to close</p>
    </Modal>
  );
}
