import { useStore } from "../../state/store";
import { useView } from "../../state/navigation";
import { Button } from "../primitives/Button";
import { Monogram } from "../primitives/badges";
import { X } from "../icons";
import { stateAbbr } from "../../state/format";

/** Sticky bottom tray holding up to four selected areas (D.7). */
export function CompareTray() {
  const { counties, compare, toggleCompare, clearCompare } = useStore();
  const { setView } = useView();
  if (compare.length === 0) return null;
  const items = compare
    .map((f) => counties.find((c) => c.fips === f))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-panel flex justify-center px-2 md:static md:bottom-auto md:px-3 md:pb-3 lg:pb-4">
      <div className="glass l3 pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-panel border px-3 py-2 md:flex-nowrap md:rounded-pill">
        <span className="text-caption text-secondary">
          {items.length} selected
        </span>
        <div className="flex max-w-full items-center gap-1.5 overflow-x-auto">
          {items.map((c) => (
            <span key={c.fips} className="inline-flex items-center gap-1.5 rounded-pill bg-surface2 pl-0.5 pr-1.5 py-0.5">
              <Monogram abbr={stateAbbr(c.state)} size={22} />
              <span className="max-w-24 truncate text-caption text-primary">{c.name}</span>
              <button
                type="button"
                onClick={() => toggleCompare(c.fips)}
                aria-label={`Remove ${c.name} from comparison`}
                className="rounded-pill p-0.5 text-tertiary hover:text-primary"
              >
                <X size={12} aria-hidden />
              </button>
            </span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="primary" size="sm" onClick={() => setView("compare")}>
            Compare
          </Button>
          <Button variant="ghost" size="sm" onClick={clearCompare}>
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
