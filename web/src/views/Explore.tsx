import { useEffect, useMemo, useState } from "react";
import { useStore } from "../state/store";
import { loadTopology } from "../design-system/map/geometry";
import { Choropleth } from "../design-system/map/Choropleth";
import { Card } from "../design-system/primitives/Card";
import { KpiCell } from "../design-system/patterns/kpi";
import { usePreferences } from "../design-system/providers/PreferencesProvider";
import { rampStops } from "../design-system/map/ramp";
import { rankRange, popCompact, score } from "../state/format";
import { EmptyState } from "../design-system/patterns/states";

export default function Explore() {
  const { counties, lens, selectedFips, select, toggleCompare, compare } = useStore();
  const { theme, palette } = usePreferences();
  const [geo, setGeo] = useState<Awaited<ReturnType<typeof loadTopology>> | null>(null);
  const [hover, setHover] = useState<{ fips: string | null; x: number; y: number }>({ fips: null, x: 0, y: 0 });

  useEffect(() => { loadTopology().then(setGeo).catch(() => {}); }, []);

  const byFips = useMemo(() => Object.fromEntries(counties.map((c) => [c.fips, c])), [counties]);
  const ranked = useMemo(() => counties.filter((c) => c.scores?.[lens]?.eligible).sort((a, b) => (a.scores[lens].rank ?? 9999) - (b.scores[lens].rank ?? 9999)), [counties, lens]);
  const top = ranked[0];

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
          if (!s || !s.eligible) return null;
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
        hiddenSummary={ranked.slice(0, 50).map((c) => ({ fips: c.fips, label: `#${c.scores[lens].rank} ${c.name}, ${c.state} — score ${Math.round(c.scores[lens].total)}` }))}
      />

      <div className="absolute left-4 top-4 z-panel hidden w-72 max-w-[calc(100vw-2rem)] sm:block">
        <Card title="Top areas">
          <div className="-my-1 space-y-0.5">
            {ranked.slice(0, 10).map((c) => {
              const s = c.scores[lens];
              const active = c.fips === selectedFips;
              return (
                <button key={c.fips} type="button" onClick={() => select(c.fips)} className={`flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left transition-colors ${active ? "bg-surface2" : "hover:bg-surface2"}`}>
                  <span className="num w-6 text-caption text-tertiary">{s.rank}</span>
                  <span className="flex-1 truncate text-body text-primary">{c.name}, {c.state}</span>
                  <span className="num text-body-sm text-secondary">{Math.round(s.total)}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {top && (
        <div className="absolute bottom-4 right-4 z-panel w-72 max-w-[calc(100vw-2rem)]">
          <Card>
            <div className="grid grid-cols-2 divide-x divide-y divide-subtle">
              <KpiCell label="Score" value={score(top.scores[lens].total)} />
              <KpiCell label="60+" value={popCompact(top.pop60)} />
              <KpiCell label="Rank" value={top.scores[lens].rank ? `#${top.scores[lens].rank}` : "—"} />
              <KpiCell label="Range" value={rankRange(top.scores[lens].p05, top.scores[lens].p95)} valueClassName="text-num-md" />
            </div>
            <button type="button" onClick={() => select(top.fips)} className="mt-3 text-caption text-accenttext">View details →</button>
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
          {byFips[hover.fips].name}, {byFips[hover.fips].state} — {Math.round(byFips[hover.fips].scores[lens].total)}
        </div>
      )}
    </div>
  );
}
