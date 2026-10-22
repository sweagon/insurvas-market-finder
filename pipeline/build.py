"""Build the scored dataset and emit the serving artefacts.

Outputs
-------
* ``data/market.duckdb``  - queryable tables: ``county``, ``scores``,
  ``contributions``, ``build_meta``.
* ``web/public/data/rankings.json`` - compact payload for the SPA
  (per-county identity + per-lens score, band and rank).
* ``data/build.json`` - build metadata (vintages, config hash, row counts).

Run: ``uv run python -m pipeline.build`` or ``make build``.
"""

from __future__ import annotations

import hashlib
import json
import math
import time
from datetime import UTC, datetime
from typing import Any

import duckdb
import numpy as np
import polars as pl

from pipeline import paths
from pipeline.config import load_config
from pipeline.fetch.http import Manifest
from pipeline.score.monte_carlo import monte_carlo_total
from pipeline.score.reference import score_matrix
from pipeline.transform.geography import STATE_FIPS_TO_USPS
from pipeline.transform.metrics import build_metric_matrix

IDENTITY_COLS = [
    "fips",
    "stname",
    "stusps",
    "ctyname",
    "total_pop",
    "pop_60plus",
    "share_60plus",
    "growth_60plus",
]

FLAG_COLS = [
    "shrunk_agencies",
    "shrunk_chronic",
    "shrunk_risk",
    "imputed_ssa_share",
    "shrunk_ssa_share",
]


def _config_hash(cfg) -> str:
    raw = paths.METRICS_YAML.read_bytes()
    return hashlib.sha256(raw).hexdigest()[:16]


def _write_manifest(manifest: Manifest, cfg, meta: dict) -> None:
    """Write ``data/manifest.json`` - the record of every source in the build.

    Rule R2: every URL, sha256, retrieval time and vintage that entered the
    dataset must be recorded, and every ``source`` declared in the config must
    actually appear here. The build fails if a declared source was never
    fetched, so a config can never claim lineage the data does not have.
    """
    seen = {str(entry.get("source")) for entry in manifest.entries.values() if entry.get("source")}
    missing = sorted(set(cfg.sources) - seen)
    if missing:
        raise RuntimeError(
            "config declares sources that were never fetched, so their lineage "
            f"cannot be recorded: {missing}"
        )
    manifest.write(
        paths.MANIFEST,
        extra={
            "build": {
                "built_at": meta["built_at"],
                "config_version": meta["config_version"],
                "config_hash": meta["config_hash"],
                "counties": meta["counties"],
                "eligible": meta["eligible"],
            },
            "config_sources": {
                sid: {
                    "name": src.name,
                    "url": src.url,
                    "license": src.license,
                    "attribution": src.attribution,
                }
                for sid, src in cfg.sources.items()
            },
            "metric_sources": {
                m.id: {
                    "source": m.source,
                    "table_field": m.table_field,
                    "vintage": m.vintage,
                    "scored": m.scored,
                    "modeled": m.modeled,
                }
                for m in cfg.metrics
            },
        },
    )


def _num(value, nd: int = 2) -> float | None:
    """JSON-safe number. JSON has no NaN or Infinity, so they become null."""
    f = float(value)
    if not math.isfinite(f):
        return None
    return round(f, nd)


def _identity(df: pl.DataFrame) -> pl.DataFrame:
    keep = [c for c in IDENTITY_COLS if c in df.columns]
    return df.select(keep)


def _columnar(
    cfg,
    df: pl.DataFrame,
    identity: pl.DataFrame,
    meta: dict,
    lens_scores: dict[str, pl.DataFrame] | None = None,
) -> dict:
    """Columnar serving artefact (design contract §1: counties.json).

    One array per field, all the same length, so the SPA can load the whole
    metric matrix once and hand it to the scoring worker. Numbers are rounded
    to keep the payload small; nulls mean "not available for this area" and are
    rendered as the partial-data state, never faked.
    """
    rows = df.height
    metric_ids = [m.id for m in cfg.metrics]
    cols: dict[str, list] = {
        "fips": identity["fips"].to_list(),
        "name": identity["ctyname"].to_list(),
        "state": identity["stusps"].to_list(),
        "state_name": identity["stname"].to_list(),
    }

    def _num(series: pl.Series, nd: int) -> list:
        return [(None if v is None else round(float(v), nd)) for v in series.to_list()]

    for key in ("total_pop", "pop_60plus"):
        cols[key] = _num(df[key], 0) if key in df.columns else [None] * rows
    for key, nd in (("share_60plus", 5), ("growth_60plus", 5)):
        cols[key] = _num(df[key], nd) if key in df.columns else [None] * rows

    # Every metric in the catalogue (scored and context), nullable.
    for mid in metric_ids:
        cols[mid] = _num(df[mid], 5) if mid in df.columns else [None] * rows

    for flag in FLAG_COLS:
        if flag in df.columns:
            cols[flag] = [bool(v) if v is not None else False for v in df[flag].to_list()]

    # Data coverage: the worst share of sub-score weight that was available
    # for each county under any lens, and whether any lens was incomplete.
    if lens_scores:
        coverage = [1.0] * rows
        partial = [False] * rows
        for frame in lens_scores.values():
            cov = frame["coverage"].to_list()
            prt = frame["partial"].to_list()
            for i in range(rows):
                coverage[i] = min(coverage[i], float(cov[i]))
                partial[i] = partial[i] or bool(prt[i])
        cols["coverage"] = [round(c, 4) for c in coverage]
        cols["partial"] = partial

    # Score inputs come from the same config as the reference scorer, so the
    # worker and the pipeline can never drift (parity test guards this).
    return {
        "meta": meta,
        "length": rows,
        "columns": cols,
    }


def _states(cfg, identity: pl.DataFrame, lens_scores: dict[str, pl.DataFrame]) -> dict:
    """Per-state aggregates so the map's state view needs no client-side work."""
    fips = identity["fips"].to_list()
    state_of = [f[:2] for f in fips]
    pos = {f: i for i, f in enumerate(fips)}
    groups: dict[str, dict] = {}
    for i, f in enumerate(fips):
        sf = state_of[i]
        g = groups.setdefault(
            sf,
            {
                "state_fips": sf,
                "name": identity["stname"][i],
                "abbr": identity["stusps"][i],
                "counties": 0,
                "pop60": 0,
                "fips": [],
            },
        )
        g["counties"] += 1
        g["pop60"] += int(identity["pop_60plus"][i])
        g["fips"].append(f)

    for g in groups.values():
        idx = [pos[f] for f in g["fips"]]
        g.pop("fips")
        for lid, frame in lens_scores.items():
            totals = frame["total"]
            elig = frame["eligible"]
            vals = [totals[j] for j in idx if elig[j]]
            g[f"eligible_{lid}"] = len(vals)
            g[f"mean_score_{lid}"] = round(sum(vals) / len(vals), 2) if vals else None

    return {"states": sorted(groups.values(), key=lambda x: x["state_fips"])}


def _metric_catalog(cfg) -> list[dict]:
    """Everything the UI needs to label, format and trace a metric."""
    return [
        {
            "id": m.id,
            "label": m.label,
            "description": m.description,
            "subscore": m.subscore,
            "source": m.source,
            "table_field": m.table_field,
            "vintage": m.vintage,
            "unit": m.unit,
            "direction": m.direction,
            "transform": m.transform,
            "moe": m.moe,
            "scored": m.scored,
            "modeled": m.modeled,
            "caveats": m.caveats,
        }
        for m in cfg.metrics
    ]


def build(*, mc_draws: int | None = None) -> dict:
    started = time.time()
    cfg = load_config()
    manifest = Manifest()
    paths.ensure_dirs()

    df = build_metric_matrix(manifest, cfg)
    df = df.with_columns(
        stusps=pl.col("state").replace_strict(
            STATE_FIPS_TO_USPS, default=None, return_dtype=pl.Utf8
        )
    )
    fips = df["fips"].to_list()
    pop = df["pop_60plus"].to_numpy()
    columns = {m.id: df[m.id].to_numpy().astype(float) for m in cfg.scored_metrics}
    # Published margins of error, where the source publishes one. A metric
    # without an entry here has no published MOE and falls back to the
    # documented coefficient of variation.
    moes = {
        m.id: df[f"{m.id}_moe"].to_numpy().astype(float)
        for m in cfg.scored_metrics
        if f"{m.id}_moe" in df.columns
    }

    identity = _identity(df)

    score_rows: list[dict] = []
    contrib_rows: list[dict] = []
    lens_scores: dict[str, pl.DataFrame] = {}

    for lens_id in cfg.lenses:
        res = score_matrix(
            fips=fips, columns=columns, cfg=cfg, lens_id=lens_id, eligibility_pop=pop
        )
        # Full uncertainty budget for the default (headline) lens; cheaper bands
        # for the secondary lenses keep the build under a couple of minutes.
        lens_draws = mc_draws or (
            cfg.params.monte_carlo_draws
            if lens_id == cfg.default_lens_id
            else max(75, cfg.params.monte_carlo_draws // 5)
        )
        band = monte_carlo_total(
            fips=fips,
            columns=columns,
            cfg=cfg,
            lens_id=lens_id,
            eligibility_pop=pop,
            moes=moes,
            draws=lens_draws,
        )
        total = res.total
        # Rank 1 = best, only among eligible counties with a computable score.
        rank = _ranks(total, res.eligibility)
        sub: dict[str, Any] = {
            "fips": fips,
            "total": total,
            "p05": band["p05"],
            "p50": band["p50"],
            "p95": band["p95"],
            "rank": rank,
            "eligible": res.eligibility,
            "coverage": res.coverage if res.coverage is not None else np.ones(len(fips)),
            "partial": res.partial if res.partial is not None else np.zeros(len(fips), bool),
            "rank_p05": band["rank_p05"],
            "rank_p50": band["rank_p50"],
            "rank_p95": band["rank_p95"],
            "p_top50": band["p_top50"],
        }
        for s in cfg.sub_score_ids():
            sub[f"sub_{s}"] = res.subscores[s]
        lens_scores[lens_id] = pl.DataFrame(sub)

        for i, f in enumerate(fips):
            score_rows.append(
                {
                    "lens": lens_id,
                    "fips": f,
                    "total": _num(total[i], 4),
                    "p05": _num(band["p05"][i], 4),
                    "p50": _num(band["p50"][i], 4),
                    "p95": _num(band["p95"][i], 4),
                    "rank": rank[i] if res.eligibility[i] and rank[i] is not None else None,
                    "rank_p05": _num(band["rank_p05"][i], 1),
                    "rank_p50": _num(band["rank_p50"][i], 1),
                    "rank_p95": _num(band["rank_p95"][i], 1),
                    "p_top50": _num(band["p_top50"][i], 4),
                    "eligible": bool(res.eligibility[i]),
                    "coverage": _num(sub["coverage"][i], 6),
                    "partial": bool(sub["partial"][i]),
                    **{s: _num(res.subscores[s][i], 6) for s in cfg.sub_score_ids()},
                }
            )
        for mid, arr in res.contributions.items():
            for i, f in enumerate(fips):
                contrib_rows.append(
                    {"lens": lens_id, "fips": f, "metric": mid, "contribution": _num(arr[i], 8)}
                )

    scores_df = pl.DataFrame(score_rows)
    contrib_df = pl.DataFrame(contrib_rows)

    partial_by_lens = {lid: int(frame["partial"].sum()) for lid, frame in lens_scores.items()}
    min_coverage = min(
        (float(np.min(frame["coverage"].to_numpy())) for frame in lens_scores.values()),
        default=1.0,
    )

    meta = {
        "built_at": datetime.now(UTC).isoformat(),
        "config_version": cfg.version,
        "config_hash": _config_hash(cfg),
        "vintages": cfg.vintages.model_dump(),
        "counties": df.height,
        "eligible": int((pop >= cfg.params.eligibility_min_60plus).sum()),
        "lenses": list(cfg.lenses.keys()),
        "mc_draws": mc_draws or cfg.params.monte_carlo_draws,
        "eligibility_min_60plus": cfg.params.eligibility_min_60plus,
        "target_age_min": cfg.params.target_age_min,
        "partial_counties": partial_by_lens,
        "min_coverage": round(min_coverage, 4),
        "duration_s": round(time.time() - started, 1),
    }

    _write_duckdb(identity, scores_df, contrib_df, meta, metrics_df=_metrics_frame(cfg, df))
    _write_rankings_json(cfg, identity, lens_scores, meta)
    _write_columnar_json(cfg, df, identity, lens_scores, meta)
    _write_manifest(manifest, cfg, meta)
    paths.BUILD_META.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return meta


def _metrics_frame(cfg, df: pl.DataFrame) -> pl.DataFrame:
    """The full metric matrix as a flat table: one row per county, one column
    per metric (plus the shrink flags). This is what makes the dataset
    queryable - the API and any analyst can ask for the raw inputs behind a
    score instead of only the score itself.
    """
    cols = ["fips"]
    cols += [m.id for m in cfg.metrics if m.id in df.columns]
    cols += [c for c in FLAG_COLS if c in df.columns]
    keep = [c for c in cols if c in df.columns]
    return df.select(keep).unique(subset=["fips"], keep="first")


def _ranks(total, eligible) -> list[int | None]:
    out: list[int | None] = [None] * len(total)
    idx = np.where(eligible)[0]
    # A county whose score could not be computed is not ranked.
    idx = idx[np.isfinite(total[idx])]
    order = idx[np.argsort(-total[idx])]
    for r, i in enumerate(order, start=1):
        out[int(i)] = r
    return out


def _write_duckdb(
    identity: pl.DataFrame,
    scores: pl.DataFrame,
    contrib: pl.DataFrame,
    meta: dict,
    metrics_df: pl.DataFrame | None = None,
) -> None:
    tmp = paths.PROCESSED / "duckdb_tmp"
    tmp.mkdir(parents=True, exist_ok=True)
    identity.write_parquet(tmp / "county.parquet")
    scores.write_parquet(tmp / "scores.parquet")
    contrib.write_parquet(tmp / "contributions.parquet")
    meta_rows = [
        {"key": k, "value": json.dumps(v) if isinstance(v, (dict, list)) else str(v)}
        for k, v in meta.items()
    ]
    pl.DataFrame(meta_rows).write_parquet(tmp / "build_meta.parquet")

    tables = ["county", "scores", "contributions", "build_meta"]
    if metrics_df is not None:
        metrics_df.write_parquet(tmp / "metrics.parquet")
        tables.append("metrics")

    con = duckdb.connect(str(paths.DB))
    try:
        for name in tables:
            src = tmp / f"{name}.parquet"
            con.execute(f"CREATE OR REPLACE TABLE {name} AS SELECT * FROM read_parquet('{src}')")
    finally:
        con.close()


def _write_rankings_json(
    cfg, identity: pl.DataFrame, lens_scores: dict[str, pl.DataFrame], meta: dict
) -> None:
    records = []
    lens_frames = dict(lens_scores)
    for i in range(identity.height):
        fips = identity["fips"][i]
        rec = {
            "fips": fips,
            "name": identity["ctyname"][i],
            "state": identity["stname"][i],
            "pop60": int(identity["pop_60plus"][i]),
            "scores": {},
        }
        for lid, frame in lens_frames.items():
            rec["scores"][lid] = {
                "total": _num(frame["total"][i], 2),
                "p05": _num(frame["p05"][i], 1),
                "p50": _num(frame["p50"][i], 1),
                "p95": _num(frame["p95"][i], 1),
                "rank": (int(frame["rank"][i]) if frame["rank"][i] is not None else None),
                "rank_p05": _num(frame["rank_p05"][i], 1),
                "rank_p50": _num(frame["rank_p50"][i], 1),
                "rank_p95": _num(frame["rank_p95"][i], 1),
                "p_top50": _num(frame["p_top50"][i], 4),
                "eligible": bool(frame["eligible"][i]),
                "coverage": _num(frame["coverage"][i], 4),
                "partial": bool(frame["partial"][i]),
                "sub": {s: _num(frame[f"sub_{s}"][i], 3) for s in cfg.sub_score_ids()},
            }
        records.append(rec)
    payload = {
        "meta": meta,
        "lenses": {
            lid: {"label": lens.label, "description": lens.description}
            for lid, lens in cfg.lenses.items()
        },
        "counties": records,
    }
    paths.WEB_PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
    (paths.WEB_PUBLIC_DATA / "rankings.json").write_text(
        json.dumps(payload, separators=(",", ":")), encoding="utf-8"
    )


def _write_columnar_json(
    cfg,
    df: pl.DataFrame,
    identity: pl.DataFrame,
    lens_scores: dict[str, pl.DataFrame],
    meta: dict,
) -> None:
    """Emit the columnar data contract: counties.json, states.json, meta.json.

    The scoring stays in the pipeline (and is mirrored 1:1 in the browser
    worker); the UI reads these files and never hard-codes a number.
    """
    out = paths.WEB_PUBLIC_DATA
    out.mkdir(parents=True, exist_ok=True)

    counties = _columnar(cfg, df, identity, meta, lens_scores)
    (out / "counties.json").write_text(
        json.dumps(counties, separators=(",", ":")), encoding="utf-8"
    )

    (out / "states.json").write_text(
        json.dumps(_states(cfg, _identity(df), lens_scores), separators=(",", ":")),
        encoding="utf-8",
    )

    catalog = {
        "meta": meta,
        "vintages": cfg.vintages.model_dump(),
        "params": cfg.params.model_dump(),
        "default_lens": cfg.default_lens_id,
        "subscore_order": cfg.sub_score_ids(),
        "lens_order": cfg.lens_ids(),
        "flags": [f for f in FLAG_COLS if f in counties["columns"]],
        "units": sorted({m.unit for m in cfg.metrics}),
        "subscores": {
            sid: {"label": s.label, "description": s.description}
            for sid, s in cfg.subscores.items()
        },
        "lenses": {
            lid: {
                "label": lens.label,
                "description": lens.description,
                "default": lens.default,
                "weights": dict(lens.weights),
            }
            for lid, lens in cfg.lenses.items()
        },
        "metrics": _metric_catalog(cfg),
        "sources": {sid: src.model_dump() for sid, src in cfg.sources.items()},
        "rule_R7": cfg.rule_R7,
    }
    (out / "meta.json").write_text(json.dumps(catalog, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    m = build()
    print(json.dumps(m, indent=2))
