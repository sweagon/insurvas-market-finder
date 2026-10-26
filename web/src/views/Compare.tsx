import { useMemo, useState } from "react";
import { MAX_COMPARE } from "../state/store";
import { useStore } from "../state/store";
import { PageHeader } from "../design-system/patterns/PageHeader";
import { Card } from "../design-system/primitives/Card";
import { RankBadge, ScoreChip, Monogram } from "../design-system/primitives/badges";
import { popCompact, scoreRange, score, stateAbbr, metricValue } from "../state/format";
import { SUBSCORE_ORDER, SUBSCORE_LABEL, SUBSCORE_COLOR, LENS_COLOR } from "../state/lensMeta";
import { MetricLabel } from "../design-system/patterns/MetricLabel";
import { ChartFrame, RadarChart, SubScoreBars, SubScoreTable, type RadarSeries } from "../design-system/charts";
import { Button } from "../design-system/primitives/Button";
import { Check } from "../design-system/icons";
import { estimateFlag } from "../state/estimate";
import { FLAG_DESCRIPTIONS } from "../data/types";
import type { CountyRow } from "../data/types";

const KEY_METRICS = [
  "pop_60plus",
  "income_65plus_median",
  "home_equity_65",
  "agencies_per_1000_60plus",
  "chronic_burden_composite",
  "coverage_gap_households_60",
];

export default function Compare() {
  const { counties, lens, compare, select, toggleCompare, clearCompare, catalog } = useStore();
  const items = useMemo(
    () =>
      compare
        .map((f) => counties.find((c) => c.fips === f))
        .filter((c): c is CountyRow => Boolean(c)),
    [counties, compare],
  );
  const ranked = useMemo(
    () => counties.filter((c) => c.scores?.[lens]?.eligible).sort((a, b) => (a.scores[lens].rank ?? 9999) - (b.scores[lens].rank ?? 9999)).slice(0, 6),
    [counties, lens],
  );
  const metrics = catalog?.metrics ?? [];
  const COLORS = ["#5D8647", "#0072B2", "#E69F00", "#D55E00"];
  const radarSeries: RadarSeries[] = items.slice(0, MAX_COMPARE).map((c, i) => ({
    id: c.fips,
    label: c.name,
    color: COLORS[i % COLORS.length],
    values: SUBSCORE_ORDER.map((ss) => c.scores[lens].subscores?.[ss] ?? NaN),
  }));
  const radarAxes = SUBSCORE_ORDER.map((ss) => ({ id: ss, label: SUBSCORE_LABEL[ss] }));
  const [profile, setProfile] = useState<"radar" | "bars">(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches ? "bars" : "radar",
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Compare"
        description={compare.length ? `${compare.length} counties side by side.` : "Select up to 4 counties to compare across sub-scores and key metrics."}
        actions={compare.length > 0 ? <button type="button" onClick={clearCompare} className="text-caption text-accenttext">Clear all</button> : undefined}
      />
      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4 md:p-6">
        {items.length === 0 && (
          <>
            <Card className="py-10 text-center text-secondary">No counties selected. Start with one of this lens's leaders.</Card>
            <Card title="Suggested comparisons">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {ranked.map((c) => {
                  const s = c.scores[lens];
                  return (
                    <button key={c.fips} type="button" onClick={() => toggleCompare(c.fips)} className="flex items-center gap-3 rounded-control border border-subtle px-3 py-2 text-left hover:bg-surface2">
                      <Monogram abbr={stateAbbr(c.state)} size={28} color={LENS_COLOR[lens]} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body-sm text-primary">{c.name}</span>
                        <span className="block text-caption text-tertiary">{c.state} • score {score(s.total)}</span>
                      </span>
                      <span className="text-caption text-accenttext">Add</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          </>
        )}

        {items.length > 0 && (
          <>
            <div className={`grid grid-cols-1 gap-4 ${items.length > 2 ? "lg:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2"}`}>
              {items.map((c, idx) => {
                const s = c.scores[lens];
                const color = COLORS[idx % COLORS.length];
                return (
                  <Card key={c.fips}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-6 w-6 shrink-0 rounded-pill" style={{ background: color }} aria-hidden />
                        <div className="min-w-0">
                          <div className="truncate text-body font-medium text-primary">{c.name}</div>
                          <div className="truncate text-caption text-tertiary">{c.state} • {c.fips}</div>
                        </div>
                      </div>
                      <button type="button" onClick={() => toggleCompare(c.fips)} aria-label={`Remove ${c.name}`} className="text-caption text-tertiary hover:text-primary">✕</button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <RankBadge rank={s.rank} />
                      <ScoreChip value={s.total} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-caption">
                      <div><div className="text-tertiary">60+ population</div><div className="num mt-0.5 text-body text-primary">{popCompact(c.pop60)}</div></div>
                      <div><div className="text-tertiary">Score range (P5-P95)</div><div className="num mt-0.5 text-body text-primary">{scoreRange(s.p05, s.p95)}</div></div>
                    </div>
                    <button type="button" onClick={() => select(c.fips)} className="mt-3 text-caption text-accenttext">Open details →</button>
                  </Card>
                );
              })}
            </div>

            <ChartFrame
              title="Profile overlay"
              subtitle={`${items.length} area${items.length === 1 ? "" : "s"}`}
              vintage="ACS 2020–2024"
              summary="Overlaid sub-score profiles show which areas lead on size, need, affordability and reach."
              table={<SubScoreTable axes={radarAxes} series={radarSeries} />}
              actions={
                <div className="flex rounded-control border border-subtle p-0.5">
                  <Button size="sm" variant={profile === "radar" ? "secondary" : "ghost"} aria-pressed={profile === "radar"} onClick={() => setProfile("radar")}>
                    Radar
                  </Button>
                  <Button size="sm" variant={profile === "bars" ? "secondary" : "ghost"} aria-pressed={profile === "bars"} onClick={() => setProfile("bars")}>
                    Bars
                  </Button>
                </div>
              }
            >
              {profile === "radar" ? (
                <RadarChart axes={radarAxes} series={radarSeries} height={320} ariaLabel="Compare sub-score radar" />
              ) : (
                <SubScoreBars axes={radarAxes} series={radarSeries} className="py-2" />
              )}
            </ChartFrame>

            <Card title="Sub-score breakdown">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-body-sm">
                  <thead>
                    <tr className="border-b border-subtle text-micro uppercase text-tertiary">
                      <th className="py-2 text-left font-medium">Dimension</th>
                      {items.map((c) => <th key={c.fips} className="py-2 text-right font-medium">{c.name}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {SUBSCORE_ORDER.map((ss) => {
                      const vals = items.map((c) => c.scores[lens].subscores?.[ss] ?? 0);
                      const best = Math.max(...vals);
                      const worst = Math.min(...vals);
                      return (
                        <tr key={ss}>
                          <td className="py-2" style={{ color: SUBSCORE_COLOR[ss] }}>{SUBSCORE_LABEL[ss]}</td>
                          {vals.map((v, i) => (
                            <td key={items[i].fips} className={`num py-2 text-right ${v === best ? "font-semibold text-primary" : "text-secondary"}`}>
                              <span className="inline-flex items-center justify-end gap-1">
                                {v === best && <Check size={12} className="text-positive" aria-label="Best" />}
                                {v === worst && vals.length > 1 && best !== worst && <span className="size-1.5 rounded-full bg-warning" aria-label="Worst" />}
                                {score(v)}
                              </span>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                    {KEY_METRICS.map((id) => {
                      const m = metrics.find((x) => x.id === id);
                      if (!m) return null;
                      return (
                        <tr key={id}>
                          <td className="py-2 text-tertiary"><MetricLabel metric={m} /></td>
                          {items.map((c) => {
                            const flag = estimateFlag(m, c);
                            return (
                              <td key={c.fips} className="num py-2 text-right text-secondary">
                                {metricValue(m.unit, c.metrics?.[id] as number, { compact: true })}
                                {flag && (
                                  <span title={FLAG_DESCRIPTIONS[flag]} className="ml-1 text-warning" aria-label="Estimate">
                                    •</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
