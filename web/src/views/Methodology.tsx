import { PageHeader } from "../design-system/patterns/PageHeader";
import { Card } from "../design-system/primitives/Card";
import { useStore } from "../state/store";
import { downloadCsv, rankingsToCsv } from "../state/export";
import { SUBSCORE_ORDER, SUBSCORE_LABEL } from "../state/lensMeta";
import { LENS_ORDER } from "../state/lensMeta";
import type { LensId, LensInfo, MetricMeta, SubScoreId, SubScoreMeta } from "../data/types";

const NO_SUBSCORES: Partial<Record<SubScoreId, SubScoreMeta>> = {};
const NO_LENSES: Partial<Record<LensId, LensInfo>> = {};

export default function Methodology() {
  const { catalog, counties } = useStore();
  const meta = catalog?.meta;
  const params = catalog?.params;
  const subscores: Partial<Record<SubScoreId, SubScoreMeta>> =
    catalog?.subscores ?? NO_SUBSCORES;
  const lenses: Partial<Record<LensId, LensInfo>> = catalog?.lenses ?? NO_LENSES;
  const vintages = catalog?.vintages ?? meta?.vintages ?? {};
  const sources = Object.values(catalog?.sources ?? {});
  const r7 = catalog?.rule_R7 ?? "";
  const metrics: MetricMeta[] = catalog?.metrics ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Methodology"
        description="How the ranking is built, what is measured, and the guardrails that keep protected attributes out of the model."
        meta={
          meta?.built_at
            ? `Build ${new Date(meta.built_at).toLocaleDateString("en-US", { dateStyle: "medium" })} · config v${meta.config_version} (${meta.config_hash?.slice(0, 8)}) · ${meta.counties?.toLocaleString()} counties · ${meta.eligible?.toLocaleString()} eligible`
            : undefined
        }
      />
      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[190px_minmax(0,1fr)]">
          <nav aria-label="On this page" className="hidden self-start lg:block">
            <div className="sticky top-0 space-y-1 text-body-sm">
              <p className="mb-2 text-micro uppercase text-tertiary">On this page</p>
              {[
                ["overview", "Overview"],
                ["eligibility", "Eligibility"],
                ["subscores", "Sub-scores"],
                ["lineage", "Lineage"],
                ["metrics", "Metrics"],
                ["weights", "Lens weights"],
                ["sources", "Sources"],
                ["r7", "R7 guardrails"],
                ["downloads", "Download"],
                ["limitations", "Limitations"],
              ].map(([id, label]) => (
                <a key={id} href={`#${id}`} className="block rounded px-2 py-1 text-secondary hover:bg-surface2 hover:text-primary">
                  {label}
                </a>
              ))}
            </div>
          </nav>

          <div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div id="overview">
          <Card title="What this tool answers">
            <p className="text-body-sm text-secondary">
              Where should a life-insurance team focus for residents aged 60 and over? Each county gets a 0–100
              opportunity score for each strategy lens, built only from public, area-level data. Scores are
              within-US percentiles, not dollar forecasts.
            </p>
            <p className="mt-2 text-body-sm text-secondary">
              The map defaults to Volume (largest 60+ pools). Switch lens in the top bar to reprioritise need,
              affordability, reachability, competition, or health context.
            </p>
          </Card>
          </div>

          <div id="eligibility">
          <Card title="Eligibility and uncertainty">
            <ul className="list-disc space-y-1.5 pl-5 text-body-sm text-secondary">
              <li>A county is ranked only if it has at least <span className="num text-primary">{params?.eligibility_min_60plus?.toLocaleString() ?? "2,000"}</span> residents aged 60+.</li>
              <li>Each lens is scored {meta?.mc_draws ?? 500} times with metric noise; the drawer shows a rank range from the 5th to 95th percentile.</li>
              <li>Small-county rates are shrunk toward their state mean with empirical Bayes before scoring.</li>
              <li>Winsorisation trims the 1st and 99th percentiles; log transforms apply where a metric is skewed.</li>
            </ul>
          </Card>
          </div>

          <div id="lineage" className="lg:col-span-2">
          <Card title="How a county becomes a score">
            <ol className="flex flex-wrap items-center gap-2 text-caption text-secondary">
              {["Public tables", "Field lineage + vintage", "Metric values", "Winsorise / transform", "Percentile sub-scores", "Weighted lens score", "Monte Carlo range"].map((step, i) => (
                <li key={step} className="flex items-center gap-2">
                  <span className="rounded-control border border-subtle bg-surface2 px-2 py-1">{step}</span>
                  {i < 6 && <span aria-hidden className="text-tertiary">→</span>}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-body-sm text-secondary">
              The pipeline records each source table, column and vintage before a metric can enter the scored matrix.
              Sub-scores are within-US percentiles, so a 70 means the county sits above 70% of eligible counties on that
              dimension. The lens score is the weighted average of available sub-scores; missing sub-scores renormalise
              the remaining weights rather than imputing a rank.
            </p>
          </Card>
          </div>

          <div id="subscores">
          <Card title="Sub-scores">
            <dl className="space-y-2">
              {SUBSCORE_ORDER.map((s) => (
                <div key={s} className="grid grid-cols-[140px_1fr] gap-2 text-body-sm">
                  <dt className="text-secondary">{subscores[s]?.label ?? SUBSCORE_LABEL[s]}</dt>
                  <dd className="text-tertiary">{subscores[s]?.description ?? ""}</dd>
                </div>
              ))}
            </dl>
          </Card>
          </div>

          <div id="metrics" className="lg:col-span-2">
          <Card title="Metric definitions" info="Every served metric, its source, vintage and role in the model." className="lg:col-span-2">
            <div className="space-y-4">
              {SUBSCORE_ORDER.map((ss) => {
                const rows = metrics.filter((m) => m.subscore === ss);
                if (rows.length === 0) return null;
                return (
                  <section key={ss}>
                    <h3 className="mb-2 text-micro uppercase text-tertiary">{SUBSCORE_LABEL[ss]}</h3>
                    <dl className="grid gap-2 md:grid-cols-2">
                      {rows.map((m) => (
                        <div key={m.id} className="rounded-control border border-subtle p-3">
                          <dt className="flex flex-wrap items-baseline justify-between gap-2 text-body-sm text-primary">
                            <span>{m.label}</span>
                            <span className="text-micro uppercase text-tertiary">{m.scored ? "scored" : "context"}</span>
                          </dt>
                          <dd className="mt-1 text-caption text-tertiary">{m.description}</dd>
                          <dd className="mt-1.5 text-micro uppercase text-tertiary">
                            {m.source.toUpperCase()} · {m.vintage} · {m.unit}
                            {m.modeled ? " · modeled" : ""}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                );
              })}
            </div>
          </Card>
          </div>

          <div id="r7">
          <Card title="R7 guardrails">
            <p className="text-body-sm text-secondary">
              Race, ethnicity, national origin, religion and disability are never used in scoring or filtering.
              English proficiency is context only. CDC PLACES chronic-condition and risk-behaviour composites
              describe area health context; they are not individual underwriting eligibility.
            </p>
            {r7 && (
              <p className="mt-2 whitespace-pre-line text-caption text-tertiary">{r7.trim()}</p>
            )}
            <ul className="mt-2 list-disc space-y-1 pl-5 text-body-sm text-tertiary">
              <li>Build-time QA fails if a protected column appears in the scored matrix or UI payload.</li>
              <li>Scores are decision support, not a compliance or fair-lending determination.</li>
              <li>Rule R7 is enforced by the pipeline QA gate, which fails the build if a protected column reaches the scored matrix.</li>
            </ul>
          </Card>
          </div>

          <div id="weights" className="lg:col-span-2">
          <Card title="Strategy lens weights">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-body-sm">
                <thead>
                  <tr className="border-b border-subtle text-micro uppercase text-tertiary">
                    <th className="py-2 text-left font-medium">Lens</th>
                    {SUBSCORE_ORDER.map((s) => <th key={s} className="py-2 text-right font-medium">{SUBSCORE_LABEL[s]}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {LENS_ORDER.map((l) => (
                    <tr key={l}>
                      <td className="py-2 text-primary">{lenses[l]?.label ?? l}</td>
                      {SUBSCORE_ORDER.map((s) => (
                        <td key={s} className="num py-2 text-right text-secondary">{lenses[l]?.weights?.[s] ?? "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          </div>

          <div id="sources" className="lg:col-span-2">
          <Card title="Sources, licences and attribution">
            <div className="grid gap-3 md:grid-cols-2">
              {sources.map((source) => (
                <div key={source.name} className="rounded-control border border-subtle p-3">
                  <a href={source.url} target="_blank" rel="noreferrer" className="text-body-sm text-primary underline decoration-border-strong underline-offset-2 hover:text-accenttext">
                    {source.name}
                  </a>
                  <p className="mt-1 text-caption text-secondary">{source.attribution}</p>
                  <p className="mt-1 text-caption text-tertiary">{source.license}</p>
                  {source.caveats && <p className="mt-1 text-caption text-tertiary">{source.caveats}</p>}
                </div>
              ))}
            </div>
            <h3 className="mt-4 text-micro uppercase text-tertiary">Vintages</h3>
            <dl className="mt-2 grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 text-body-sm">
              {Object.entries(vintages).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="uppercase text-tertiary">{k}</dt>
                  <dd className="num text-primary">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </Card>
          </div>

          <div id="downloads">
          <Card title="Download and reproduce">
            <p className="text-body-sm text-secondary">
              Download the scored table or the exact model config used for this build. The config hash in the page
              header identifies the input file.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-control border border-default px-3 py-1.5 text-body-sm text-secondary hover:text-primary"
                onClick={() => catalog && downloadCsv(`insurvas-rankings-${catalog.default_lens}.csv`, rankingsToCsv(counties, catalog, catalog.default_lens))}
              >
                Rankings CSV
              </button>
              <a href="/data/metrics.yaml" download className="rounded-control border border-default px-3 py-1.5 text-body-sm text-secondary hover:text-primary">metrics.yaml</a>
              <a href="/data/meta.json" download className="rounded-control border border-default px-3 py-1.5 text-body-sm text-secondary hover:text-primary">meta.json</a>
            </div>
            <p className="mt-3 text-caption text-tertiary">
              Rebuild with <code className="font-mono">make build</code>. QA gates fail the build on protected fields,
              non-finite scores, contribution drift or stale artefacts.
            </p>
          </Card>
          </div>

          <div id="limitations">
          <Card title="Limitations">
            <ul className="list-disc space-y-1.5 pl-5 text-body-sm text-secondary">
              <li>County boundaries and ACS estimates lag real-world change; the build stamps every vintage.</li>
              <li>Insurance agency density is a proxy for competition, not a measure of carrier appetite.</li>
              <li>Connecticut uses its 9 planning regions, not the legacy 8 counties.</li>
              <li>Rank ranges overlap by design; a #12 county can be statistically tied with #20.</li>
              <li>{sources.length > 0 ? `${sources.length} source systems are registered in the build catalogue.` : "Source metadata is included in the catalogue payload."}</li>
            </ul>
          </Card>
          </div>
        </div>

        <p className="mt-4 text-caption text-tertiary">{counties.length.toLocaleString()} counties loaded in this session.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
