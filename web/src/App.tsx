import { Suspense, lazy, useEffect, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { useStore } from "./state/store";
import { useView } from "./state/navigation";
import { useDocumentTitle } from "./state/title";
import { ErrorBoundary } from "./design-system/patterns/ErrorBoundary";
import { loadCore, loadMapLens, loadRankings, scoresFromRankings } from "./data/load";
import { useUrlSync } from "./state/url";
import { Sidebar } from "./design-system/patterns/Sidebar";
import { TopBar } from "./design-system/patterns/TopBar";
import { BottomTabBar } from "./design-system/patterns/BottomTabBar";
import { CompareTray } from "./design-system/patterns/CompareTray";
import { StaleDataBanner } from "./design-system/patterns/StaleDataBanner";
import { FooterBar } from "./design-system/patterns/FooterBar";
import { EmptyState } from "./design-system/patterns/states";
import { Monogram, RankBadge, ScoreChip } from "./design-system/primitives/badges";
import { stateAbbr, popCompact } from "./state/format";
import { LENS_COLOR } from "./state/lensMeta";
import type { LensId } from "./data/types";
import {
  BarChart3,
  Download,
  Gauge,
  LayoutGrid,
  List,
  MapIcon,
  Settings,
  Share2,
  Table2,
} from "./design-system/icons";

const Explore = lazy(() => import("./views/Explore"));
const Rankings = lazy(() => import("./views/Rankings"));
const Compare = lazy(() => import("./views/Compare"));
const Scatter = lazy(() => import("./views/Scatter"));
const Sensitivity = lazy(() => import("./views/Sensitivity"));
const Methodology = lazy(() => import("./views/Methodology"));
const DesignGallery = lazy(() => import("./views/DesignGallery"));
const AreaPage = lazy(() => import("./views/AreaPage"));
const PrintBrief = lazy(() => import("./views/PrintBrief"));

// Overlays and dialogs are only reachable on demand, so their Radix
// dependencies (dialog, focus scope, radio group, switch) stay out of the
// initial bundle.
const Drawer = lazy(() =>
  import("./design-system/overlays/Drawer").then((m) => ({ default: m.Drawer })),
);
const BriefPreview = lazy(() =>
  import("./design-system/overlays/BriefPreview").then((m) => ({ default: m.BriefPreview })),
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


function AreaRoute() {
  const { fips = "" } = useParams();
  const { counties, selectedFips, select, loaded } = useStore();
  useEffect(() => {
    if (fips && selectedFips !== fips) select(fips);
  }, [fips, selectedFips, select]);
  if (loaded && fips && !counties.some((c) => c.fips === fips)) {
    return <NotFound title="Area not found" reason="That FIPS code is not in the current dataset." />;
  }
  return <AreaPage />;
}

function NotFound({ title = "Page not found", reason = "This route does not exist." }: { title?: string; reason?: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="space-y-3 text-center">
        <EmptyState title={title} reason={reason} actionLabel="Go to map" onAction={() => navigate("/")} />
        <Link to="/rankings" className="text-body-sm text-accenttext hover:underline">
          Browse rankings
        </Link>
      </div>
    </div>
  );
}

function Shell() {
  const location = useLocation();
  const {
    setData,
    setLoadError,
    mergeLensScores,
    mergeAllScores,
    loaded,
    loadError,
    loadedLenses,
    rankingsLoaded,
    catalog,
    selectedFips,
    select,
    counties,
    lens,
    compare,
    toggleCompare,
    source,
  } = useStore();
  const { view, setView } = useView();
  const selected = counties.find((c) => c.fips === selectedFips);
  const selectedScore = selected?.scores?.[lens];
  useDocumentTitle(view === "explore" ? "Explore" : view);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
    loadCore()
      .then((core) => {
        if (cancelled) return;
        setData({ ...core, source: "snapshot" });
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Failed to load data");
      });
    return () => { cancelled = true; };
  }, [setData, setLoadError]);

  useEffect(() => {
    if (!loaded || !catalog) return;
    let cancelled = false;

    if (view === "explore") {
      if (rankingsLoaded || loadedLenses.includes(lens)) return;
      loadMapLens(lens)
        .then((scores) => {
          if (!cancelled) mergeLensScores(lens, scores, "snapshot");
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setLoadError(error instanceof Error ? error.message : "Failed to load map data");
          }
        });
      return () => { cancelled = true; };
    }

    if (rankingsLoaded) return;
    loadRankings()
      .then(({ payload, source }) => {
        if (cancelled) return;
        const lensIds = Object.keys(catalog.lenses ?? {}) as LensId[];
        mergeAllScores(scoresFromRankings(payload, lensIds), lensIds, source);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load rankings");
        }
      });
    return () => { cancelled = true; };
  }, [
    catalog,
    lens,
    loaded,
    loadedLenses,
    mergeAllScores,
    mergeLensScores,
    rankingsLoaded,
    setLoadError,
    view,
  ]);

  if (loadError) {
    return (
      <div className="flex h-[100dvh] items-center justify-center p-6">
        <EmptyState title="Failed to load data" reason={loadError} />
      </div>
    );
  }

  const waitingForScores =
    view === "explore" ? !rankingsLoaded && loadedLenses.length === 0 : !rankingsLoaded;

  if (!loaded || waitingForScores) {
    return (
      <div className="flex h-[100dvh] items-center justify-center p-6">
        <EmptyState
          title="Loading"
          reason="Preparing market data"
        />
      </div>
    );
  }

  // The brief is paper, not an app screen: no sidebar, bar or tray.
  if (view === "print") {
    return (
      <Suspense fallback={<EmptyState title="Preparing brief" reason="Loading the print layout." />}>
        <ErrorBoundary>
          <Routes>
            <Route path="/print/:fips" element={<PrintBrief />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </Suspense>
    );
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-toast focus:rounded-control focus:border focus:border-default focus:bg-surface1 focus:px-3 focus:py-2 focus:text-body-sm focus:text-primary"
      >
        Skip to main content
      </a>
      <div className="grid h-[100dvh] min-h-0 grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)]">
      <aside className="col-start-1 row-span-2 hidden min-h-0 md:block">
        <Sidebar />
      </aside>
      <header className="col-start-2 row-start-1 min-w-0">
        <TopBar
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenFilters={() => setView("rankings")}
          onExport={() => setExportOpen(true)}
          onShare={() => setShareOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </header>
      <main className="relative col-start-2 row-start-2 flex min-h-0 min-w-0 flex-col overflow-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <StaleDataBanner />
        <div id="main-content" className="min-h-0 flex-1 overflow-y-auto">
          <ErrorBoundary>
            <Suspense fallback={<EmptyState title="Loading view" reason="Preparing module" />}>
              <div key={location.pathname} className="anim-page h-full">
              <Routes>
                <Route path="/" element={<Explore />} />
                <Route path="/rankings" element={<Rankings />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/scatter" element={<Scatter />} />
                <Route path="/sensitivity" element={<Sensitivity />} />
                <Route path="/methodology" element={<Methodology />} />
                <Route path="/area/:fips" element={<AreaRoute />} />
                <Route path="/print/:fips" element={<PrintBrief />} />
                <Route path="/design" element={<DesignGallery />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </div>
            </Suspense>
          </ErrorBoundary>
        </div>
        {view !== "compare" && <CompareTray />}
        <FooterBar />
      </main>
      <BottomTabBar onMore={() => setMobileNavOpen(true)} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <Modal open={settingsOpen} onOpenChange={setSettingsOpen} title="Settings"><SettingsPanel /></Modal>
      <Modal open={shareOpen} onOpenChange={setShareOpen} title="Share this view"><ShareDialog onDone={() => setShareOpen(false)} /></Modal>
      <Modal open={exportOpen} onOpenChange={setExportOpen} title="Export"><ExportDialog onDone={() => setExportOpen(false)} /></Modal>
      <Suspense fallback={null}>
        <BriefPreview open={briefOpen} onOpenChange={setBriefOpen} fips={selected?.fips ?? null} lens={lens} areaName={selected ? `${selected.name}, ${selected.state}` : undefined} />
      </Suspense>
      <Modal open={mobileNavOpen} onOpenChange={setMobileNavOpen} title="Menu" side="left">
        <div className="space-y-5">
          <button
            type="button"
            onClick={() => { setView("compare"); setMobileNavOpen(false); }}
            className="flex h-control w-full items-center justify-center gap-2 rounded-control bg-accent text-body-sm font-medium text-onaccent transition-colors duration-fast hover:bg-accenthover"
          >
            <LayoutGrid size={16} aria-hidden />
            New comparison
          </button>

          {[
            {
              label: "Explore",
              items: [
                { id: "explore" as const, label: "Map", icon: <MapIcon size={18} /> },
                { id: "rankings" as const, label: "Rankings", icon: <List size={18} /> },
                { id: "compare" as const, label: "Compare", icon: <LayoutGrid size={18} /> },
              ],
            },
            {
              label: "Analyze",
              items: [
                { id: "scatter" as const, label: "Scatter explorer", icon: <BarChart3 size={18} /> },
                { id: "sensitivity" as const, label: "Sensitivity lab", icon: <Gauge size={18} /> },
              ],
            },
            {
              label: "Reference",
              items: [{ id: "methodology" as const, label: "Methodology", icon: <Table2 size={18} /> }],
            },
          ].map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-1 text-micro uppercase text-tertiary">{group.label}</p>
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const active = view === item.id;
                  const badge = item.id === "compare" ? compare.length : 0;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setView(item.id); setMobileNavOpen(false); }}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-body transition-colors duration-fast ${
                        active ? "bg-surface2 font-medium text-primary" : "text-secondary hover:bg-surface2 hover:text-primary"
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent" aria-hidden />
                      )}
                      <span className={active ? "text-accenttext" : ""}>{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      {badge > 0 && (
                        <span className="rounded-pill bg-accentsubtle px-1.5 text-caption text-accenttext">{badge}</span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}

          <div className="space-y-1 border-t border-subtle pt-3">
            <button type="button" onClick={() => { setShareOpen(true); setMobileNavOpen(false); }} className="flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-body text-secondary transition-colors duration-fast hover:bg-surface2 hover:text-primary">
              <Share2 size={18} aria-hidden />
              Share this view
            </button>
            <button type="button" onClick={() => { setExportOpen(true); setMobileNavOpen(false); }} className="flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-body text-secondary transition-colors duration-fast hover:bg-surface2 hover:text-primary">
              <Download size={18} aria-hidden />
              Export data
            </button>
            <button type="button" onClick={() => { setSettingsOpen(true); setMobileNavOpen(false); }} className="flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-body text-secondary transition-colors duration-fast hover:bg-surface2 hover:text-primary">
              <Settings size={18} aria-hidden />
              Settings and theme
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-subtle pt-3 text-caption text-tertiary">
            <span>{source === "live" ? "Live data" : "Snapshot"}</span>
            <span className="font-mono">{catalog ? `ACS ${catalog.meta.vintages.acs}` : ""}</span>
          </div>
        </div>
      </Modal>
      {selected && selectedScore && view !== "area" && (
        <Drawer
          open={true}
          onOpenChange={(o) => { if (!o) select(null); }}
          title={`${selected.name}, ${selected.state}`}
          header={
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <Monogram abbr={stateAbbr(selected.state)} size={40} color={LENS_COLOR[lens]} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-h2 text-primary">{selected.name}</div>
                <div className="truncate text-caption text-secondary">{selected.state} • {popCompact(selected.pop60)} aged 60+</div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <RankBadge rank={selectedScore.rank} />
                <ScoreChip value={selectedScore.total} />
              </div>
            </div>
          }
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="self-center text-caption text-tertiary">ACS 2020–2024 · {compare.length} selected</span>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setBriefOpen(true)} className="inline-flex h-control items-center justify-center rounded-control border border-default px-3 text-caption text-secondary hover:text-primary">
                  Brief
                </button>
                <Link to={`/area/${selected.fips}`} className="inline-flex h-control items-center justify-center rounded-control border border-default px-3 text-caption text-secondary hover:text-primary">
                  Full page
                </Link>
                <button type="button" onClick={() => toggleCompare(selected.fips)} className="inline-flex h-control items-center justify-center rounded-control border border-default px-3 text-caption text-secondary hover:text-primary">
                  {compare.includes(selected.fips) ? "Remove from compare" : "Add to compare"}
                </button>
              </div>
            </div>
          }
        >
          <AreaPage embedded />
        </Drawer>
      )}
      </div>
    </>
  );
}

export default function App() {
  return <Shell />;
}
