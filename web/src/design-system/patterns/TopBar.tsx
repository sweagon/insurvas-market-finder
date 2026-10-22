import { cn } from "../cn";
import { Download, Filter, Menu, Search, Share2, Settings } from "../icons";
import { useStore } from "../../state/store";
import { LENS_ORDER } from "../../state/lensMeta";
import { ThemeToggle } from "./ThemeToggle";
import { LensSwitcher } from "./LensSwitcher";
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
  onOpenMobileNav,
}: {
  onOpenPalette: () => void;
  onOpenFilters: () => void;
  onExport: () => void;
  onShare: () => void;
  onOpenSettings: () => void;
  onOpenMobileNav: () => void;
}) {
  const { view, setView, lens, setLens, catalog } = useStore();
  const { theme } = usePreferences();

  return (
    <header className="sticky top-0 z-sticky flex h-14 min-w-0 items-center gap-3 overflow-hidden border-b border-subtle bg-surface1/90 px-3 backdrop-blur md:px-5">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="flex h-9 w-9 items-center justify-center rounded-control text-secondary hover:bg-surface2 lg:hidden"
      >
        <Menu size={20} aria-hidden />
      </button>

      <span className="lg:hidden">
        <Brand tone={theme} variant="mark" className="h-7 w-7" alt="Insurvas Market Finder" />
      </span>

      <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-body-sm text-tertiary md:flex">
        <button type="button" onClick={() => setView("explore")} className="hover:text-primary">
          Home
        </button>
        <span aria-hidden>/</span>
        <span className="text-primary capitalize">{view}</span>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden xl:block">
          <LensSwitcher />
        </div>
        <label className="xl:hidden">
          <span className="sr-only">Strategy lens</span>
          <select
            value={lens}
            onChange={(e) => setLens(e.target.value as typeof lens)}
            className="h-control max-w-32 rounded-control border border-default bg-surface2 px-2 text-body-sm text-primary"
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
            "flex h-control items-center gap-2 rounded-control border border-default bg-surface2 px-3 text-body-sm text-tertiary",
            "hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focusring",
          )}
          aria-label="Search areas and actions"
        >
          <Search size={16} aria-hidden />
          <span className="hidden xl:inline">Search</span>
          <kbd className="hidden rounded border border-default px-1.5 font-mono text-[10px] xl:inline">
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

        <ThemeToggle />
        <Button variant="ghost" size="icon" onClick={onOpenSettings} aria-label="Settings">
          <Settings size={18} aria-hidden />
        </Button>
      </div>
    </header>
  );
}
