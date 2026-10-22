import { useMemo } from "react";
import { useStore } from "../state/store";
import { PageHeader } from "../design-system/patterns/PageHeader";
import { SegmentedControl } from "../design-system/primitives/tabs";
import { Combobox } from "../design-system/primitives/Combobox";
import { Slider } from "../design-system/primitives/Slider";
import { KpiCell, KpiStrip } from "../design-system/patterns/kpi";
import { ScoreChip, RankBadge, Monogram } from "../design-system/primitives/badges";
import { Input } from "../design-system/primitives/inputs";
import { DataTable, type DataTableColumn } from "../design-system/patterns/DataTable";
import { RankWhisker } from "../design-system/charts";
import { popCompact, score, pct, stateAbbr } from "../state/format";
import { LENS_COLOR, SUBSCORE_LABEL, SUBSCORE_ORDER } from "../state/lensMeta";
import { rankingsToCsv, downloadCsv } from "../state/export";
import type { CountyRow } from "../data/types";
import { useMemo as useColumns, useState } from "react";

export default function Rankings() {
  const { counties, lens, catalog, select, toggleCompare, compare, filters, setFilter, clearFilters } = useStore();
  const [view, setView] = useState<"table" | "cards">("table");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const list = useMemo(() => {
    let out = counties.filter((c) => c.scores?.[lens]?.eligible);
    if (filters.states.length) out = out.filter((c) => filters.states.includes(c.state));
    if (filters.minPop60) out = out.filter((c) => c.pop60 >= filters.minPop60);
    if (filters.minScore) out = out.filter((c) => (c.scores[lens].total ?? 0) >= filters.minScore);
    if (filters.query) {
      const q = filters.query.toLowerCase();
      out = out.filter((c) => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q) || c.fips.includes(q));
    }
    return out.sort((a, b) => (a.scores[lens].rank ?? 9999) - (b.scores[lens].rank ?? 9999));
  }, [counties, lens, filters]);

  const stateOptions = useMemo(() => {
    const set = new Set(counties.map((c) => c.state));
    return Array.from(set).sort().map((s) => ({ value: s, label: s }));
  }, [counties]);

  const dirty = filters.states.length > 0 || filters.minPop60 > 2000 || filters.minScore > 0 || filters.query.length > 0;

  const columns = useColumns<DataTableColumn<CountyRow>[]>(() => {
    const maxRank = Math.max(1, counties.filter((c) => c.scores[lens].eligible).length);
    const rankValue = (c: CountyRow) => c.scores[lens].rank ?? maxRank;
    const confidence = (c: CountyRow) => {
      const s = c.scores[lens];
      const width = (s.p95 ?? 0) - (s.p05 ?? 0);
      return width <= 8 ? "Tight" : width <= 16 ? "Moderate" : "Wide";
    };
    return [
      {
        id: "area",
        header: "Area",
        width: 250,
        sticky: true,
        sortValue: (c) => c.scores[lens].rank ?? 99_999,
        cell: (c) => {
          const s = c.scores[lens];
          return (
            <span className="flex min-w-0 items-center gap-2">
              <RankBadge rank={s.rank} />
              <Monogram abbr={stateAbbr(c.state)} size={24} color={LENS_COLOR[lens]} />
              <span className="min-w-0">
                <span className="block truncate text-primary">{c.name}</span>
                <span className="block truncate text-caption text-tertiary">{c.state}</span>
              </span>
            </span>
          );
        },
      },
      {
        id: "score",
        header: "Score",
        width: 92,
        align: "right",
        sortValue: (c) => c.scores[lens].total ?? -1,
        cell: (c) => <ScoreChip value={c.scores[lens].total} />,
      },
      {
        id: "rank_range",
        header: "Rank range",
        width: 150,
        sortValue: (c) => c.scores[lens].rank_p50 ?? maxRank,
        cell: (c) => {
          const s = c.scores[lens];
          return Number.isFinite(s.rank_p05) && Number.isFinite(s.rank_p95) ? (
            <RankWhisker
              p05={s.rank_p05 ?? rankValue(c)}
              p50={s.rank_p50 ?? rankValue(c)}
              p95={s.rank_p95 ?? rankValue(c)}
              min={1}
              max={maxRank}
              label={`${c.name} rank range`}
            />
          ) : (
            <span className="text-tertiary">—</span>
          );
        },
      },
      ...SUBSCORE_ORDER.map((ss) => ({
        id: ss,
        header: SUBSCORE_LABEL[ss],
        width: 108,
        align: "right" as const,
        sortValue: (c: CountyRow) => c.scores[lens].subscores?.[ss] ?? -1,
        cell: (c: CountyRow) => <span className="num text-secondary">{score(c.scores[lens].subscores?.[ss])}</span>,
      })),
      {
        id: "confidence",
        header: "Confidence",
        width: 104,
        sortValue: (c) => {
          const s = c.scores[lens];
          return (s.p95 ?? 0) - (s.p05 ?? 0);
        },
        cell: (c) => <span className="text-caption text-secondary">{confidence(c)}</span>,
      },
      {
        id: "pop60",
        header: "60+ pop",
        width: 92,
        align: "right",
        sortValue: (c) => c.pop60,
        cell: (c) => <span className="num text-secondary">{popCompact(c.pop60)}</span>,
      },
      {
        id: "growth",
        header: "60+ growth",
        width: 100,
        align: "right",
        sortValue: (c) => {
          const v = c.metrics?.growth_60plus;
          return typeof v === "number" ? v : -Infinity;
        },
        cell: (c) => {
          const v = c.metrics?.growth_60plus;
          return <span className="num text-secondary">{pct(typeof v === "number" ? v : null, { signed: true })}</span>;
        },
      },
    ];
  }, [lens, counties]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Rankings"
        actions={
          <SegmentedControl
            value={view}
            onValueChange={(v) => setView(v as "table" | "cards")}
            options={[{ value: "table", label: "Table" }, { value: "cards", label: "Cards" }]}
          />
        }
      />

      <div className="flex flex-wrap items-end gap-3 border-b border-subtle bg-surface1 px-4 py-3 md:px-6">
        <div className="w-full sm:w-64">
          <label className="mb-1 block text-micro uppercase text-tertiary" htmlFor="rank-search">Search</label>
          <Input id="rank-search" placeholder="County, state or FIPS" value={filters.query} onChange={(e) => setFilter("query", e.target.value)} />
        </div>
        <div className="w-full sm:w-48">
          <span className="mb-1 block text-micro uppercase text-tertiary">State</span>
          <Combobox options={stateOptions} value={filters.states[0] || null} onChange={(v) => setFilter("states", v ? [v] : [])} placeholder="All states" ariaLabel="Filter by state" virtual />
        </div>
        <div className="w-full sm:w-56">
          <div className="mb-1 flex items-center justify-between text-micro uppercase text-tertiary">
            <span>60+ population</span>
            <span className="num">{popCompact(filters.minPop60)}</span>
          </div>
          <Slider value={[filters.minPop60]} min={0} max={500000} step={1000} onValueChange={(v) => setFilter("minPop60", v[0])} aria-label="Minimum 60+ population" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-caption text-tertiary">{list.length.toLocaleString()} of {counties.length.toLocaleString()}</span>
          {dirty && <button type="button" onClick={clearFilters} className="text-caption text-accenttext">Clear</button>}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <KpiStrip>
          <KpiCell label="Ranked" value={list.length.toLocaleString()} />
          <KpiCell label="Eligible" value={counties.filter((c) => c.scores[lens].eligible).length.toLocaleString()} />
          <KpiCell label="Selected" value={compare.length.toLocaleString()} />
          <KpiCell label="Median score" value={score(list.reduce((s, c) => s + (c.scores[lens].total ?? 0), 0) / Math.max(1, list.length))} />
        </KpiStrip>

        {view === "table" ? (
          <div className="mt-4">
            <DataTable
              rows={list}
              columns={columns}
              getRowId={(c) => c.fips}
              caption="County rankings"
              height={560}
              initialSort={{ id: "score", desc: true }}
              selectedIds={selectedRows}
              onSelectedChange={setSelectedRows}
              compareIds={compare}
              onToggleCompare={toggleCompare}
              onActivate={(c) => select(c.fips)}
              onBulkCompare={() => {
                for (const fips of selectedRows) {
                  if (!compare.includes(fips)) toggleCompare(fips);
                }
              }}
              onBulkExport={() => {
                const chosen = list.filter((c) => selectedRows.has(c.fips));
                downloadCsv(`insurvas-selection-${lens}.csv`, rankingsToCsv(chosen, catalog, lens));
              }}
              onExport={() => downloadCsv(`insurvas-rankings-${lens}.csv`, rankingsToCsv(list, catalog, lens))}
              isDisabled={(c) => !c.scores[lens].eligible}
            />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {list.slice(0, 30).map((c) => {
              const s = c.scores[lens];
              return (
                <button key={c.fips} type="button" onClick={() => select(c.fips)} className="rounded-card border border-subtle bg-surface1 p-3 text-left transition-colors hover:bg-surface2">
                  <div className="flex items-center justify-between">
                    <RankBadge rank={s.rank} />
                    <ScoreChip value={s.total} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Monogram abbr={stateAbbr(c.state)} size={24} color={LENS_COLOR[lens]} />
                    <div>
                      <div className="text-primary">{c.name}</div>
                      <div className="text-caption text-tertiary">{c.state} • {popCompact(c.pop60)}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
