import type { County, MetaCatalog } from "../data/types";
import { SUBSCORE_ORDER } from "./lensMeta";

/** Build a CSV of the current ranking rows, with the metric columns. */
export function rankingsToCsv(
  counties: County[],
  catalog: MetaCatalog | null,
  _lens: string,
): string {
  const header = [
    "fips",
    "county",
    "state",
    "pop_60plus",
    "score",
    "rank",
    ...SUBSCORE_ORDER.map((s) => `${s}_score`),
    ...(catalog?.metrics.map((m) => m.id) ?? []),
  ];
  const metricIds = catalog?.metrics.map((m) => m.id) ?? [];
  const rows = counties.map((c) => [
    c.fips,
    `"${c.name.replace(/"/g, '""')}"`,
    c.state,
    String(c.pop60 ?? ""),
    "",
    "",
    ...SUBSCORE_ORDER.map(() => ""),
    ...metricIds.map((id: string) => (c.metrics[id] == null ? "" : String(c.metrics[id]))),
  ]);
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
