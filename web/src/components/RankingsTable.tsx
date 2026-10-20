import { useMemo } from "react";
import type { CountyRecord, LensId } from "../data/types";

export interface RankingsTableProps {
  counties: CountyRecord[];
  lens: LensId;
  selected: CountyRecord | null;
  onSelect: (c: CountyRecord) => void;
  query: string;
  eligibleOnly: boolean;
}

export function RankingsTable({
  counties,
  lens,
  selected,
  onSelect,
  query,
  eligibleOnly,
}: RankingsTableProps) {
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return counties
      .filter((c) => (eligibleOnly ? c.scores[lens].eligible : true))
      .filter((c) =>
        q
          ? c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q) || c.fips.startsWith(q)
          : true
      )
      .sort((a, b) => b.scores[lens].total - a.scores[lens].total);
  }, [counties, lens, query, eligibleOnly]);

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-slate-900/95 text-left text-xs uppercase tracking-wide text-slate-400 backdrop-blur">
          <tr>
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">County</th>
            <th className="px-3 py-2 text-right font-medium">Score</th>
            <th className="px-3 py-2 text-right font-medium">60+</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c, i) => {
            const s = c.scores[lens];
            const isSel = selected?.fips === c.fips;
            return (
              <tr
                key={c.fips}
                onClick={() => onSelect(c)}
                className={`cursor-pointer border-b border-slate-800/60 ${
                  isSel ? "bg-slate-800/70" : "hover:bg-slate-800/40"
                }`}
              >
                <td className="px-3 py-2 tabular-nums text-slate-500">
                  {s.rank ?? i + 1}
                </td>
                <td className="px-3 py-2">
                  <span className="text-slate-100">{c.name}</span>
                  <span className="ml-2 text-slate-500">{c.state}</span>
                  {!s.eligible && (
                    <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase text-slate-400">
                      below threshold
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium text-amber-300">
                  {s.total.toFixed(1)}
                  <span className="ml-1 text-[10px] text-slate-500">
                    {s.p05.toFixed(0)}-{s.p95.toFixed(0)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                  {c.pop60.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="p-6 text-center text-sm text-slate-500">No counties match.</div>
      )}
    </div>
  );
}
