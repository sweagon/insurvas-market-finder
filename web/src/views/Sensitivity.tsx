import { useMemo, useState } from "react";
import { useStore, weightsFor } from "../state/store";
import { PageHeader } from "../design-system/patterns/PageHeader";
import { Card } from "../design-system/primitives/Card";
import { Slider } from "../design-system/primitives/Slider";
import { Button } from "../design-system/primitives/Button";
import { SUBSCORE_ORDER, SUBSCORE_LABEL, SUBSCORE_COLOR } from "../state/lensMeta";
import { CONFIG, scoreMatrix } from "../score/score";
import { stateAbbr } from "../state/format";
import type { SubScoreId } from "../data/types";
import type { SubScoreWeights } from "../state/store";

interface ScoredRow {
  fips: string;
  name: string;
  state: string;
  eligible: boolean;
  total: number;
  baseRank: number | null;
  newRank: number;
  delta: number;
}

export default function Sensitivity() {
  const { weights, setWeights, catalog, lens, counties, select } = useStore();
  const [local, setLocal] = useState<SubScoreWeights>(() => ({ ...weights }));
  const sum = useMemo(
    () => SUBSCORE_ORDER.reduce((s, k) => s + (local[k] || 0), 0),
    [local],
  );
  const base = useMemo(
    () => weightsFor(catalog, lens),
    [catalog, lens],
  );

  // Re-sync the sliders when the active lens changes, otherwise the panel
  // keeps showing the previous lens's weights under the new lens's heading.
  // Adjusting state during render avoids a commit with stale weights.
  const [syncedLens, setSyncedLens] = useState(lens);
  if (syncedLens !== lens) {
    setSyncedLens(lens);
    setLocal({ ...base });
  }

  const columns = useMemo(() => {
    const out: Record<string, Float64Array> = {};
    for (const m of CONFIG.metrics) {
      if (!m.scored) continue;
      out[m.id] = Float64Array.from(
        counties.map((c) => {
          const v = c.metrics?.[m.id];
          return typeof v === "number" ? v : Number.NaN;
        }),
      );
    }
    return out;
  }, [counties]);

  const result = useMemo(() => {
    if (!counties.length) return null;
    const cfg = {
      ...CONFIG,
      lenses: {
        ...CONFIG.lenses,
        [lens]: {
          ...CONFIG.lenses[lens],
          weights: local as unknown as Record<string, number>,
        },
      },
    };
    const scored = scoreMatrix({
      fips: counties.map((c) => c.fips),
      columns,
      config: cfg,
      lensId: lens,
      eligibilityPop: Float64Array.from(counties.map((c) => c.pop60)),
    });
    const rows = counties
      .map((c, i) => ({
        fips: c.fips,
        name: c.name,
        state: c.state,
        eligible: scored.eligibility[i],
        total: scored.total[i],
        baseRank: c.scores[lens].rank,
      }))
      .filter((r) => r.eligible);

    const sorted = [...rows].sort((a, b) => b.total - a.total);
    const newRankByFips = new Map(
      sorted.map((r, i) => [r.fips, i + 1] as const),
    );
    const movers: ScoredRow[] = rows
      .map((r) => {
        const newRank = newRankByFips.get(r.fips) ?? 0;
        return { ...r, newRank, delta: (r.baseRank ?? 9999) - newRank };
      })
      .filter((r) => r.baseRank != null)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 10);

    const baseTop = rows
      .filter((r) => r.baseRank != null && r.baseRank <= 50)
      .map((r) => r.fips);
    const newTop = new Set(sorted.slice(0, 50).map((r) => r.fips));
    const overlap = baseTop.filter((f) => newTop.has(f)).length;
    return { movers, overlap, n: rows.length };
  }, [counties, columns, lens, local]);

  const apply = (k: SubScoreId, v: number) =>
    setLocal((prev) => ({ ...prev, [k]: v }));
  const reset = () => setLocal({ ...base });

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Sensitivity Lab"
        description="Rebalance the six sub-scores and watch the ranking move. The reference scorer recomputes every eligible county in your browser."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={reset}>
              Reset to lens
            </Button>
            <Button size="sm" onClick={() => setWeights(local)}>
              Apply to session
            </Button>
          </div>
        }
      />
      <div className="grid flex-1 grid-cols-1 gap-4 overflow-auto p-4 lg:grid-cols-[380px_minmax(0,1fr)] md:p-6">
        <Card title="Weight mixer">
          <div className="mb-1 flex items-center justify-between text-caption">
            <span className="text-tertiary">Total weight</span>
            <span
              className={`num ${Math.round(sum) === 100 ? "text-positive" : "text-warning"}`}
            >
              {Math.round(sum)}%
            </span>
          </div>
          <p className="mb-4 text-caption text-tertiary">
            Weights are normalised to 100% when scoring.
          </p>
          <div className="space-y-4">
            {SUBSCORE_ORDER.map((k) => {
              const key = k as SubScoreId;
              return (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-body-sm">
                    <span style={{ color: SUBSCORE_COLOR[key] }}>
                      {SUBSCORE_LABEL[key]}
                    </span>
                    <span className="num text-secondary">{local[key]}</span>
                  </div>
                  <Slider
                    value={[local[key]]}
                    max={60}
                    step={1}
                    onValueChange={(v) => apply(key, v[0])}
                    aria-label={`${SUBSCORE_LABEL[key]} weight`}
                  />
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card bodyClassName="p-4">
              <p className="text-micro uppercase text-tertiary">
                Eligible re-scored
              </p>
              <p className="mt-1 num text-num-lg">
                {result?.n?.toLocaleString() ?? "—"}
              </p>
            </Card>
            <Card bodyClassName="p-4">
              <p className="text-micro uppercase text-tertiary">
                Top-50 overlap
              </p>
              <p className="mt-1 num text-num-lg">
                {result ? `${Math.round((result.overlap / 50) * 100)}%` : "—"}
              </p>
            </Card>
            <Card bodyClassName="p-4">
              <p className="text-micro uppercase text-tertiary">Weight total</p>
              <p
                className={`mt-1 num text-num-lg ${Math.round(sum) === 100 ? "text-positive" : "text-warning"}`}
              >
                {Math.round(sum)}%
              </p>
            </Card>
          </div>
          <Card
            title="Largest rank moves"
            info="Relative to the published lens ranking. Positive means the county rises under your weights."
          >
            <div className="divide-y divide-subtle">
              {result?.movers.map((m) => (
                <button
                  key={m.fips}
                  type="button"
                  onClick={() => select(m.fips)}
                  className="flex w-full items-center gap-3 py-2 text-left"
                >
                  <span className="w-12 text-caption text-tertiary">
                    {stateAbbr(m.state)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-body-sm text-primary">
                    {m.name}
                  </span>
                  <span className="num text-caption text-tertiary">
                    #{m.baseRank} → #{m.newRank}
                  </span>
                  <span
                    className={`num w-12 text-right text-body-sm ${m.delta > 0 ? "text-positive" : m.delta < 0 ? "text-negative" : "text-tertiary"}`}
                  >
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
