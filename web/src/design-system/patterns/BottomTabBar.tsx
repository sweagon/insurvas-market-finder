import { cn } from "../cn";
import { Gauge, LayoutGrid, List, MapIcon, Menu } from "../icons";
import { useStore } from "../../state/store";
import { useView } from "../../state/navigation";
import type { ViewId } from "../../routes";

const ITEMS: { id: ViewId; label: string; icon: React.ReactNode }[] = [
  { id: "explore", label: "Explore", icon: <MapIcon size={20} /> },
  { id: "rankings", label: "Rankings", icon: <List size={20} /> },
  { id: "compare", label: "Compare", icon: <LayoutGrid size={20} /> },
  { id: "sensitivity", label: "Insights", icon: <Gauge size={20} /> },
];

/** Bottom tab bar, phone only: 56px plus safe area, 5 items (C.3). */
export function BottomTabBar({ onMore }: { onMore: () => void }) {
  const { compare } = useStore();
  const { view, setView } = useView();
  return (
    <nav
      aria-label="Primary"
      className="glass fixed inset-x-0 bottom-0 z-sticky flex h-[calc(3.5rem+env(safe-area-inset-bottom))] items-stretch border-t pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {ITEMS.map((item) => {
        const active = view === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-[10px]",
              active ? "text-accenttext" : "text-tertiary",
            )}
          >
            <span className="relative">
              {item.icon}
              {item.id === "compare" && compare.length > 0 && (
                <span className="absolute -right-1.5 -top-1 flex h-3 min-w-3 items-center justify-center rounded-pill bg-accent px-0.5 text-[8px] text-onaccent">
                  {compare.length}
                </span>
              )}
            </span>
            {item.label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onMore}
        className="flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-[10px] text-tertiary"
      >
        <Menu size={20} aria-hidden />
        More
      </button>
    </nav>
  );
}
