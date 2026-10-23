import { useEffect, useMemo, useState } from "react";
import { useStore } from "../state/store";
import { loadTopology } from "../design-system/map/geometry";
import { Choropleth } from "../design-system/map/Choropleth";
import { Card } from "../design-system/primitives/Card";
import { KpiCell } from "../design-system/patterns/kpi";
import { usePreferences } from "../design-system/providers/PreferencesProvider";
import { rampStops } from "../design-system/map/ramp";
import { scoreRange, popCompact, score } from "../state/format";
import { EmptyState } from "../design-system/patterns/states";
import { ScoreChip, RankBadge } from "../design-system/primitives/badges";
import { X } from "../design-system/icons";
import { SUBSCORE_LABEL, SUBSCORE_ORDER } from "../state/lensMeta";

export default function Explore() {
  const { counties, lens, selectedFips, select, toggleCompare, compare } = useStore();
  const { theme, palette } = usePreferences();
  const [geo, setGeo] = useState<Awaited<ReturnType<typeof loadTopology>> | null>(null);
  const [hover, setHover] = useState<{ fips: string | null; x: number; y: number }>({ fips: null, x: 0, y: 0 });
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

  useEffect(() => { loadTopology().then(setGeo).catch(() => {}); }, []);

  const byFips = useMemo(() => Object.fromEntries(counties.map((c) => [c.fips, c])), [counties]);
  const ranked = useMemo(() => counties.filter((c) => c.scores?.[lens]?.eligible).sort((a, b) => (a.scores[lens].rank ?? 9999) - (b.scores[lens].rank ?? 9999)), [counties, lens]);
  const top = ranked[0];
  const focus = selectedFips ? byFips[selectedFips] : top;
  const focusScore = focus?.scores[lens];
  const strongest = focusScore
    ? [...SUBSCORE_ORDER]
        .filter((ss) => Number.isFinite(focusScore.subscores?.[ss]))
        .sort((a, b) => (focusScore.subscores?.[b] ?? 0) - (focusScore.subscores?.[a] ?? 0))[0]
    : null;
  const gap = focus?.metrics?.coverage_gap_households_60;

  if (!geo) return <EmptyState title="Loading map" reason="Preparing the county geometry for 3,144 areas." />;

  return (
    <div className="relative h-full w-full">
      <Choropleth
        counties={geo.counties}
        states={geo.states}
        bbox={geo.bbox}
        value={(fips) => {
          const c = byFips[fips];
          const s = c?.scores?.[lens];
          if (!s || !s.eligible || s.total == null) return null;
          return s.total / 100;
        }}
        flagged={(fips) => {
          const c = byFips[fips];
          return !(c?.scores?.[lens]?.eligible ?? true);
        }}
        selectedFips={selectedFips}
        compareFips={compare}
        onHover={(fips, x, y) => setHover({ fips, x, y })}
        onSelect={select}
        onShiftSelect={toggleCompare}
        theme={theme}
        colorblind={palette === "colorblind"}
        hiddenSummary={ranked.slice(0, 50).map((c) => ({ fips: c.fips, label: `#${c.scores[lens].rank} ${c.name}, ${c.state} — score ${Math.round(c.scores[lens].total ?? 0)}` }))}
      />

      <div className="absolute left-4 top-4 z-panel hidden w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 sm:flex">
        {answerOpen && top && (
          <div className="rounded-card border border-accentborder bg-surface1/95 p-4 shadow-l3 backdrop-blur">
            <div className="flex items-start justify-between gap-2">
              <p className="text-micro uppercase text-tertiary">Top pick · {lens}</p>
              <button type="button" onClick={dismissAnswer} aria-label="Dismiss answer card" className="rounded p-0.5 text-tertiary hover:text-primary">
                <X size={14} aria-hidden />
              </button>
            </div>
            <p className="mt-1 text-h3 leading-snug text-primary">
              {top.name}, {top.state} leads this lens.
            </p>
            <p className="mt-1 text-body-sm text-secondary">
              {SUBSCORE_LABEL[strongest ?? SUBSCORE_ORDER[0]]} is the strongest signal. Rank range {scoreRange(top.scores[lens].rank_p05, top.scores[lens].rank_p95)}.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <ScoreChip value={top.scores[lens].total} />
              <RankBadge rank={top.scores[lens].rank} />
              <button type="button" onClick={() => select(top.fips)} className="ml-auto text-caption text-accenttext">Open →</button>
            </div>
          </div>
        )}
        <Card title="Top areas">
          <div className="-my-1 space-y-0.5">
            {ranked.slice(0, 10).map((c) => {
              const s = c.scores[lens];
              const active = c.fips === selectedFips;
              return (
                <button key={c.fips} type="button" onClick={() => select(c.fips)} className={`flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left transition-colors ${active ? "bg-surface2" : "hover:bg-surface2"}`}>
                  <span className="num w-6 text-caption text-tertiary">{s.rank}</span>
                  <span className="flex-1 truncate text-body text-primary">{c.name}, {c.state}</span>
                  <span className="num text-body-sm text-secondary">{Math.round(s.total ?? 0)}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {focus && focusScore && (
        <div className="absolute bottom-4 right-4 z-panel w-80 max-w-[calc(100vw-2rem)]">
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

      <div className="absolute bottom-4 left-4 z-panel hidden w-56 max-w-[calc(100vw-2rem)] rounded-card border border-subtle bg-surface1/95 p-3 backdrop-blur sm:block">
        <div className="flex items-center justify-between text-caption text-tertiary"><span>Low</span><span className="text-micro uppercase">Opportunity</span><span>High</span></div>
        <div className="mt-2 h-2 rounded-pill" style={{ background: `linear-gradient(90deg, ${rampStops({ theme, colorblind: palette === "colorblind" }, 9).join(", ")})` }} />
        <div className="mt-2 flex items-center gap-2 text-caption text-tertiary"><span className="hatch h-3 w-4 rounded-chip border border-subtle" /> Not eligible</div>
      </div>

      {hover.fips && byFips[hover.fips] && (
        <div className="pointer-events-none absolute z-tooltip rounded-control border border-default bg-surface1 px-2 py-1 text-caption shadow-l3" style={{ left: hover.x + 12, top: hover.y + 12 }}>
          {byFips[hover.fips].name}, {byFips[hover.fips].state} — {Math.round(byFips[hover.fips].scores[lens].total ?? 0)}
        </div>
      )}
    </div>
  );
}
