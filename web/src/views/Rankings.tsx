import { useMemo } from "react";
import { useStore } from "../state/store";
import { PageHeader } from "../design-system/patterns/PageHeader";
import { SegmentedControl } from "../design-system/primitives/tabs";
import { Combobox } from "../design-system/primitives/Combobox";
import { Slider } from "../design-system/primitives/Slider";
import { KpiCell, KpiStrip } from "../design-system/patterns/kpi";
import { ScoreChip, RankBadge, Monogram } from "../design-system/primitives/badges";
import { Input } from "../design-system/primitives/inputs";
import { VirtualList } from "../design-system/primitives/VirtualList";
import { popCompact, scoreRange, score, stateAbbr } from "../state/format";
import { LENS_COLOR } from "../state/lensMeta";
import { useState } from "react";

export default function Rankings() {
  const { counties, lens, selectedFips, select, toggleCompare, compare, filters, setFilter, clearFilters } = useStore();
  const [view, setView] = useState<"table" | "cards">("table");

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
          <div className="mt-4 overflow-hidden rounded-card border border-subtle bg-surface1">
            <div className="grid grid-cols-[56px_minmax(180px,1fr)_110px_100px_130px_90px] items-center gap-3 border-b border-subtle bg-surface2 px-3 py-2 text-micro uppercase text-tertiary">
              <span>Rank</span><span>Area</span><span className="text-right">Score</span><span className="text-right">60+ pop</span><span>Rank range</span><span className="text-right">Compare</span>
            </div>
            <VirtualList
              items={list}
              itemHeight={56}
              height={520}
              aria-label="County rankings"
              renderItem={(c) => {
                const s = c.scores[lens];
                const active = selectedFips === c.fips;
                const picked = compare.includes(c.fips);
                return (
                  <div
                    key={c.fips}
                    role="row"
                    tabIndex={0}
                    onClick={() => select(c.fips)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(c.fips); } }}
                    className={`grid h-14 cursor-pointer grid-cols-[56px_minmax(180px,1fr)_110px_100px_130px_90px] items-center gap-3 border-b border-subtle px-3 text-body-sm transition-colors ${active ? "bg-surface2" : "hover:bg-surface2"}`}
                  >
                    <span><RankBadge rank={s.rank} /></span>
                    <span className="flex min-w-0 items-center gap-2">
                      <Monogram abbr={stateAbbr(c.state)} size={24} color={LENS_COLOR[lens]} />
                      <span className="min-w-0">
                        <span className="block truncate text-primary">{c.name}</span>
                        <span className="block truncate text-caption text-tertiary">{c.state}</span>
                      </span>
                    </span>
                    <span className="justify-self-end"><ScoreChip value={s.total} /></span>
                    <span className="num justify-self-end text-secondary">{popCompact(c.pop60)}</span>
                    <span className="num text-caption text-tertiary">{scoreRange(s.p05, s.p95)}</span>
                    <span className="justify-self-end">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleCompare(c.fips); }}
                        className={`rounded-chip border px-2 py-1 text-caption transition-colors ${picked ? "border-accentborder bg-accentsubtle text-accenttext" : "border-subtle text-secondary hover:text-primary"}`}
                      >
                        {picked ? "Added" : "Add"}
                      </button>
                    </span>
                  </div>
                );
              }}
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
