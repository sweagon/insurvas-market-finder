import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../state/store";
import { loadTopology } from "../design-system/map/geometry";
import { Choropleth, type ChoroplethHandle, type HoverCard } from "../design-system/map/Choropleth";
import type { MapFlag } from "../design-system/map/renderer";
import { quantileBreaks } from "../design-system/map/breaks";
import { MapLegend } from "../design-system/map/MapLegend";
import { Card } from "../design-system/primitives/Card";
import { KpiCell } from "../design-system/patterns/kpi";
import { usePreferences } from "../design-system/providers/PreferencesProvider";
import { rampStops } from "../design-system/map/ramp";
import { scoreRange, popCompact, score } from "../state/format";
import { EmptyState, ErrorState } from "../design-system/patterns/states";
import { ScoreChip, RankBadge } from "../design-system/primitives/badges";
import { X, Plus, Minus, RotateCcw, Layers, List } from "../design-system/icons";
import { SUBSCORE_LABEL, SUBSCORE_ORDER } from "../state/lensMeta";
import { BottomSheet } from "../design-system/overlays/BottomSheet";
import type { SubScoreId } from "../data/types";

type MapLayer = "score" | SubScoreId;

function isSubScore(layer: MapLayer): layer is SubScoreId {
  return layer !== "score";
}

export default function Explore() {
  const { counties, lens, catalog, selectedFips, select, toggleCompare, compare } = useStore();
  const { theme, palette } = usePreferences();
  const [geo, setGeo] = useState<Awaited<ReturnType<typeof loadTopology>> | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [layer, setLayer] = useState<MapLayer>("score");
  const [customBreaks, setCustomBreaks] = useState<{ key: string; breaks: number[] } | null>(null);
  const [mobileSheet, setMobileSheet] = useState<"legend" | "list" | null>(null);
  const mapRef = useRef<ChoroplethHandle>(null);
  const [answerOpen, setAnswerOpen] = useState(() => {
    try {
      return localStorage.getItem("insurvas.answerCard") !== "dismissed";
    } catch {
      return true;
    }
  });
  const dismissAnswer = () => {
    setAnswerOpen(false);
    try {
      localStorage.setItem("insurvas.answerCard", "dismissed");
    } catch {
      /* the card returns next visit when storage is unavailable */
    }
  };

  useEffect(() => {
    let cancelled = false;
    loadTopology()
      .then((value) => {
        if (cancelled) return;
        setGeo(value);
        // Fetch the detailed mesh after the map is usable; it only sharpens
        // deep zoom and never blocks first interaction.
        const timer = window.setTimeout(() => {
          loadTopology("/data/topo-detail.json")
            .then((detail) => {
              if (!cancelled) setGeo(detail);
            })
            .catch(() => {
              /* the fast mesh remains a complete map */
            });
        }, 4500);
        cleanupDetail = () => window.clearTimeout(timer);
      })
      .catch((error: unknown) => {
        if (!cancelled) setGeoError(error instanceof Error ? error.message : "The map could not be loaded.");
      });
    let cleanupDetail = () => {};
    return () => {
      cancelled = true;
      cleanupDetail();
    };
  }, [attempt]);

  const byFips = useMemo(() => new Map(counties.map((county) => [county.fips, county])), [counties]);
  const ranked = useMemo(
    () =>
      counties
        .filter((county) => county.scores?.[lens]?.eligible)
        .sort((a, b) => (a.scores[lens].rank ?? 9999) - (b.scores[lens].rank ?? 9999)),
    [counties, lens],
  );
  const top = ranked[0];
  const focus = selectedFips ? byFips.get(selectedFips) : top;
  const focusScore = focus?.scores[lens];

  const mapData = useMemo(() => {
    const values = new Map<string, number | null>();
    const flags = new Map<string, MapFlag>();
    const histogramValues: number[] = [];
    let ineligible = 0;
    let partial = 0;
    let missing = 0;

    for (const county of counties) {
      const s = county.scores?.[lens];
      const value = !s || !s.eligible
        ? null
        : isSubScore(layer)
          ? s.subscores?.[layer] ?? null
          : s.total;
      values.set(county.fips, value);
      flags.set(county.fips, !s?.eligible ? "ineligible" : s.partial ? "partial" : null);
      if (!s?.eligible) ineligible += 1;
      else if (s.partial) partial += 1;
      if (value == null) missing += 1;
      else histogramValues.push(value);
    }
    return { values, flags, histogramValues, ineligible, partial, missing };
  }, [counties, lens, layer]);

  const layerKey = `${lens}:${layer}`;
  const defaults = useMemo(() => quantileBreaks(mapData.histogramValues), [mapData.histogramValues]);
  const breaks = customBreaks?.key === layerKey ? customBreaks.breaks : defaults;
  const colors = useMemo(
    () => rampStops({ theme, colorblind: palette === "colorblind" }, 7),
    [theme, palette],
  );
  const layerLabel = layer === "score" ? "Opportunity score" : SUBSCORE_LABEL[layer];

  const strongest = focusScore
    ? [...SUBSCORE_ORDER]
        .filter((key) => Number.isFinite(focusScore.subscores?.[key]))
        .sort((a, b) => (focusScore.subscores?.[b] ?? 0) - (focusScore.subscores?.[a] ?? 0))[0]
    : null;
  const gap = focus?.metrics?.coverage_gap_households_60;

  const hoverCard = useCallback(
    (fips: string): HoverCard => {
      const county = byFips.get(fips);
      if (!county) return { title: "Unknown area", detail: "" };
      const s = county.scores[lens];
      const value = isSubScore(layer) ? s.subscores?.[layer] : s.total;
      const rank = s.rank ? ` · #${s.rank}` : " · unranked";
      return {
        title: `${county.name}, ${county.state}`,
        detail: `${layerLabel} ${score(value ?? null)}${rank}${s.partial ? " · partial data" : ""}`,
      };
    },
    [byFips, lens, layer, layerLabel],
  );

  if (geoError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <ErrorState message={geoError} onRetry={() => { setGeoError(null); setAttempt((value) => value + 1); }} />
      </div>
    );
  }

  if (!geo) return <EmptyState title="Loading map" reason="Preparing the county geometry for 3,144 areas." />;

  const rankedList = (
    <div className="-my-1 space-y-0.5">
      {ranked.slice(0, 50).map((county) => {
        const s = county.scores[lens];
        const active = county.fips === selectedFips;
        return (
          <button
            key={county.fips}
            type="button"
            onClick={() => {
              select(county.fips);
              mapRef.current?.focusFips(county.fips);
              setMobileSheet(null);
            }}
            className={`flex w-full items-center gap-2 rounded-control px-2 py-2 text-left transition-colors ${active ? "bg-surface2" : "hover:bg-surface2"}`}
          >
            <span className="num w-7 text-caption text-tertiary">{s.rank}</span>
            <span className="min-w-0 flex-1 truncate text-body text-primary">{county.name}, {county.state}</span>
            <span className="num text-body-sm text-secondary">{Math.round(s.total ?? 0)}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="relative h-full min-h-[480px] w-full overflow-hidden">
      <h1 className="sr-only">Explore counties</h1>
      <Choropleth
        ref={mapRef}
        counties={geo.counties}
        states={geo.states}
        bbox={geo.bbox}
        values={mapData.values}
        flags={mapData.flags}
        colors={colors}
        breaks={breaks}
        selectedFips={selectedFips}
        compareFips={compare}
        theme={theme}
        onSelect={select}
        onShiftSelect={toggleCompare}
        hoverCard={hoverCard}
        hiddenSummary={ranked.slice(0, 50).map((county) => ({
          fips: county.fips,
          label: `#${county.scores[lens].rank} ${county.name}, ${county.state} — score ${Math.round(county.scores[lens].total ?? 0)}`,
        }))}
      />

      <div className="absolute left-3 top-3 z-panel flex items-center gap-2 md:left-4 md:top-4">
        <label className="glass flex h-10 items-center gap-2 rounded-control border px-2 shadow-l2">
          <Layers size={15} className="text-tertiary" aria-hidden />
          <span className="sr-only">Map layer</span>
          <select
            value={layer}
            onChange={(event) => setLayer(event.target.value as MapLayer)}
            className="h-9 max-w-32 bg-transparent text-body-sm text-primary outline-none sm:max-w-44"
          >
            <option value="score">Score</option>
            {SUBSCORE_ORDER.map((id) => (
              <option key={id} value={id}>{SUBSCORE_LABEL[id]}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setMobileSheet("legend")}
          className="glass flex h-10 items-center gap-1.5 rounded-control border px-2.5 text-caption text-secondary shadow-l2 md:hidden"
        >
          Legend
        </button>
        <button
          type="button"
          onClick={() => setMobileSheet("list")}
          className="glass flex h-10 items-center gap-1.5 rounded-control border px-2.5 text-caption text-secondary shadow-l2 md:hidden"
        >
          <List size={15} aria-hidden /> Top
        </button>
      </div>

      <div className="absolute right-3 top-3 z-panel flex flex-col gap-1 rounded-control border border-subtle bg-surface1/95 p-1 shadow-l2 backdrop-blur md:right-4 md:top-4">
        <button type="button" onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in" className="flex h-11 w-11 items-center justify-center md:h-9 md:w-9 rounded-control text-secondary hover:bg-surface2 hover:text-primary">
          <Plus size={17} aria-hidden />
        </button>
        <button type="button" onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out" className="flex h-11 w-11 items-center justify-center md:h-9 md:w-9 rounded-control text-secondary hover:bg-surface2 hover:text-primary">
          <Minus size={17} aria-hidden />
        </button>
        <button type="button" onClick={() => mapRef.current?.reset()} aria-label="Reset map zoom" className="flex h-11 w-11 items-center justify-center md:h-9 md:w-9 rounded-control text-secondary hover:bg-surface2 hover:text-primary">
          <RotateCcw size={16} aria-hidden />
        </button>
      </div>

      <div className="absolute left-4 top-4 z-panel hidden w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 lg:flex">
        {answerOpen && top && (
          <div className="rounded-card border border-accentborder bg-surface1/95 p-4 shadow-l3 backdrop-blur">
            <div className="flex items-start justify-between gap-2">
              <p className="text-micro uppercase text-tertiary">Top pick · {catalog?.lenses[lens]?.label ?? lens}</p>
              <button type="button" onClick={dismissAnswer} aria-label="Dismiss answer card" className="rounded p-0.5 text-tertiary hover:text-primary">
                <X size={14} aria-hidden />
              </button>
            </div>
            <p className="mt-1 text-h3 leading-snug text-primary">{top.name}, {top.state} leads this lens.</p>
            <p className="mt-1 text-body-sm text-secondary">
              {SUBSCORE_LABEL[strongest ?? SUBSCORE_ORDER[0]]} is the strongest signal. Rank range {scoreRange(top.scores[lens].rank_p05, top.scores[lens].rank_p95)}.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <ScoreChip value={top.scores[lens].total} />
              <RankBadge rank={top.scores[lens].rank} />
              <button type="button" onClick={() => { select(top.fips); mapRef.current?.focusFips(top.fips); }} className="ml-auto text-caption text-accenttext">Open →</button>
            </div>
          </div>
        )}
        <Card title="Top areas">
          <div className="max-h-[38vh] overflow-y-auto">{rankedList}</div>
        </Card>
      </div>

      <div className="absolute bottom-4 left-4 z-panel hidden w-[340px] max-w-[calc(100vw-2rem)] md:block">
        <MapLegend
          layerLabel={layerLabel}
          values={mapData.histogramValues}
          colors={colors}
          breaks={breaks}
          onBreaksChange={(next) => setCustomBreaks({ key: layerKey, breaks: next })}
          onReset={() => setCustomBreaks(null)}
          ineligibleCount={mapData.ineligible}
          partialCount={mapData.partial}
          noDataCount={mapData.missing}
          vintage="ACS 2020–2024"
        />
      </div>

      {focus && focusScore && (
        <div className="absolute bottom-4 right-4 z-panel hidden w-80 max-w-[calc(100vw-2rem)] xl:block">
          <Card title={selectedFips ? "Selected area" : "National leader"}>
            <div className="grid grid-cols-2 divide-x divide-y divide-subtle">
              <KpiCell label="Score" value={score(focusScore.total)} />
              <KpiCell label="60+" value={popCompact(focus.pop60)} />
              <KpiCell label="Rank" value={focusScore.rank ? `#${focusScore.rank}` : "—"} />
              <KpiCell label="Score range (P5-P95)" value={scoreRange(focusScore.p05, focusScore.p95)} valueClassName="text-num-md" />
              <KpiCell label="Coverage-gap households" value={typeof gap === "number" ? popCompact(gap) : "—"} />
              <KpiCell label="Chance of top half" value={focusScore.p_top50 == null ? "—" : `${Math.round(focusScore.p_top50 * 100)}%`} />
            </div>
            <button type="button" onClick={() => select(focus.fips)} className="mt-3 text-caption text-accenttext">View details →</button>
          </Card>
        </div>
      )}

      {selectedFips && focus && (
        <div className="absolute inset-x-3 bottom-3 z-panel md:hidden">
          <button
            type="button"
            onClick={() => select(focus.fips)}
            className="flex w-full items-center gap-3 rounded-card border border-subtle bg-surface1/95 p-3 text-left shadow-l3 backdrop-blur"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body-sm text-primary">{focus.name}, {focus.state}</span>
              <span className="block text-caption text-tertiary">Score {score(focusScore?.total ?? null)} · {focusScore?.rank ? `#${focusScore.rank}` : "unranked"}</span>
            </span>
            <span className="text-caption text-accenttext">View →</span>
          </button>
        </div>
      )}

      <BottomSheet
        open={mobileSheet !== null}
        onOpenChange={(open) => { if (!open) setMobileSheet(null); }}
        title={mobileSheet === "list" ? "Top areas" : `${layerLabel} legend`}
        initialSnap={mobileSheet === "list" ? 2 : 1}
      >
        {mobileSheet === "legend" ? (
          <MapLegend
            layerLabel={layerLabel}
            values={mapData.histogramValues}
            colors={colors}
            breaks={breaks}
            onBreaksChange={(next) => setCustomBreaks({ key: layerKey, breaks: next })}
            onReset={() => setCustomBreaks(null)}
            ineligibleCount={mapData.ineligible}
            partialCount={mapData.partial}
            noDataCount={mapData.missing}
            vintage="ACS 2020–2024"
            className="border-0 shadow-none"
          />
        ) : (
          <div className="pb-4">{rankedList}</div>
        )}
      </BottomSheet>
    </div>
  );
}
