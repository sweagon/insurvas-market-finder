/**
 * Data loading with a graceful static fallback (ADR-002).
 *
 * The SPA prefers the live API for scores (which carry Monte Carlo ranges and
 * ranks). It always reads the columnar snapshot for the metric matrix and the
 * catalogue; if the API is unreachable (static hosting, cold start, offline
 * demo) it falls back to the bundled `rankings.json` snapshot. The UI never
 * breaks; it only relabels itself "snapshot" instead of "live".
 */

import {
  SUB_SCORE_IDS,
  type ApiLensScore,
  type CountyRanking,
  type CountyRow,
  type LensId,
  type LensScore,
  type MetaCatalog,
  type RankingsPayload,
  type StateRow,
  type SubScoreId,
} from "./types";

export type Source = "live" | "snapshot";

export interface LoadedRankings {
  payload: RankingsPayload;
  source: Source;
}

export interface CountyColumnar {
  meta: Record<string, unknown>;
  length: number;
  columns: Record<string, Array<string | number | null>>;
}

const SNAPSHOT_URL = "/data/rankings.json";

/** How long to wait for the live API before falling back to the snapshot. */
const API_TIMEOUT_MS = 2500;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
  return (await res.json()) as T;
}

export async function loadRankings(): Promise<LoadedRankings> {
  try {
    const res = await fetch("/api/rankings/all", {
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    if (res.ok) {
      const payload = (await res.json()) as RankingsPayload;
      if (payload?.counties?.length) return { payload, source: "live" };
    }
  } catch {
    // fall through to snapshot
  }
  const payload = await fetchJson<RankingsPayload>(SNAPSHOT_URL);
  return { payload, source: "snapshot" };
}

function columnsToRows(data: CountyColumnar) {
  const cols = data.columns;
  const n = data.length;
  const get = (key: string, i: number) => {
    const col = cols[key];
    return col ? col[i] : null;
  };
  return Array.from({ length: n }, (_, i) => {
    const metrics: Record<string, number | string | null> = {};
    for (const key of Object.keys(cols)) metrics[key] = get(key, i) as number | string | null;
    return {
      fips: String(get("fips", i) ?? ""),
      name: String(get("name", i) ?? ""),
      state: String(get("state_name", i) ?? get("state", i) ?? ""),
      abbr: String(get("state", i) ?? ""),
      pop60: Number(get("pop_60plus", i) ?? 0),
      metrics,
    };
  });
}

function toLensScore(s: ApiLensScore | undefined): LensScore {
  const subs = (s?.sub ?? {}) as Record<string, number | undefined>;
  const subscores = Object.fromEntries(
    SUB_SCORE_IDS.map((k) => [k, (subs[k] ?? 0) * 100]),
  ) as Record<SubScoreId, number>;
  return {
    total: s?.total ?? 0,
    p05: s?.p05 ?? 0,
    p95: s?.p95 ?? 0,
    rank: s?.rank ?? null,
    eligible: s?.eligible ?? false,
    subscores,
    rank_p05: s?.rank_p05 ?? null,
    rank_p50: s?.rank_p50 ?? null,
    rank_p95: s?.rank_p95 ?? null,
    p_top50: s?.p_top50 ?? null,
    partial: s?.partial ?? false,
  };
}

export async function loadAll(): Promise<{
  source: Source;
  catalog: MetaCatalog | null;
  counties: CountyRow[];
  states: StateRow[];
}> {
  const [catalog, countyData, stateData, ranking] = await Promise.all([
    fetchJson<MetaCatalog>("/data/meta.json"),
    fetchJson<CountyColumnar>("/data/counties.json"),
    fetchJson<{ states: StateRow[] }>("/data/states.json"),
    loadRankings(),
  ]);

  const rows = columnsToRows(countyData);
  const byFips = new Map<string, CountyRanking>(
    ranking.payload.counties.map((c) => [c.fips, c]),
  );

  const lensIds = Object.keys(catalog.lenses ?? {}) as LensId[];
  const counties = rows.map((row): CountyRow => {
    const ranked = byFips.get(row.fips);
    const scores = Object.fromEntries(
      lensIds.map((lid) => [lid, toLensScore(ranked?.scores?.[lid])]),
    ) as Record<LensId, LensScore>;
    return { ...row, scores };
  });

  return {
    source: ranking.source,
    catalog,
    counties,
    states: stateData.states ?? [],
  };
}

export type { LensId };
