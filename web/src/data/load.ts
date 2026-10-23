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

/** A value in the columnar metric matrix. */
export type MetricValue = string | number | boolean | null;

export interface LoadedRankings {
  payload: RankingsPayload;
  source: Source;
}

export interface CountyColumnar {
  meta: Record<string, unknown>;
  length: number;
  columns: Record<string, Array<string | number | boolean | null>>;
}

export interface MapLensPayload {
  lens: LensId;
  length: number;
  columns: Record<string, Array<string | number | boolean | null>>;
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
    const metrics: Record<string, MetricValue> = {};
    for (const key of Object.keys(cols)) metrics[key] = get(key, i) as MetricValue;
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
  const subs = (s?.sub ?? {}) as Record<string, number | null | undefined>;
  const subscores = Object.fromEntries(
    SUB_SCORE_IDS.map((k) => [
      k,
      subs[k] === undefined || subs[k] === null ? null : subs[k] * 100,
    ]),
  ) as Record<SubScoreId, number | null>;
  return {
    total: s?.total ?? null,
    p05: s?.p05 ?? null,
    p95: s?.p95 ?? null,
    rank: s?.rank ?? null,
    eligible: s?.eligible ?? false,
    subscores,
    rank_p05: s?.rank_p05 ?? null,
    rank_p50: s?.rank_p50 ?? null,
    rank_p95: s?.rank_p95 ?? null,
    p_top50: s?.p_top50 ?? null,
    partial: s?.partial ?? false,
    coverage: s?.coverage ?? null,
  };
}

export interface CorePayload {
  catalog: MetaCatalog;
  counties: CountyRow[];
  states: StateRow[];
}

export async function loadCore(): Promise<CorePayload> {
  const [catalog, countyData, stateData] = await Promise.all([
    fetchJson<MetaCatalog>("/data/meta.json"),
    fetchJson<CountyColumnar>("/data/counties.json"),
    fetchJson<{ states: StateRow[] }>("/data/states.json"),
  ]);
  const rows = columnsToRows(countyData);
  const lensIds = Object.keys(catalog.lenses ?? {}) as LensId[];
  const counties = rows.map((row): CountyRow => ({
    ...row,
    scores: Object.fromEntries(
      lensIds.map((lid) => [lid, emptyLensScore()]),
    ) as Record<LensId, LensScore>,
  }));
  return { catalog, counties, states: stateData.states ?? [] };
}

function emptyLensScore(): LensScore {
  return {
    total: null,
    p05: null,
    p95: null,
    rank: null,
    eligible: false,
    subscores: Object.fromEntries(SUB_SCORE_IDS.map((id) => [id, null])) as Record<SubScoreId, number | null>,
    rank_p05: null,
    rank_p50: null,
    rank_p95: null,
    p_top50: null,
    partial: false,
    coverage: null,
  };
}

/** Compact per-lens map matrix for Explore. */
export async function loadMapLens(lens: LensId): Promise<Map<string, LensScore>> {
  const data = await fetchJson<MapLensPayload>(`/data/map/${encodeURIComponent(lens)}.json`);
  const c = data.columns;
  const get = (key: string, i: number) => {
    const col = c[key];
    return col ? col[i] : null;
  };
  const out = new Map<string, LensScore>();
  for (let i = 0; i < data.length; i += 1) {
    const fips = String(get("fips", i) ?? "");
    if (!fips) continue;
    const sub = Object.fromEntries(
      SUB_SCORE_IDS.map((id) => {
        const value = get(`sub_${id}`, i);
        return [id, typeof value === "number" ? value : null];
      }),
    ) as Record<string, number | null>;
    out.set(
      fips,
      toLensScore({
        total: numberOrNull(get("total", i)),
        p05: numberOrNull(get("p05", i)),
        p95: numberOrNull(get("p95", i)),
        rank: numberOrNull(get("rank", i)),
        eligible: get("eligible", i) === true,
        coverage: numberOrNull(get("coverage", i)),
        partial: get("partial", i) === true,
        rank_p05: numberOrNull(get("rank_p05", i)),
        rank_p50: numberOrNull(get("rank_p50", i)),
        rank_p95: numberOrNull(get("rank_p95", i)),
        p_top50: numberOrNull(get("p_top50", i)),
        sub,
      }),
    );
  }
  return out;
}

function numberOrNull(value: string | number | boolean | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Full multi-lens scores, used by the analyst screens. */
export function scoresFromRankings(
  payload: RankingsPayload,
  lensIds: LensId[],
): Map<string, Record<LensId, LensScore>> {
  const byFips = new Map<string, CountyRanking>(
    payload.counties.map((c) => [c.fips, c]),
  );
  return new Map(
    payload.counties.map((c) => [
      c.fips,
      Object.fromEntries(
        lensIds.map((lid) => [lid, toLensScore(byFips.get(c.fips)?.scores?.[lid])]),
      ) as Record<LensId, LensScore>,
    ]),
  );
}

export async function loadAll(): Promise<{
  source: Source;
  catalog: MetaCatalog;
  counties: CountyRow[];
  states: StateRow[];
}> {
  const [core, ranking] = await Promise.all([loadCore(), loadRankings()]);
  const lensIds = Object.keys(core.catalog.lenses ?? {}) as LensId[];
  const scores = scoresFromRankings(ranking.payload, lensIds);
  return {
    source: ranking.source,
    catalog: core.catalog,
    counties: core.counties.map((row) => ({
      ...row,
      scores: scores.get(row.fips) ?? row.scores,
    })),
    states: core.states,
  };
}

export type { LensId };
