import { cn } from "../cn";
import {
  BarChart3,
  Gauge,
  LayoutGrid,
  List,
  MapIcon,
  PanelLeft,
  Table2,
} from "../icons";
import { useStore } from "../../state/store";
import { useView } from "../../state/navigation";
import type { ViewId } from "../../routes";
import { usePreferences } from "../providers/PreferencesProvider";
import { Brand } from "./Brand";

interface NavItem {
  id: ViewId;
  label: string;
  icon: React.ReactNode;
}

const EXPLORE: NavItem[] = [
  { id: "explore", label: "Map", icon: <MapIcon size={20} /> },
  { id: "rankings", label: "Rankings", icon: <List size={20} /> },
  { id: "compare", label: "Compare", icon: <LayoutGrid size={20} /> },
];
const ANALYZE: NavItem[] = [
  { id: "scatter", label: "Scatter explorer", icon: <BarChart3 size={20} /> },
  { id: "sensitivity", label: "Sensitivity lab", icon: <Gauge size={20} /> },
];
const REFERENCE: NavItem[] = [
  { id: "methodology", label: "Methodology", icon: <Table2 size={20} /> },
];

/**
 * Sidebar (C.1): 248px expanded, 72px rail, hidden on phone. Dark variant in
 * the light theme is an option (R5). Groups use `micro` headers.
 */
export function Sidebar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { compare, catalog, source } = useStore();
  const { view, setView } = useView();
  const { sidebarTone, setSidebarTone } = usePreferences();
  const dark = sidebarTone === "dark" && (typeof document === "undefined" || document.documentElement.dataset.theme !== "light");

  const groups: { label: string; items: NavItem[] }[] = [
    { label: "Explore", items: EXPLORE },
    { label: "Analyze", items: ANALYZE },
    { label: "Reference", items: REFERENCE },
  ];

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "hidden lg:flex w-[var(--shell-rail)] xl:w-[var(--shell-sidebar)] shrink-0 flex-col border-r",
        "bg-[var(--sidebar-bg)] text-[var(--sidebar-text)]",
      )}
      style={{ borderColor: "var(--sidebar-border)" }}
    >
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="xl:hidden">
          <Brand tone={dark ? "dark" : "light"} variant="mark" className="h-8 w-8" />
        </span>
        <span className="hidden min-w-0 items-center gap-2 xl:flex">
          <Brand tone={dark ? "dark" : "light"} className="h-5 w-auto shrink-0" />
          <span className="truncate text-body-sm font-medium tracking-tight text-[var(--sidebar-text-secondary)]">
            Market Finder
          </span>
        </span>
      </div>

      <div className="hidden xl:flex items-center gap-2 px-4 pb-4">
        <button
          type="button"
          onClick={() => {
            setView("compare");
          }}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-control bg-accent text-body-sm font-medium text-onaccent hover:bg-accenthover"
        >
          New comparison
        </button>
        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Open command palette"
          className="flex h-9 w-9 items-center justify-center rounded-control border border-default text-secondary hover:text-primary"
        >
          <PanelLeft size={16} aria-hidden />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {groups.map((g) => (
          <div key={g.label} className="mb-3">
            <p className="hidden xl:block px-3 py-1 text-micro uppercase text-[var(--sidebar-text-secondary)]">
              {g.label}
            </p>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active = view === item.id;
                const badge = item.id === "compare" ? compare.length : 0;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setView(item.id)}
                      aria-current={active ? "page" : undefined}
                      title={item.label}
                      className={cn(
                        "group relative flex h-10 w-full items-center gap-3 rounded-control px-3 text-body transition-colors duration-fast",
                        active
                          ? "bg-[var(--sidebar-active)] font-medium"
                          : "text-[var(--sidebar-text-secondary)] hover:bg-[var(--sidebar-active)]",
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1.5 h-7 w-0.5 rounded-pill bg-accent" aria-hidden />
                      )}
                      <span className={active ? "text-accenttext" : ""}>{item.icon}</span>
                      <span className="hidden xl:inline">{item.label}</span>
                      {badge > 0 && (
                        <span className="ml-auto hidden xl:inline rounded-pill bg-accentsubtle px-1.5 text-caption text-accenttext">
                          {badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div
        className="flex items-center justify-between gap-2 border-t px-3 py-3 text-caption"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <button
          type="button"
          onClick={() => setSidebarTone(dark ? "light" : "dark")}
          className="hidden xl:inline text-[var(--sidebar-text-secondary)] hover:text-[var(--sidebar-text)]"
        >
          {source === "live" ? "Live data" : "Snapshot"}
        </button>
        <span className="hidden xl:inline font-mono text-mono text-[var(--sidebar-text-secondary)]">
          {catalog ? `ACS ${catalog.meta.vintages.acs}` : ""}
        </span>
      </div>
    </nav>
  );
}
