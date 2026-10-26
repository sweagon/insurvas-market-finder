import { cn } from "../cn";
import { Download, Filter, Search, Share2, Settings } from "../icons";
import { useStore } from "../../state/store";
import { useView } from "../../state/navigation";
import { LENS_ORDER } from "../../state/lensMeta";
import { ThemeToggle } from "./ThemeToggle";
import { LensSwitcher, LensMenu } from "./LensSwitcher";
import { Button } from "../primitives/Button";
import { Tooltip } from "../primitives/tooltip";
import { usePreferences } from "../providers/PreferencesProvider";
import { Brand } from "./Brand";

/**
 * Top bar (C.1), 56px. Breadcrumb, lens switcher, search with a Cmd/Ctrl+K
 * hint, Share, Export, theme toggle, settings. Content is capped per C.3.
 */
export function TopBar({
  onOpenPalette,
  onOpenFilters,
  onExport,
  onShare,
  onOpenSettings,
}: {
  onOpenPalette: () => void;
  onOpenFilters: () => void;
  onExport: () => void;
  onShare: () => void;
  onOpenSettings: () => void;
}) {
  const { lens, setLens, catalog } = useStore();
  const { view, setView } = useView();
  const { theme } = usePreferences();

  return (
    <header className="glass sticky top-0 z-sticky flex h-14 min-w-0 items-center gap-2 border-b px-3 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] md:gap-3 md:px-5">
      <span className="md:hidden">
        <Brand tone={theme} variant="mark" className="h-7 w-7" alt="Insurvas Market Finder" />
      </span>

      <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-body-sm text-tertiary md:flex">
        <button type="button" onClick={() => setView("explore")} className="hover:text-primary">
          Home
        </button>
        <span aria-hidden>/</span>
        <span className="text-primary capitalize">{view}</span>
      </nav>

      <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
        <div className="hidden 2xl:block">
          <LensSwitcher />
        </div>
        <div className="hidden md:block 2xl:hidden">
          <LensMenu />
        </div>
        <label className="md:hidden">
          <span className="sr-only">Strategy lens</span>
          <select
            value={lens}
            onChange={(e) => setLens(e.target.value as typeof lens)}
            className="h-control max-w-28 rounded-control border border-default bg-surface2 px-2 text-body-sm text-primary sm:max-w-40"
          >
            {LENS_ORDER.map((l) => (
              <option key={l} value={l}>{catalog?.lenses?.[l]?.label ?? l}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={onOpenPalette}
          className={cn(
            "flex h-control flex-1 items-center gap-2 rounded-control border border-default bg-surface2 px-3 text-body-sm text-tertiary",
            "hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focusring",
          )}
          aria-label="Search areas and actions"
        >
          <Search size={16} aria-hidden />
          <span className="hidden xl:inline">Search areas, lenses, or actions</span>
          <span className="hidden lg:inline xl:hidden">Search</span>
          <kbd className="ml-auto hidden rounded border border-default px-1.5 font-mono text-[10px] xl:inline">
            ⌘K
          </kbd>
        </button>

        <div className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" size="icon" onClick={onOpenFilters} aria-label="Filters">
            <Filter size={18} aria-hidden />
          </Button>
          <Tooltip content="Copy a shareable link">
            <Button variant="ghost" size="icon" onClick={onShare} aria-label="Share view">
              <Share2 size={18} aria-hidden />
            </Button>
          </Tooltip>
          <Button variant="ghost" size="icon" onClick={onExport} aria-label="Export CSV">
            <Download size={18} aria-hidden />
          </Button>
        </div>

        <span className="hidden md:inline-flex">
          <ThemeToggle />
        </span>
        <Button variant="ghost" size="icon" onClick={onOpenSettings} aria-label="Settings" className="hidden md:inline-flex">
          <Settings size={18} aria-hidden />
        </Button>
      </div>
    </header>
  );
}
