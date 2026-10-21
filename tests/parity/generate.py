"""Generate the Python<->TypeScript scoring parity golden file.

Writes ``tests/parity/inputs.json`` (a small synthetic county matrix) and
``tests/parity/expected.json`` (score_matrix output for every lens). The
TypeScript port in ``web/src/score/score.ts`` is asserted against the same files
by ``web/src/score/parity.test.ts`` to <= 1e-9.

The synthetic matrix deliberately contains missing values - a whole missing
sub-score, a missing sub-score pair and scattered single holes - so the
partial-data path (NaN sub-score, renormalised total, coverage) is part of the
parity contract and not just the happy path.

Non-finite numbers are written as ``null`` so the golden files stay strict
JSON; the TypeScript test maps ``null`` back to ``NaN``.
"""

from __future__ import annotations

import json
import math

import numpy as np

from pipeline import paths
from pipeline.config import load_config
from pipeline.score.reference import score_matrix

OUT = paths.ROOT / "tests" / "parity"


def _synthetic(n: int = 40, seed: int = 7) -> dict[str, list[float]]:
    rng = np.random.default_rng(seed)
    cfg = load_config()
    data: dict[str, list[float]] = {}
    for m in cfg.scored_metrics:
        # Mix of scales so log/winsor paths are exercised.
        base = rng.lognormal(mean=6.0, sigma=1.2, size=n)
        if m.unit in ("share", "rate", "percent"):
            base = np.clip(base / np.max(base), 0.0, 1.0)
        # Inject ties at the extremes to exercise tie-breaking.
        base[0] = np.max(base)
        base[1] = np.max(base)
        base[-1] = np.min(base)
        base[-2] = np.min(base)
        data[m.id] = [float(x) for x in base]
    _inject_missing(data, cfg, n)
    return data


def _inject_missing(data: dict[str, list[float]], cfg, n: int) -> None:
    """Punch holes so the partial-data path is exercised by the parity test."""
    by_sub: dict[str, list[str]] = {}
    for m in cfg.scored_metrics:
        by_sub.setdefault(m.subscore, []).append(m.id)

    def drop(sub: str, row: int) -> None:
        for mid in by_sub.get(sub, []):
            data[mid][row] = math.nan

    # A county with no health context at all (e.g. outside the PLACES release).
    drop("insurability", 3)
    # A county missing two whole sub-scores.
    drop("affordability", 4)
    drop("reachability", 4)
    # A county missing a single metric inside an otherwise complete sub-score.
    data[by_sub["size"][0]][5] = math.nan
    # Scattered single holes across the remaining rows.
    rng = np.random.default_rng(11)
    for i in range(6, n):
        for m in cfg.scored_metrics:
            if rng.random() < 0.04:
                data[m.id][i] = math.nan


def _clean(values) -> list[float | None]:
    return [None if not math.isfinite(float(v)) else float(v) for v in values]


def generate() -> None:
    cfg = load_config()
    n = 40
    columns = _synthetic(n)
    fips = [f"{i:05d}" for i in range(n)]
    pop = [5000.0 + 1000.0 * i for i in range(n)]

    expected: dict[str, dict[str, list]] = {}
    for lens_id in cfg.lenses:
        res = score_matrix(
            fips=fips,
            columns={k: np.array(v) for k, v in columns.items()},
            cfg=cfg,
            lens_id=lens_id,
            eligibility_pop=np.array(pop),
        )
        expected[lens_id] = {
            "total": _clean(res.total),
            "subscores": {s: _clean(arr) for s, arr in res.subscores.items()},
            "contributions": {m: _clean(arr) for m, arr in res.contributions.items()},
            "eligibility": [bool(x) for x in res.eligibility],
            "coverage": _clean(res.coverage if res.coverage is not None else []),
            "partial": [bool(x) for x in (res.partial if res.partial is not None else [])],
        }

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "inputs.json").write_text(
        json.dumps(
            {
                "fips": fips,
                "columns": {k: _clean(v) for k, v in columns.items()},
                "pop": pop,
            },
            allow_nan=False,
        ),
        encoding="utf-8",
    )
    (OUT / "expected.json").write_text(
        json.dumps(
            {"lens_order": list(cfg.lenses.keys()), "expected": expected}, allow_nan=False
        ),
        encoding="utf-8",
    )
    _export_scoring_config(cfg)


def _export_scoring_config(cfg) -> None:
    """Emit the scoring-relevant slice of config/metrics.yaml for the TS port."""
    out = {
        "version": cfg.version,
        "params": {
            "winsor_lower": cfg.params.winsor_lower,
            "winsor_upper": cfg.params.winsor_upper,
            "eligibility_min_60plus": cfg.params.eligibility_min_60plus,
        },
        "default_lens": cfg.default_lens_id,
        "subscores": cfg.sub_score_ids(),
        "lenses": {
            lid: {
                "label": lens.label,
                "description": lens.description,
                "weights": lens.weights.as_dict(),
                "flip_insurance_sign": lens.flip_insurance_sign,
            }
            for lid, lens in cfg.lenses.items()
        },
        "metrics": [
            {
                "id": m.id,
                "subscore": m.subscore,
                "direction": m.direction,
                "transform": m.transform,
                "scored": m.scored,
                "lens_weights": m.lens_weights.model_dump(),
            }
            for m in cfg.metrics
        ],
    }
    target = paths.WEB / "src" / "score" / "config.generated.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(out, indent=2), encoding="utf-8")


if __name__ == "__main__":
    generate()
    print(f"wrote {OUT}/inputs.json and {OUT}/expected.json")
