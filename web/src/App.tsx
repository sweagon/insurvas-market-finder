import { useEffect, useMemo } from "react";
import { loadRankings } from "./data/load";
import { useStore } from "./store";
import { CountyMap } from "./components/CountyMap";
import { RankingsTable } from "./components/RankingsTable";
import { DetailDrawer } from "./components/DetailDrawer";
import type { LensId } from "./data/types";

export default function App() {
  const { payload, source, lens, selected, query, setPayload, setLens, select, setQuery } = useStore();

  useEffect(() => {
    loadRankings()
      .then(({ payload, source }) => setPayload(payload, source))
      .catch((err) => console.error(err));
  }, [setPayload]);

  const lenses = payload?.lenses;
  const counties = payload?.counties ?? [];

  const meta = payload?.meta;
  const eligibleCount = useMemo(
    () => counties.filter((c) => c.scores[lens].eligible).length,
    [counties, lens]
  );

  if (!payload) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Loading market data...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-slate-800 bg-slate-900/60 px-5 py-3">
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-slate-100">
            Insurvas Market Finder
          </h1>
          <p className="text-xs text-slate-500">
            Where to sell life insurance to people 60+ - {eligibleCount.toLocaleString()} eligible
            counties
          </p>
        </div>

        <nav className="flex flex-wrap gap-1">
          {lenses &&
            (Object.keys(lenses) as LensId[]).map((id) => (
              <button
                key={id}
                onClick={() => setLens(id)}
                title={lenses[id].description}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  lens === id
                    ? "bg-amber-400 text-slate-900"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {lenses[id].label}
              </button>
            ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search county, state or FIPS"
            className="w-56 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
          />
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
              source === "live"
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-slate-700/40 text-slate-400"
            }`}
            title={meta ? `Built ${meta.built_at}` : undefined}
          >
            {source}
          </span>
        </div>
      </header>

      <main className="flex min-h-0 flex-1">
        <section className="min-w-0 flex-1 border-r border-slate-800 bg-slate-950">
          <CountyMap
            counties={counties}
            lens={lens}
            selected={selected}
            onSelect={select}
            eligibleOnly={false}
          />
        </section>
        <section className="min-w-0 flex-1">
          <RankingsTable
            counties={counties}
            lens={lens}
            selected={selected}
            onSelect={select}
            query={query}
            eligibleOnly
          />
        </section>
        {selected && (
          <aside className="w-96 shrink-0">
            <DetailDrawer county={selected} lens={lens} onClose={() => select(null)} />
          </aside>
        )}
      </main>

      <footer className="flex items-center justify-between border-t border-slate-800 bg-slate-900/60 px-5 py-2 text-[11px] text-slate-500">
        <span>
          Public data only. Ranked over {meta?.eligible.toLocaleString()} counties with 2,000+
          residents aged 60+. Vintages: {meta ? Object.entries(meta.vintages).map(([k, v]) => `${k} ${v}`).join(", ") : ""}
        </span>
        <span>Rule R7: no protected attributes used in scoring or filtering.</span>
      </footer>
    </div>
  );
}
