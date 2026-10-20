import { useEffect, useState } from "react";
import type { CountyRecord, LensId } from "../data/types";

const SUBSCORE_LABELS: Record<string, string> = {
  size: "Size of the senior market",
  affordability: "Ability to pay",
  need: "Need for coverage",
  reachability: "Reachability",
  whitespace: "Whitespace (inverse competition)",
  insurability: "Insurability context",
};

const LENS_WEIGHTS: Record<LensId, Record<string, number>> = {
  volume: { size: 40, affordability: 20, need: 12, reachability: 12, whitespace: 10, insurability: 6 },
  balanced: { size: 30, affordability: 25, need: 15, reachability: 15, whitespace: 10, insurability: 5 },
  final_expense: { size: 22, affordability: 18, need: 20, reachability: 12, whitespace: 13, insurability: 15 },
  legacy_wealth: { size: 22, affordability: 30, need: 10, reachability: 10, whitespace: 10, insurability: 18 },
  spouse_protection: { size: 22, affordability: 20, need: 28, reachability: 10, whitespace: 10, insurability: 10 },
};

export interface DetailDrawerProps {
  county: CountyRecord;
  lens: LensId;
  onClose: () => void;
}

interface ContributionRow {
  metric: string;
  contribution: number;
}

export function DetailDrawer({ county, lens, onClose }: DetailDrawerProps) {
  const [contributions, setContributions] = useState<ContributionRow[] | null>(null);
  const s = county.scores[lens];
  const weights = LENS_WEIGHTS[lens] ?? {};

  useEffect(() => {
    setContributions(null);
    fetch(`/api/county/${county.fips}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const forLens = (data.contributions as { lens: string; metric: string; contribution: number }[])
          .filter((c) => c.lens === lens && Math.abs(c.contribution) > 1e-6)
          .sort((a, b) => b.contribution - a.contribution);
        setContributions(forLens);
      })
      .catch(() => setContributions(null));
  }, [county.fips, lens]);

  const maxContrib = contributions?.[0]?.contribution ?? 1;

  return (
    <div className="flex h-full flex-col overflow-hidden border-l border-slate-800 bg-slate-900">
      <div className="flex items-start justify-between border-b border-slate-800 p-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100">{county.name}</h2>
          <p className="text-sm text-slate-400">
            {county.state} - FIPS {county.fips}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
          aria-label="Close"
        >
          x
        </button>
      </div>

      <div className="overflow-auto p-4">
        <div className="mb-4 grid grid-cols-2 gap-3">
          <Stat label="Opportunity score" value={s.total.toFixed(1)} accent />
          <Stat label="Rank" value={s.rank ? `#${s.rank}` : "below threshold"} />
          <Stat label="Residents 60+" value={county.pop60.toLocaleString()} />
          <Stat label="90% band" value={`${s.p05.toFixed(1)} - ${s.p95.toFixed(1)}`} />
        </div>

        <h3 className="mb-2 text-xs uppercase tracking-wide text-slate-500">Sub-scores</h3>
        <div className="mb-4 space-y-2">
          {Object.entries(s.sub).map(([key, value]) => (
            <div key={key}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-slate-300">{SUBSCORE_LABELS[key] ?? key}</span>
                <span className="tabular-nums text-slate-400">
                  {value.toFixed(2)}
                  <span className="ml-2 text-slate-600">w {weights[key]}%</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded bg-slate-800">
                <div
                  className="h-full rounded bg-amber-400/80"
                  style={{ width: `${Math.max(2, value * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <h3 className="mb-2 text-xs uppercase tracking-wide text-slate-500">
          What moves this score
        </h3>
        {contributions === null ? (
          <p className="text-xs text-slate-500">
            Point contributions require the live API (unavailable in snapshot mode).
          </p>
        ) : (
          <div className="space-y-1.5">
            {contributions.map((c) => (
              <div key={c.metric} className="flex items-center gap-2 text-xs">
                <span className="w-40 shrink-0 truncate text-slate-400" title={c.metric}>
                  {c.metric}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded bg-slate-800">
                  <div
                    className="h-full rounded bg-sky-400/70"
                    style={{ width: `${Math.max(2, (c.contribution / maxContrib) * 100)}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right tabular-nums text-slate-500">
                  {c.contribution.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-[11px] leading-relaxed text-slate-600">
          Scores are percentile ranks over the eligible universe. Contributions sum exactly
          to the total, so the bars above add up to the opportunity score.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${accent ? "text-amber-300" : "text-slate-100"}`}>
        {value}
      </div>
    </div>
  );
}
