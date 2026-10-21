import { Suspense, lazy, useEffect, useState } from "react";
import { useStore } from "./state/store";
import { loadAll } from "./data/load";
import { useUrlSync } from "./state/url";
import { Sidebar } from "./design-system/patterns/Sidebar";
import { TopBar } from "./design-system/patterns/TopBar";
import { BottomTabBar } from "./design-system/patterns/BottomTabBar";
import { CompareTray } from "./design-system/patterns/CompareTray";
import { EmptyState } from "./design-system/patterns/states";
import { Monogram, RankBadge, ScoreChip } from "./design-system/primitives/badges";
import { stateAbbr, popCompact } from "./state/format";
import { LENS_COLOR } from "./state/lensMeta";

const Explore = lazy(() => import("./views/Explore"));
const Rankings = lazy(() => import("./views/Rankings"));
const Compare = lazy(() => import("./views/Compare"));
const Scatter = lazy(() => import("./views/Scatter"));
const Sensitivity = lazy(() => import("./views/Sensitivity"));
const Methodology = lazy(() => import("./views/Methodology"));
const DesignGallery = lazy(() => import("./views/DesignGallery"));
const AreaPage = lazy(() => import("./views/AreaPage"));

// Overlays and dialogs are only reachable on demand, so their Radix
// dependencies (dialog, focus scope, radio group, switch) stay out of the
// initial bundle.
const Drawer = lazy(() =>
  import("./design-system/overlays/Drawer").then((m) => ({ default: m.Drawer })),
);
const Modal = lazy(() =>
  import("./design-system/overlays/Modal").then((m) => ({ default: m.Modal })),
);
const CommandPalette = lazy(() =>
  import("./design-system/patterns/CommandPalette").then((m) => ({
    default: m.CommandPalette,
  })),
);
const SettingsPanel = lazy(() =>
  import("./design-system/patterns/SettingsPanel").then((m) => ({
    default: m.SettingsPanel,
  })),
);
const ShareDialog = lazy(() =>
  import("./design-system/patterns/ShareDialog").then((m) => ({
    default: m.ShareDialog,
  })),
);
const ExportDialog = lazy(() =>
  import("./design-system/patterns/ExportDialog").then((m) => ({
    default: m.ExportDialog,
  })),
);


function Shell() {
  const { view, setData, setLoadError, loaded, loadError, selectedFips, select, counties, lens, compare, toggleCompare } = useStore();
  const selected = counties.find((c) => c.fips === selectedFips);
  const selectedScore = selected?.scores?.[lens];
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { setView } = useStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useUrlSync();

  useEffect(() => {
    let cancelled = false;
    loadAll()
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Failed to load data");
      });
    return () => { cancelled = true; };
  }, [setData, setLoadError]);

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <EmptyState title="Failed to load data" reason={loadError} />
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <EmptyState title="Loading market data" reason="Fetching counties, states, and rankings." />
      </div>
    );
  }

  return (
    <div className="grid h-screen grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_1fr]">
      <aside className="col-start-1 row-span-2 hidden lg:block">
        <Sidebar onOpenPalette={() => setPaletteOpen(true)} />
      </aside>
      <header className="col-start-2 row-start-1 min-w-0">
        <TopBar
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenFilters={() => setView("rankings")}
          onExport={() => setExportOpen(true)}
          onShare={() => setShareOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
      </header>
      <main className="relative col-start-2 row-start-2 min-w-0 overflow-auto pb-14 lg:pb-0">
        <Suspense fallback={<EmptyState title="Loading view" reason="Preparing module" />}>
          {view === "explore" && <Explore />}
          {view === "rankings" && <Rankings />}
          {view === "compare" && <Compare />}
          {view === "scatter" && <Scatter />}
          {view === "sensitivity" && <Sensitivity />}
          {view === "methodology" && <Methodology />}
          {view === "design" && <DesignGallery />}
          {view === "area" && <AreaPage />}
        </Suspense>
        <CompareTray />
      </main>
      <BottomTabBar onMore={() => setMobileNavOpen(true)} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <Modal open={settingsOpen} onOpenChange={setSettingsOpen} title="Settings"><SettingsPanel /></Modal>
      <Modal open={shareOpen} onOpenChange={setShareOpen} title="Share this view"><ShareDialog onDone={() => setShareOpen(false)} /></Modal>
      <Modal open={exportOpen} onOpenChange={setExportOpen} title="Export"><ExportDialog onDone={() => setExportOpen(false)} /></Modal>
      <Modal open={mobileNavOpen} onOpenChange={setMobileNavOpen} title="Menu" side="left">
        <nav className="space-y-1">
          {(["explore", "rankings", "compare", "scatter", "sensitivity", "methodology"] as const).map((v) => (
            <button key={v} type="button" onClick={() => { setView(v); setMobileNavOpen(false); }} className="block w-full rounded-control px-3 py-2 text-left text-body capitalize text-secondary hover:bg-surface2 hover:text-primary">{v}</button>
          ))}
        </nav>
      </Modal>
      {selected && selectedScore && (
        <Drawer
          open={true}
          onOpenChange={(o) => { if (!o) select(null); }}
          title={`${selected.name}, ${selected.state}`}
          header={
            <div className="flex min-w-0 items-center gap-3">
              <Monogram abbr={stateAbbr(selected.state)} size={40} color={LENS_COLOR[lens]} />
              <div className="min-w-0">
                <div className="truncate text-h2 text-primary">{selected.name}</div>
                <div className="text-caption text-secondary">{selected.state} • {popCompact(selected.pop60)} aged 60+</div>
              </div>
              <div className="ml-2 flex items-center gap-2">
                <RankBadge rank={selectedScore.rank} />
                <ScoreChip value={selectedScore.total} />
              </div>
            </div>
          }
          footer={
            <div className="flex items-center justify-between gap-2">
              <span className="text-caption text-tertiary">ACS 2020–2024 · {compare.length} selected</span>
              <button type="button" onClick={() => toggleCompare(selected.fips)} className="rounded-control border border-default px-3 py-1.5 text-caption text-secondary hover:text-primary">
                {compare.includes(selected.fips) ? "Remove from compare" : "Add to compare"}
              </button>
            </div>
          }
        >
          <AreaPage embedded />
        </Drawer>
      )}
    </div>
  );
}

export default function App() {
  return <Shell />;
}
