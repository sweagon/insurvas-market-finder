/**
 * Data loading with a graceful static fallback (ADR-002).
 *
 * The SPA prefers the live API. If it is unreachable (static hosting, cold
 * start, offline demo) it falls back to the bundled `rankings.json` snapshot
 * that `make build` writes into `public/data/`. The UI never breaks; it only
 * relabels itself "snapshot" instead of "live".
 */

import type { RankingsPayload } from "./types";

export type Source = "live" | "snapshot";

export interface LoadedRankings {
  payload: RankingsPayload;
  source: Source;
}

const SNAPSHOT_URL = "/data/rankings.json";

export async function loadRankings(): Promise<LoadedRankings> {
  try {
    const res = await fetch("/api/rankings/all", { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const payload = (await res.json()) as RankingsPayload;
      if (payload?.counties?.length) return { payload, source: "live" };
    }
  } catch {
    // fall through to snapshot
  }
  const res = await fetch(SNAPSHOT_URL);
  if (!res.ok) throw new Error(`Failed to load rankings snapshot (${res.status})`);
  const payload = (await res.json()) as RankingsPayload;
  return { payload, source: "snapshot" };
}
