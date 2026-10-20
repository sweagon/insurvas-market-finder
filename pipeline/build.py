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
import time
from datetime import UTC, datetime

import duckdb
import polars as pl

from pipeline import paths
from pipeline.config import load_config
from pipeline.fetch.http import Manifest
from pipeline.score.monte_carlo import monte_carlo_total
from pipeline.score.reference import score_matrix
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


def _config_hash(cfg) -> str:
    raw = paths.METRICS_YAML.read_bytes()
    return hashlib.sha256(raw).hexdigest()[:16]


def _identity(df: pl.DataFrame) -> pl.DataFrame:
    keep = [c for c in IDENTITY_COLS if c in df.columns]
    return df.select(keep)


def build(*, mc_draws: int | None = None) -> dict:
    started = time.time()
    cfg = load_config()
    manifest = Manifest()

    df = build_metric_matrix(manifest)
    fips = df["fips"].to_list()
    pop = df["pop_60plus"].to_numpy()
    columns = {m.id: df[m.id].to_numpy().astype(float) for m in cfg.scored_metrics}

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
            draws=lens_draws,
        )
        total = res.total
        # Rank 1 = best, only among eligible counties.
        rank = _ranks(total, res.eligibility)
        sub = {
            "fips": fips,
            "total": total,
            "p05": band["p05"],
            "p50": band["p50"],
            "p95": band["p95"],
            "rank": rank,
            "eligible": res.eligibility,
        }
        for s in cfg.sub_score_ids():
            sub[f"sub_{s}"] = res.subscores[s]
        lens_scores[lens_id] = pl.DataFrame(sub)

        for i, f in enumerate(fips):
            score_rows.append(
                {
                    "lens": lens_id,
                    "fips": f,
                    "total": float(total[i]),
                    "p05": float(band["p05"][i]),
                    "p50": float(band["p50"][i]),
                    "p95": float(band["p95"][i]),
                    "rank": rank[i] if res.eligibility[i] and rank[i] is not None else None,
                    "eligible": bool(res.eligibility[i]),
                    **{s: float(res.subscores[s][i]) for s in cfg.sub_score_ids()},
                }
            )
        for mid, arr in res.contributions.items():
            for i, f in enumerate(fips):
                contrib_rows.append(
                    {"lens": lens_id, "fips": f, "metric": mid, "contribution": float(arr[i])}
                )

    scores_df = pl.DataFrame(score_rows)
    contrib_df = pl.DataFrame(contrib_rows)

    meta = {
        "built_at": datetime.now(UTC).isoformat(),
        "config_version": cfg.version,
        "config_hash": _config_hash(cfg),
        "vintages": cfg.vintages.model_dump(),
        "counties": df.height,
        "eligible": int((pop >= cfg.params.eligibility_min_60plus).sum()),
        "lenses": list(cfg.lenses.keys()),
        "mc_draws": mc_draws or cfg.params.monte_carlo_draws,
        "duration_s": round(time.time() - started, 1),
    }

    _write_duckdb(identity, scores_df, contrib_df, meta)
    _write_rankings_json(cfg, identity, lens_scores, meta)
    paths.BUILD_META.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return meta


def _ranks(total, eligible) -> list[int | None]:
    import numpy as np

    out: list[int | None] = [None] * len(total)
    idx = np.where(eligible)[0]
    order = idx[np.argsort(-total[idx])]
    for r, i in enumerate(order, start=1):
        out[int(i)] = r
    return out


def _write_duckdb(
    identity: pl.DataFrame, scores: pl.DataFrame, contrib: pl.DataFrame, meta: dict
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

    con = duckdb.connect(str(paths.DB))
    try:
        for name in ("county", "scores", "contributions", "build_meta"):
            src = tmp / f"{name}.parquet"
            con.execute(
                f"CREATE OR REPLACE TABLE {name} AS SELECT * FROM read_parquet('{src}')"
            )
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
                "total": round(float(frame["total"][i]), 2),
                "p05": round(float(frame["p05"][i]), 1),
                "p95": round(float(frame["p95"][i]), 1),
                "rank": (int(frame["rank"][i]) if frame["rank"][i] is not None else None),
                "eligible": bool(frame["eligible"][i]),
                "sub": {s: round(float(frame[f"sub_{s}"][i]), 3) for s in cfg.sub_score_ids()},
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


if __name__ == "__main__":
    m = build()
    print(json.dumps(m, indent=2))
