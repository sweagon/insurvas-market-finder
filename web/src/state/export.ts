import type { CountyRow, LensId, MetaCatalog } from "../data/types";
import { SUB_SCORE_IDS } from "../data/types";

/** Escape a single CSV field per RFC 4180. */
function csvField(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Render the current rankings as CSV.
 *
 * Every column carries a value: the score, rank, and sub-score columns are
 * populated from the active lens rather than left blank, and each row
 * records the lens it was scored under so an exported file is never
 * ambiguous.
 */
export function rankingsToCsv(
  counties: CountyRow[],
  catalog: MetaCatalog | null,
  lens: LensId,
): string {
  const metricIds = catalog?.metrics?.map((m) => m.id) ?? [];
  const header = [
    "fips",
    "county",
    "state",
    "pop_60plus",
    "lens",
    "score",
    "rank",
    "rank_p05",
    "rank_p95",
    "p_top50",
    ...SUB_SCORE_IDS.map((s) => `${s}_score`),
    ...metricIds,
  ];
  const rows = counties.map((c) => {
    const s = c.scores?.[lens];
    return [
      c.fips,
      c.name,
      c.state,
      c.pop60 ?? "",
      lens,
      s?.total ?? "",
      s?.rank ?? "",
      s?.rank_p05 ?? "",
      s?.rank_p95 ?? "",
      s?.p_top50 ?? "",
      ...SUB_SCORE_IDS.map((id) => s?.subscores?.[id] ?? ""),
      ...metricIds.map((id) => {
        const v = c.metrics?.[id];
        return v == null ? "" : v;
      }),
    ].map(csvField);
  });
  return [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
