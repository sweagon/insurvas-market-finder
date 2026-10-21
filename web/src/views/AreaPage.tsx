import { useMemo } from "react";
import { useStore } from "../state/store";
import { PageHeader } from "../design-system/patterns/PageHeader";
import { Card } from "../design-system/primitives/Card";
import { KpiStrip, KpiCell } from "../design-system/patterns/kpi";
import { RankBadge, ScoreChip, ConfidenceBadge, RobustPickBadge } from "../design-system/primitives/badges";
import { popCompact, scoreRange, score, metricValue } from "../state/format";
import { SUBSCORE_ORDER, SUBSCORE_LABEL, SUBSCORE_COLOR } from "../state/lensMeta";

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
  const { counties, lens, selectedFips, catalog, toggleCompare, compare } = useStore();
  const c = useMemo(() => counties.find((x) => x.fips === selectedFips), [counties, selectedFips]);
  if (!c) return <div className="p-6 text-secondary">Select a county from the map or rankings to view details.</div>;
  const s = c.scores[lens];
  const width = (s.p95 ?? 0) - (s.p05 ?? 0);
  const confidence: "high" | "medium" | "low" = width <= 8 ? "high" : width <= 16 ? "medium" : "low";
  const allMetrics = catalog?.metrics ?? [];
  const metricById = (id: string) => allMetrics.find((m) => m.id === id);
  const strongest = [...SUBSCORE_ORDER]
    .filter((ss) => s.subscores?.[ss] != null)
    .sort((a, b) => (s.subscores?.[b] ?? 0) - (s.subscores?.[a] ?? 0))
    .slice(0, 2);

  return (
    <div className="flex h-full flex-col">
      {!embedded && (
        <PageHeader
          title={`${c.name}, ${c.state}`}
          description={`FIPS ${c.fips} • ${popCompact(c.pop60)} aged 60+`}
          actions={<div className="flex flex-wrap gap-2"><RankBadge rank={s.rank} /><ScoreChip value={s.total} /><ConfidenceBadge level={confidence} />{s.p95 != null && s.p95 <= 50 && <RobustPickBadge />}</div>}
        />
      )}
      <div className={embedded ? "space-y-4" : "space-y-4 p-4 md:p-6"}>
        <KpiStrip>
          <KpiCell label="Opportunity score" value={score(s.total)} />
          <KpiCell label="Residents 60+" value={popCompact(c.pop60)} />
          <KpiCell label="Rank" value={s.rank ? `#${s.rank}` : "—"} />
          <KpiCell label="Score range (P5-P95)" value={scoreRange(s.p05, s.p95)} valueClassName="text-num-md" />
        </KpiStrip>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Sub-scores">
            <div className="space-y-2.5">
              {SUBSCORE_ORDER.map((ss) => {
                const v = s.subscores?.[ss] ?? null;
                return (
                  <div key={ss}>
                    <div className="mb-1 flex items-center justify-between text-body-sm">
                      <span style={{ color: SUBSCORE_COLOR[ss] }}>{SUBSCORE_LABEL[ss]}</span>
                      <span className="num text-primary">{score(v)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-pill bg-surface3" role="img" aria-label={v == null ? `${SUBSCORE_LABEL[ss]} unavailable` : `${SUBSCORE_LABEL[ss]} ${Math.round(v)} of 100`}>
                      <div className="h-full rounded-pill" style={{ width: `${Math.max(0, Math.min(100, v ?? 0))}%`, background: SUBSCORE_COLOR[ss] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

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
              {s.p95 != null && s.p95 <= 50 && <RobustPickBadge />}
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
                    <div className="truncate text-body-sm text-secondary">{m.label}</div>
                    <div className="text-caption text-tertiary">{m.source.toUpperCase()} · {m.vintage}</div>
                  </div>
                  <div className="num shrink-0 text-body text-primary">{metricValue(m.unit, typeof v === "number" ? v : null, { compact: true })}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
