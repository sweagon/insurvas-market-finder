# ADR-002: Live FastAPI backend + static SPA, with a bundled fallback

- Status: Accepted
- Date: 2026-10-20
- Owners: Insurvas data team

## Context

The brief's reference architecture is "a Python data pipeline that precomputes
everything, plus a static React app. No backend." The stakeholder, however,
explicitly asked for **dynamic with proper data sources**, choosing a live
backend API over a static snapshot.

The data refresh is genuinely heavy: 104 Census population files, a dozen ACS
tables, a 20 MB IRS file, CBP, PLACES and a 21 MB BEA archive. Fetching and
rebuilding all of that inside a web request would be slow and fragile.

## Decision

Ship **one deployable container** containing:

1. **FastAPI** serving:
   - `/api/*` read endpoints backed by **DuckDB**,
   - the built React SPA from `web/dist`,
   - a protected `POST /api/admin/refresh` and a scheduled/monthly refresh job.
2. **A refresh controller** that runs the heavy pipeline as a subprocess, writes
   to a temp DuckDB file and atomically swaps it in, exposing progress at
   `/api/refresh/status`.
3. **A bundled static snapshot** in `web/public/data/` that is also committed.
   If the API is unreachable, the SPA detects it and runs fully offline from the
   snapshot, showing a "snapshot mode" banner with the data vintage.

Scoring itself stays in a shared, pure implementation: a Python reference and a
TypeScript port (golden-file parity test at 1e-9). The API scores on request
for custom weights; the browser worker scores instantly for slider interactions.

## Consequences

- "Dynamic" means *data freshness* (scheduled rebuild + on-demand refresh),
  not a per-request re-crawl. This keeps p95 API latency in single-digit
  milliseconds and keeps the demo resilient.
- One container is trivial to run (`make demo`, `docker compose up`) and to
  deploy (Render/Fly); there is no CORS surface and no second deploy target.
- A live backend is one more thing that can fail. The bundled snapshot and the
  offline banner are the mitigation, and they are exercised by a test.
- DuckDB is embedded, so refresh atomicity is a file rename plus a lock, with no
  external database to operate.
