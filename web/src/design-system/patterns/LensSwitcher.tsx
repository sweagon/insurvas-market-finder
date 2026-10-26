import { Suspense, lazy, useEffect } from "react";
import { useStore } from "../../state/store";
import { LENS_COLOR, LENS_ORDER } from "../../state/lensMeta";
import { cn } from "../cn";

// The Radix menu tree stays out of the initial bundle: this form of the
// switcher only renders between the md and 2xl breakpoints.
const LensMenuDropdown = lazy(() =>
  import("./LensMenuDropdown").then((m) => ({ default: m.LensMenuDropdown })),
);

/**
 * Lens switcher: segmented control with lens-color dots, cycled with [ and ]
 * (F.1). On phones it collapses to a chip that opens a sheet via the shell.
 */
export function LensSwitcher({ compact = false }: { compact?: boolean }) {
  const { lens, setLens, catalog } = useStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /INPUT|TEXTAREA|SELECT/.test(target.tagName)) return;
      if (e.key === "[" || e.key === "]") {
        e.preventDefault();
        const i = LENS_ORDER.indexOf(lens);
        const next = e.key === "]" ? (i + 1) % LENS_ORDER.length : (i - 1 + LENS_ORDER.length) % LENS_ORDER.length;
        setLens(LENS_ORDER[next]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lens, setLens]);

  return (
    <div
      role="radiogroup"
      aria-label="Strategy lens"
      className={cn(
        "inline-flex h-control items-center gap-0.5 rounded-control border border-subtle bg-surface2 p-0.5",
        compact && "max-w-full overflow-x-auto",
      )}
    >
      {LENS_ORDER.map((id) => {
        const active = id === lens;
        const label = catalog?.lenses[id]?.label ?? id;
        return (
          <button
            key={id}
            role="radio"
            aria-checked={active}
            onClick={() => setLens(id)}
            title={catalog?.lenses[id]?.description}
            className={cn(
              "inline-flex h-full items-center gap-1.5 whitespace-nowrap rounded-[6px] px-2.5 text-body-sm font-medium transition-colors duration-fast",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focusring",
              active ? "bg-surface3 text-primary shadow-l2" : "text-secondary hover:text-primary",
            )}
          >
            <span
              className="h-2 w-2 rounded-pill"
              style={{ background: LENS_COLOR[id] }}
              aria-hidden
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Dropdown form of the lens switcher for medium widths. */
export function LensMenu() {
  return (
    <Suspense fallback={<LensMenuFallback />}>
      <LensMenuDropdown />
    </Suspense>
  );
}

/** Static chip shown while the Radix menu chunk loads. */
function LensMenuFallback() {
  const { lens, catalog } = useStore();
  return (
    <span
      aria-hidden
      className="inline-flex h-control max-w-44 items-center gap-1.5 rounded-control border border-default bg-surface2 px-2.5 text-body-sm text-tertiary"
    >
      <span className="h-2 shrink-0 rounded-pill" style={{ background: LENS_COLOR[lens] }} />
      <span className="truncate">{catalog?.lenses[lens]?.label ?? lens}</span>
    </span>
  );
}

