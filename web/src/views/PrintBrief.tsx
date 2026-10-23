import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore, weightsFor } from "../state/store";
import { Brand } from "../design-system/patterns/Brand";
import { Waterfall } from "../design-system/charts";
import { EmptyState } from "../design-system/patterns/states";
import { SUBSCORE_COLOR, SUBSCORE_LABEL, SUBSCORE_ORDER } from "../state/lensMeta";
import { CATALOG_CONFIG_HASH } from "../data/types";
import {
  metricValue,
  pop,
  rankRange,
  score,
  scoreRange,
  topHalf,
} from "../state/format";

/**
 * Print brief (Part H): one area, one lens, on paper. Light by contract,
 * provenance and uncertainty included, no interactive affordances.
 */
export default function PrintBrief() {
  const { fips = "" } = useParams();
  const { counties, catalog, lens, selectedFips, select } = useStore();

  useEffect(() => {
    if (fips && selectedFips !== fips) select(fips);
  }, [fips, selectedFips, select]);

  const c = counties.find((x) => x.fips === fips);
  if (!c) {
    return (
      <EmptyState
        title="Area not found"
        reason="The FIPS code is missing from the current dataset."
      />
    );
  }

  const s = c.scores[lens];
  const lensInfo = catalog?.lenses?.[lens];
  const metrics = catalog?.metrics ?? [];
  const meta = catalog?.meta;
  const weights = weightsFor(lens);
  const availableWeight = SUBSCORE_ORDER.reduce(
    (sum, ss) => sum + (Number.isFinite(s.subscores?.[ss]) ? weights[ss] : 0),
    0,
  );
  const contributions = SUBSCORE_ORDER.map((ss) => ({
    id: ss,
    label: SUBSCORE_LABEL[ss],
    value: typeof s.subscores?.[ss] === "number" && availableWeight > 0 ? (s.subscores[ss] * weights[ss]) / availableWeight : 0,
    color: SUBSCORE_COLOR[ss],
  })).filter((x) => x.value > 0);

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
        return { county: x, similarity: Number.isFinite(distance) ? Math.max(0, 100 - distance) : 0 };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
  })();

  return (
    <div className="print-sheet min-h-screen px-6 py-8 print:p-0">
      <div className="mx-auto max-w-[820px] space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-default pb-4">
          <div>
            <Brand tone="light" className="h-6 w-auto" />
            <h1 className="mt-3 text-h1 text-primary">
              {c.name}, {c.state}
            </h1>
            <p className="mt-1 text-body-sm text-secondary">
              FIPS {c.fips} · {pop(c.pop60)} residents aged 60+ · lens{" "}
              {lensInfo?.label ?? lens}
            </p>
          </div>
          <div className="text-right">
            <div className="text-micro uppercase text-tertiary">Opportunity score</div>
            <div className="num text-display text-primary">{score(s.total)}</div>
            <div className="text-body-sm text-secondary">
              Rank {s.rank ? `#${s.rank}` : "not ranked"}
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Score range (P5–P95)", scoreRange(s.p05, s.p95)],
            ["Rank range (P5–P95)", rankRange(s.rank_p05, s.rank_p95)],
            ["Chance of top half", topHalf(s.p_top50)],
            ["Coverage", s.coverage == null ? "—" : `${Math.round(s.coverage * 100)}%`],
          ].map(([label, value]) => (
            <div key={label} className="border border-subtle p-3">
              <div className="text-micro uppercase text-tertiary">{label}</div>
              <div className="num mt-1 text-num-md text-primary">{value}</div>
            </div>
          ))}
        </section>

        <section>
          <h2 className="border-b border-default pb-1 text-h3 text-primary">Sub-scores</h2>
          <div className="mt-2 space-y-1.5">
            {SUBSCORE_ORDER.map((ss) => (
              <div key={ss} className="grid grid-cols-[150px_56px_1fr] items-center gap-2 text-body-sm">
                <span style={{ color: SUBSCORE_COLOR[ss] }}>{SUBSCORE_LABEL[ss]}</span>
                <span className="num text-right text-primary">{score(s.subscores?.[ss])}</span>
                <span className="h-1.5 overflow-hidden rounded-pill bg-surface3">
                  <span
                    className="block h-full rounded-pill"
                    style={{
                      width: `${Math.max(0, Math.min(100, s.subscores?.[ss] ?? 0))}%`,
                      background: SUBSCORE_COLOR[ss],
                    }}
                  />
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="border-b border-default pb-1 text-h3 text-primary">Why this score</h2>
          <p className="mt-2 text-caption text-secondary">Each bar is a sub-score multiplied by its normalised lens weight; bars sum to the score.</p>
          <div className="mt-2">
            <Waterfall items={contributions} height={170} ariaLabel={`Contribution waterfall for ${c.name}`} />
          </div>
        </section>

        <section>
          <h2 className="border-b border-default pb-1 text-h3 text-primary">Lookalike counties</h2>
          <div className="overflow-x-auto">
          <table className="mt-2 w-full min-w-[420px] text-body-sm">
            <thead>
              <tr className="border-b border-subtle text-micro uppercase text-tertiary">
                <th className="py-1 text-left font-medium">Area</th>
                <th className="py-1 text-right font-medium">Score</th>
                <th className="py-1 text-right font-medium">Profile similarity</th>
              </tr>
            </thead>
            <tbody>
              {lookalikes.map(({ county, similarity }) => (
                <tr key={county.fips} className="border-b border-subtle">
                  <td className="py-1 text-secondary">{county.name}, {county.state}</td>
                  <td className="num py-1 text-right text-primary">{score(county.scores[lens].total)}</td>
                  <td className="num py-1 text-right text-secondary">{similarity.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>

        <section>
          <h2 className="border-b border-default pb-1 text-h3 text-primary">Metrics and sources</h2>
          <div className="overflow-x-auto">
          <table className="mt-2 w-full min-w-[560px] text-body-sm">
            <thead>
              <tr className="border-b border-subtle text-micro uppercase text-tertiary">
                <th className="py-1 text-left font-medium">Metric</th>
                <th className="py-1 text-right font-medium">Value</th>
                <th className="py-1 text-left font-medium">Source</th>
                <th className="py-1 text-left font-medium">Vintage</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => {
                const v = c.metrics?.[m.id];
                return (
                  <tr key={m.id} className="border-b border-subtle">
                    <td className="py-1 pr-2 text-secondary">
                      {m.label}
                      {m.flags.some((f) => c.metrics?.[f]) ? " (estimate)" : ""}
                    </td>
                    <td className="num py-1 text-right text-primary">
                      {metricValue(m.unit, typeof v === "number" ? v : null, { compact: true })}
                    </td>
                    <td className="py-1 pl-2 text-caption uppercase text-tertiary">{m.source}</td>
                    <td className="py-1 text-caption text-tertiary">{m.vintage}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </section>

        <footer className="border-t border-default pt-3 text-caption text-tertiary">
          <p>
            Scores are within-US percentiles built from public, area-level data.
            They are decision support, not underwriting or a compliance
            determination. Race, ethnicity, national origin, religion and
            disability are never used (R7).
          </p>
          <p className="mt-1">
            Build {meta?.built_at ? new Date(meta.built_at).toLocaleDateString("en-US") : "—"} ·
            config {meta?.config_hash ?? CATALOG_CONFIG_HASH} · {meta?.counties ?? 0} counties
          </p>
        </footer>
      </div>

      <div className="no-print mx-auto mt-6 flex max-w-[820px] flex-wrap gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-10 rounded-control bg-accent px-4 py-1.5 text-body-sm text-onaccent"
        >
          Print
        </button>
        <Link to={`/area/${c.fips}`} className="min-h-10 rounded-control border border-default px-4 py-1.5 text-body-sm text-secondary">
          Back to area
        </Link>
      </div>
    </div>
  );
}
