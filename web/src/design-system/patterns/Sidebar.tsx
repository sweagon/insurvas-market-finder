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
 * Sidebar (C.1): 248px expanded, 56px rail, hidden on phone. The sidebar
 * follows the active theme; a single toggle collapses it to icons at xl.
 */
export function Sidebar() {
  const { compare, catalog, source } = useStore();
  const { view, setView } = useView();
  const { theme, sidebarCollapsed, toggleSidebar } = usePreferences();
  const dark = theme === "dark";
  const expanded = !sidebarCollapsed;

  const groups: { label: string; items: NavItem[] }[] = [
    { label: "Explore", items: EXPLORE },
    { label: "Analyze", items: ANALYZE },
    { label: "Reference", items: REFERENCE },
  ];

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "hidden md:flex h-full w-[var(--shell-rail)] shrink-0 flex-col border-r",
        expanded && "xl:w-[var(--shell-sidebar)]",
        "bg-[var(--sidebar-bg)] text-[var(--sidebar-text)]",
      )}
      style={{ borderColor: "var(--sidebar-border)" }}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b px-3",
          expanded ? "justify-center xl:justify-start xl:px-4" : "justify-center",
        )}
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <button
          type="button"
          onClick={() => setView("explore")}
          aria-label="Go to home"
          className="flex items-center justify-center transition-opacity duration-fast hover:opacity-90"
        >
          <span className={cn(expanded ? "xl:hidden" : "flex")}>
            <Brand
              tone={dark ? "dark" : "light"}
              variant="mark"
              className="h-7 w-7"
            />
          </span>
          <span className={cn(expanded ? "hidden xl:flex" : "hidden")}>
            <Brand
              tone={dark ? "dark" : "light"}
              className="h-7 w-auto max-h-full"
            />
          </span>
        </button>
      </div>

      <div
        className={cn(
          "hidden xl:flex items-center gap-2 pb-4 pt-4",
          expanded ? "px-4" : "justify-center px-2",
        )}
      >
        {expanded && (
          <button
            type="button"
            onClick={() => {
              setView("compare");
            }}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-control bg-accent text-body-sm font-medium text-onaccent transition-colors duration-fast hover:bg-accenthover"
          >
            New comparison
          </button>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          aria-pressed={!expanded}
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-default text-secondary transition-colors duration-fast hover:bg-surface2 hover:text-primary"
        >
          <PanelLeft
            size={16}
            aria-hidden
            className={cn("transition-transform duration-fast", !expanded && "rotate-180")}
          />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {groups.map((g) => (
          <div key={g.label} className="mb-3">
            <p
              className={cn(
                "px-3 py-1 text-micro uppercase text-[var(--sidebar-text-secondary)]",
                expanded ? "hidden xl:block" : "hidden",
              )}
            >
              {g.label}
            </p>
            <ul className="space-y-1">
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
                        "group relative mx-auto flex h-control w-control items-center justify-center gap-3 rounded-control px-2 text-body transition-colors duration-fast",
                        expanded && "xl:mx-0 xl:w-full xl:justify-start xl:px-4",
                        active
                          ? "bg-[var(--sidebar-active)] font-medium"
                          : "text-[var(--sidebar-text-secondary)] hover:bg-[var(--sidebar-active)]",
                      )}
                    >
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-l-full bg-accent transition-transform duration-fast"
                          aria-hidden
                        />
                      )}
                      <span className={active ? "text-accenttext" : ""}>
                        {item.icon}
                      </span>
                      <span className={cn("hidden", expanded && "xl:inline")}>{item.label}</span>
                      {badge > 0 && (
                        <span
                          className={cn(
                            "ml-auto rounded-pill bg-accentsubtle px-1.5 text-caption text-accenttext",
                            expanded ? "hidden xl:inline" : "hidden",
                          )}
                        >
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
        className={cn(
          "flex h-control shrink-0 items-center gap-2 border-t px-3 text-caption",
          expanded ? "justify-between" : "justify-center",
        )}
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        {!expanded && (
          <span
            className="h-2 w-2 rounded-pill bg-accent"
            title={source === "live" ? "Live data" : "Snapshot"}
            aria-label={source === "live" ? "Live data" : "Snapshot"}
          />
        )}
        <span
          className={cn(
            "whitespace-nowrap text-[var(--sidebar-text-secondary)]",
            expanded ? "hidden xl:inline" : "hidden",
          )}
        >
          {source === "live" ? "Live data" : "Snapshot"}
        </span>
        <span
          className={cn(
            "whitespace-nowrap font-mono text-mono text-[var(--sidebar-text-secondary)]",
            expanded ? "hidden xl:inline" : "hidden",
          )}
        >
          {catalog ? `ACS ${catalog.meta.vintages.acs}` : ""}
        </span>
      </div>
    </nav>
  );
}
