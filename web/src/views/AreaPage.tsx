import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore, weightsFor } from "../state/store";
import { PageHeader } from "../design-system/patterns/PageHeader";
import { Card } from "../design-system/primitives/Card";
import { KpiStrip, KpiCell } from "../design-system/patterns/kpi";
import { RankBadge, ScoreChip, ConfidenceBadge, RobustPickBadge } from "../design-system/primitives/badges";
import { popCompact, scoreRange, rankRange, topHalf, score, metricValue } from "../state/format";
import { SUBSCORE_ORDER, SUBSCORE_LABEL, SUBSCORE_COLOR } from "../state/lensMeta";
import { MetricLabel } from "../design-system/patterns/MetricLabel";
import { Breadcrumb } from "../design-system/patterns/Breadcrumb";
import { ChartFrame, RadarChart, SubScoreBars, SubScoreTable, Waterfall, type RadarSeries } from "../design-system/charts";
import { Button } from "../design-system/primitives/Button";

const HIGHLIGHT_METRICS = [
  "pop_60plus",
  "share_60plus",
  "growth_60plus",
  "income_65plus_median",
  "home_equity_65",
  "agencies_per_1000_60plus",
  "chronic_burden_composite",
  "coverage_gap_households_60",
];

export default function AreaPage({ embedded = false }: { embedded?: boolean }) {
  const { counties, lens, selectedFips, catalog, select, toggleCompare, compare } = useStore();
  const navigate = useNavigate();
  const openArea = (fips: string) => (embedded ? select(fips) : navigate(`/area/${fips}`));
  const [profile, setProfile] = useState<"radar" | "bars">(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches ? "bars" : "radar",
  );
  const c = useMemo(() => counties.find((x) => x.fips === selectedFips), [counties, selectedFips]);
  if (!c) return <div className="p-6 text-secondary">Select a county from the map or rankings to view details.</div>;
  const s = c.scores[lens];
  const width = (s.p95 ?? 0) - (s.p05 ?? 0);
  const confidence: "high" | "medium" | "low" = width <= 8 ? "high" : width <= 16 ? "medium" : "low";
  // A robust pick is a county that lands in the better half of the country in
  // almost every simulation - not one whose *upper* bound is low.
  const robust = (s.p_top50 ?? 0) >= 0.8;
  const allMetrics = catalog?.metrics ?? [];
  const metricById = (id: string) => allMetrics.find((m) => m.id === id);
  const axes = SUBSCORE_ORDER.map((ss) => ({ id: ss, label: SUBSCORE_LABEL[ss] }));
  const stateAverage = SUBSCORE_ORDER.map((ss) => {
    const values = counties
      .filter((x) => x.state === c.state)
      .map((x) => x.scores[lens].subscores?.[ss])
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : NaN;
  });
  const weights = weightsFor(lens);
  const availableWeight = SUBSCORE_ORDER.reduce(
    (sum, ss) => sum + (Number.isFinite(s.subscores?.[ss]) ? weights[ss] : 0),
    0,
  );
  const contributions = SUBSCORE_ORDER.map((ss) => {
    const value = s.subscores?.[ss];
    return {
      id: ss,
      label: SUBSCORE_LABEL[ss],
      value: typeof value === "number" && availableWeight > 0 ? (value * weights[ss]) / availableWeight : 0,
      color: SUBSCORE_COLOR[ss],
    };
  }).filter((c) => c.value > 0);

  const lookalikes = (() => {
    const target = SUBSCORE_ORDER.map((ss) => s.subscores?.[ss] ?? NaN);
    return counties
      .filter((x) => x.fips !== c.fips && x.scores[lens].eligible)
      .map((x) => {
        let sum = 0;
        let n = 0;
        SUBSCORE_ORDER.forEach((ss, i) => {
          const v = x.scores[lens].subscores?.[ss];
          if (typeof v === "number" && Number.isFinite(target[i])) {
            sum += (v - target[i]) ** 2;
            n += 1;
          }
        });
        const distance = n ? Math.sqrt(sum / n) : Infinity;
        return { county: x, distance, similarity: Number.isFinite(distance) ? Math.max(0, 100 - distance) : 0 };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  })();

  const profileSeries: RadarSeries[] = [
    {
      id: "area",
      label: c.name,
      color: "#5D8647",
      values: SUBSCORE_ORDER.map((ss) => s.subscores?.[ss] ?? NaN),
    },
    { id: "state", label: `${c.state} average`, color: "#0072B2", values: stateAverage },
    { id: "us", label: "US median", color: "#8A8378", values: SUBSCORE_ORDER.map(() => 50) },
  ];
  const strongest = [...SUBSCORE_ORDER]
    .filter((ss) => s.subscores?.[ss] != null)
    .sort((a, b) => (s.subscores?.[b] ?? 0) - (s.subscores?.[a] ?? 0))
    .slice(0, 2);

  return (
    <div className="flex h-full flex-col">
      {!embedded && (
        <div className="border-b border-subtle bg-surface1 px-4 pt-3 md:px-6">
          <Breadcrumb items={[{ label: "Map", to: "/" }, { label: "Rankings", to: "/rankings" }, { label: `${c.name}, ${c.state}` }]} />
        </div>
      )}
      {!embedded && (
        <PageHeader
          title={`${c.name}, ${c.state}`}
          description={`FIPS ${c.fips} • ${popCompact(c.pop60)} aged 60+`}
          actions={<div className="flex flex-wrap gap-2"><RankBadge rank={s.rank} /><ScoreChip value={s.total} /><ConfidenceBadge level={confidence} />{robust && <RobustPickBadge />}</div>}
        />
      )}
      <div className={embedded ? "space-y-4" : "space-y-4 p-4 md:p-6"}>
        <KpiStrip>
          <KpiCell label="Opportunity score" value={score(s.total)} />
          <KpiCell label="Residents 60+" value={popCompact(c.pop60)} />
          <KpiCell label="Rank" value={s.rank ? `#${s.rank}` : "—"} />
          <KpiCell label="Score range (P5-P95)" value={scoreRange(s.p05, s.p95)} valueClassName="text-num-md" />
          <KpiCell
            label="Rank range (P5-P95)"
            value={rankRange(s.rank_p05, s.rank_p95)}
            valueClassName="text-num-md"
          />
          <KpiCell
            label="Chance of a top-half finish"
            value={topHalf(s.p_top50)}
            valueClassName="text-num-md"
          />
        </KpiStrip>

        <ChartFrame
          title="Why this score"
          subtitle="Each bar is a sub-score times its normalised weight"
          vintage="ACS 2020–2024"
          summary={`The bars sum to ${score(s.total)}. ${strongest.length ? `${SUBSCORE_LABEL[strongest[0]]} contributes the most.` : "No sub-score is available."}`}
          table={
            <table className="w-full text-left text-body-sm">
              <thead><tr className="border-b border-subtle text-caption text-tertiary"><th className="py-2 pr-3 font-medium">Sub-score</th><th className="py-2 text-right font-medium">Points</th></tr></thead>
              <tbody>
                {contributions.map((c) => (
                  <tr key={c.id} className="border-b border-subtle last:border-0"><th scope="row" className="py-2 pr-3 font-normal text-secondary">{c.label}</th><td className="py-2 text-right font-mono text-mono text-primary">{c.value.toFixed(1)}</td></tr>
                ))}
              </tbody>
            </table>
          }
        >
          <Waterfall items={contributions} height={220} ariaLabel={`Contribution waterfall for ${c.name}`} />
        </ChartFrame>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartFrame
            title="Sub-score profile"
            subtitle="Percentile within the US · six fixed axes"
            vintage="ACS 2020–2024"
            summary={`${c.name} scores highest on ${strongest.length ? SUBSCORE_LABEL[strongest[0]] : "no sub-score"}. The radar and bars show the same six values; the table lists them exactly.`}
            table={<SubScoreTable axes={axes} series={profileSeries} />}
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
              <RadarChart axes={axes} series={profileSeries} height={300} ariaLabel={`Sub-score radar for ${c.name}`} />
            ) : (
              <SubScoreBars axes={axes} series={profileSeries} className="py-2" />
            )}
          </ChartFrame>

          <Card title="Why this area ranks here">
            <p className="text-body-sm text-secondary">
              {strongest.length > 0 ? (
                <>
                  Strongest signal{strongest.length > 1 ? "s are" : " is"}{" "}
                  <span className="text-primary">{SUBSCORE_LABEL[strongest[0]]}</span>
                  {strongest.length > 1 && (
                    <>
                      {" and "}
                      <span className="text-primary">{SUBSCORE_LABEL[strongest[1]]}</span>
                    </>
                  )}
                  .{" "}
                </>
              ) : (
                "No sub-score could be computed for this area. "
              )}
              Every score is a within-US percentile; eligibility requires at least 2,000 residents aged 60+.
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-body-sm">
              <dt className="text-tertiary">State</dt><dd className="text-primary">{c.state}</dd>
              <dt className="text-tertiary">FIPS</dt><dd className="num text-primary">{c.fips}</dd>
              <dt className="text-tertiary">Eligible</dt><dd className="text-primary">{s.eligible ? "Yes" : "No"}</dd>
              <dt className="text-tertiary">Uncertainty</dt><dd className="text-primary">{width <= 8 ? "Tight" : width <= 16 ? "Moderate" : "Wide"}</dd>
            </dl>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <ConfidenceBadge level={confidence} />
              {robust && <RobustPickBadge />}
            </div>
            <button type="button" onClick={() => toggleCompare(c.fips)} className="mt-4 rounded-control border border-default px-3 py-1.5 text-caption text-secondary hover:text-primary">
              {compare.includes(c.fips) ? "Remove from compare" : "Add to compare"}
            </button>
          </Card>
        </div>

        <Card title="Key metrics" info="Public data; race, ethnicity, national origin, religion and disability are never used (R7).">
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {HIGHLIGHT_METRICS.map((id) => {
              const m = metricById(id);
              if (!m) return null;
              const v = c.metrics?.[id];
              return (
                <div key={id} className="flex items-baseline justify-between gap-3 border-b border-subtle pb-2">
                  <div className="min-w-0">
                    <MetricLabel metric={m} county={c} className="text-body-sm text-secondary" />
                    <div className="text-caption text-tertiary">{m.source.toUpperCase()} · {m.vintage}</div>
                  </div>
                  <div className="num shrink-0 text-body text-primary">{metricValue(m.unit, typeof v === "number" ? v : null, { compact: true })}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Lookalikes" info="Five eligible counties with the closest sub-score profile. Use these as expansion analogues, not twins.">
          <ul className="divide-y divide-subtle">
            {lookalikes.map(({ county, similarity }) => (
              <li key={county.fips} className="flex items-center gap-3 py-2">
                <button type="button" onClick={() => openArea(county.fips)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-body-sm text-primary">{county.name}, {county.state}</span>
                  <span className="block text-caption text-tertiary">{similarity.toFixed(0)}% profile similarity</span>
                </button>
                <span className="num text-caption text-tertiary">#{county.scores[lens].rank}</span>
                <button type="button" onClick={() => toggleCompare(county.fips)} className="rounded-control border border-default px-2 py-1 text-caption text-secondary hover:text-primary">
                  {compare.includes(county.fips) ? "Remove" : "Add"}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-wrap gap-3 text-caption">
          <Link to={`/area/${c.fips}`} className="text-accenttext hover:underline">Full page</Link>
          <Link to={`/print/${c.fips}`} className="text-accenttext hover:underline">Print brief</Link>
          <span className="text-tertiary">Shareable links keep the selected lens and filters.</span>
        </div>
      </div>
    </div>
  );
}
