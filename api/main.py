"""Insurvas Market Finder API.

Serves the pre-built DuckDB dataset (``data/market.duckdb``) and, in production,
the built React SPA from ``web/dist`` as a single container with no CORS.

Design notes
------------
* The API is **read-only except one endpoint**. ``POST /api/admin/refresh``
  rebuilds the dataset and is protected by a bearer token
  (``INSURVAS_ADMIN_TOKEN``). It is the only write path (rule R4).
* Freshness: the dataset is provided by sources with annual vintages, so a
  monthly rebuild is more than enough. ``/api/health`` reports staleness against
  a 32-day budget and the scheduler warns on startup; "live" refers to data
  freshness, never to per-request re-crawling.
"""

from __future__ import annotations

import json
import os
import threading
from datetime import UTC, datetime
from pathlib import Path

import duckdb
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from pipeline import paths
from pipeline.config import load_config

STALE_AFTER_DAYS = 32

app = FastAPI(
    title="Insurvas Market Finder",
    version="0.1.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

_build_lock = threading.Lock()


def _connect() -> duckdb.DuckDBPyConnection:
    if not paths.DB.exists():
        raise HTTPException(status_code=503, detail="Dataset not built. Run `make build`.")
    return duckdb.connect(str(paths.DB), read_only=True)


def _meta(key: str) -> str | None:
    con = _connect()
    try:
        row = con.execute("SELECT value FROM build_meta WHERE key = ?", [key]).fetchone()
        return row[0] if row else None
    finally:
        con.close()


def _all_meta() -> dict[str, str]:
    con = _connect()
    try:
        rows = con.execute("SELECT key, value FROM build_meta").fetchall()
    finally:
        con.close()
    return dict(rows)


@app.get("/api/health")
def health() -> JSONResponse:
    try:
        built_at = _meta("built_at")
    except HTTPException as exc:
        return JSONResponse(status_code=503, content={"status": "no_data", "detail": exc.detail})
    age_days = None
    stale = True
    if built_at:
        dt = datetime.fromisoformat(built_at)
        age_days = (datetime.now(UTC) - dt).days
        stale = age_days > STALE_AFTER_DAYS
    return JSONResponse(
        content={
            "status": "stale" if stale else "ok",
            "built_at": built_at,
            "age_days": age_days,
            "stale_after_days": STALE_AFTER_DAYS,
        }
    )


@app.get("/api/rankings/all")
def rankings_all() -> JSONResponse:
    """Full rankings payload for the SPA (same shape as the static snapshot)."""
    snapshot = paths.WEB_PUBLIC_DATA / "rankings.json"
    if not snapshot.exists():
        raise HTTPException(
            status_code=503, detail="Rankings snapshot not built. Run `make build`."
        )
    return JSONResponse(content=json.loads(snapshot.read_text(encoding="utf-8")))


@app.get("/api/manifest")
def manifest() -> dict:
    """Provenance record: every source URL, sha256, vintage and retrieval time.

    This is the same file the pipeline writes as ``data/manifest.json`` (rule
    R2), so the API and the committed artefact can never disagree.
    """
    if not paths.MANIFEST.exists():
        raise HTTPException(status_code=503, detail="Manifest not built. Run `make build`.")
    return json.loads(paths.MANIFEST.read_text(encoding="utf-8"))


@app.get("/api/meta")
def meta() -> dict:
    cfg = load_config()
    return {
        "meta": _all_meta(),
        "vintages": cfg.vintages.model_dump(),
        "lenses": {
            lid: {"label": lens.label, "description": lens.description, "default": lens.default}
            for lid, lens in cfg.lenses.items()
        },
        "subscores": {
            sid: {"label": s.label, "description": s.description}
            for sid, s in cfg.subscores.items()
        },
        "metrics": [
            {
                "id": m.id,
                "label": m.label,
                "subscore": m.subscore,
                "unit": m.unit,
                "direction": m.direction,
                "scored": m.scored,
                "modeled": m.modeled,
                "source": m.source,
                "vintage": m.vintage,
                "caveats": m.caveats,
            }
            for m in cfg.metrics
        ],
        "sources": {k: s.model_dump() for k, s in cfg.sources.items()},
        "rule_R7": cfg.rule_R7,
        "eligibility_min_60plus": cfg.params.eligibility_min_60plus,
    }


@app.get("/api/rankings")
def rankings(
    lens: str = Query("volume"),
    state: str | None = Query(None, description="Two-letter state code"),
    eligible_only: bool = Query(True),
    limit: int = Query(100, ge=1, le=3144),
    offset: int = Query(0, ge=0),
) -> dict:
    cfg = load_config()
    if lens not in cfg.lenses:
        raise HTTPException(status_code=400, detail=f"Unknown lens {lens!r}")
    where = ["s.lens = ?"]
    params: list = [lens]
    if eligible_only:
        where.append("s.eligible")
    if state:
        where.append("substr(s.fips, 1, 2) = ?")
        params.append(_state_to_fips(state))
    sql = f"""
        SELECT s.fips, c.ctyname AS name, c.stname AS state, c.total_pop, c.pop_60plus,
               s.total, s.p05, s.p50, s.p95, s.rank, s.eligible, s.coverage, s.partial,
               s.size, s.affordability, s.need, s.reachability, s.whitespace, s.insurability
        FROM scores s JOIN county c USING (fips)
        WHERE {" AND ".join(where)}
        ORDER BY s.total DESC
        LIMIT ? OFFSET ?
    """
    con = _connect()
    try:
        rows = con.execute(sql, params + [limit, offset]).fetchall()
        cols = [d[0] for d in con.description]
        count_row = con.execute(
            f"SELECT COUNT(*) FROM scores s WHERE {' AND '.join(where)}", params
        ).fetchone()
        total = int(count_row[0]) if count_row else 0
    finally:
        con.close()
    return {
        "lens": lens,
        "total": total,
        "limit": limit,
        "offset": offset,
        "results": [dict(zip(cols, r, strict=True)) for r in rows],
    }


@app.get("/api/county/{fips}")
def county(fips: str) -> dict:
    con = _connect()
    try:
        identity = con.execute("SELECT * FROM county WHERE fips = ?", [fips]).fetchone()
        if not identity:
            raise HTTPException(status_code=404, detail=f"No county {fips}")
        id_cols = [d[0] for d in con.description]
        scores_rows = con.execute(
            "SELECT * FROM scores WHERE fips = ? ORDER BY lens", [fips]
        ).fetchall()
        score_cols = [d[0] for d in con.description]
        contrib = con.execute(
            "SELECT lens, metric, contribution FROM contributions WHERE fips = ?", [fips]
        ).fetchall()
        metrics_row = None
        metric_cols: list[str] = []
        if "metrics" in _table_names(con):
            metrics_row = con.execute(
                "SELECT * FROM metrics WHERE fips = ?", [fips]
            ).fetchone()
            metric_cols = [d[0] for d in con.description]
    finally:
        con.close()
    return {
        "county": dict(zip(id_cols, identity, strict=False)),
        "scores": [dict(zip(score_cols, r, strict=True)) for r in scores_rows],
        "contributions": [
            {"lens": lens_id, "metric": m, "contribution": c} for lens_id, m, c in contrib
        ],
        "metrics": (
            dict(zip(metric_cols, metrics_row, strict=True)) if metrics_row else {}
        ),
    }


def _table_names(con) -> set[str]:
    return {row[0] for row in con.execute("SHOW TABLES").fetchall()}


@app.get("/api/states")
def states(lens: str = Query("volume")) -> dict:
    cfg = load_config()
    if lens not in cfg.lenses:
        raise HTTPException(status_code=400, detail=f"Unknown lens {lens!r}")
    con = _connect()
    try:
        rows = con.execute(
            """
            SELECT substr(s.fips, 1, 2) AS state_fips, c.stname AS state,
                   COUNT(*) AS counties,
                   SUM(c.pop_60plus) AS pop_60plus,
                   AVG(s.total) AS mean_score,
                   MAX(s.total) AS max_score
            FROM scores s JOIN county c USING (fips)
            WHERE s.lens = ? AND s.eligible
            GROUP BY 1, 2 ORDER BY mean_score DESC
            """,
            [lens],
        ).fetchall()
        cols = [d[0] for d in con.description]
    finally:
        con.close()
    return {"lens": lens, "results": [dict(zip(cols, r, strict=True)) for r in rows]}


@app.post("/api/admin/refresh")
def refresh(authorization: str = Header(default="")) -> dict:
    token = os.environ.get("INSURVAS_ADMIN_TOKEN", "")
    if not token:
        raise HTTPException(
            status_code=503, detail="Refresh disabled: INSURVAS_ADMIN_TOKEN not set"
        )
    if authorization != f"Bearer {token}":
        raise HTTPException(status_code=401, detail="Unauthorized")
    if not _build_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="A refresh is already running")
    try:
        from pipeline.build import build

        # The build writes data/manifest.json itself (rule R2). Writing an
        # empty manifest here would erase the provenance record.
        result = build()
        return {"status": "refreshed", "meta": result}
    finally:
        _build_lock.release()


_STATE_FIPS = {
    "AL": "01",
    "AK": "02",
    "AZ": "04",
    "AR": "05",
    "CA": "06",
    "CO": "08",
    "CT": "09",
    "DE": "10",
    "DC": "11",
    "FL": "12",
    "GA": "13",
    "HI": "15",
    "ID": "16",
    "IL": "17",
    "IN": "18",
    "IA": "19",
    "KS": "20",
    "KY": "21",
    "LA": "22",
    "ME": "23",
    "MD": "24",
    "MA": "25",
    "MI": "26",
    "MN": "27",
    "MS": "28",
    "MO": "29",
    "MT": "30",
    "NE": "31",
    "NV": "32",
    "NH": "33",
    "NJ": "34",
    "NM": "35",
    "NY": "36",
    "NC": "37",
    "ND": "38",
    "OH": "39",
    "OK": "40",
    "OR": "41",
    "PA": "42",
    "RI": "44",
    "SC": "45",
    "SD": "46",
    "TN": "47",
    "TX": "48",
    "UT": "49",
    "VT": "50",
    "VA": "51",
    "WA": "53",
    "WV": "54",
    "WI": "55",
    "WY": "56",
}


def _state_to_fips(code: str) -> str:
    code = code.upper()
    if code not in _STATE_FIPS:
        raise HTTPException(status_code=400, detail=f"Unknown state {code!r}")
    return _STATE_FIPS[code]


def _mount_spa() -> None:
    dist = Path(__file__).resolve().parent.parent / "web" / "dist"
    if not dist.exists():
        return

    app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        candidate = dist / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(dist / "index.html")


_mount_spa()
